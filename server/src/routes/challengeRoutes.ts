import { Router, Response } from 'express';
import { db } from '../db';
import { authenticateToken, AuthRequest } from './authRoutes';

export const challengeRouter = Router();

// Helper to generate 6-character random alphanumeric invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// POST /api/challenges (Create a challenge)
challengeRouter.post('/', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const {
      title,
      description,
      targetSteps,
      maxPlayers = 10,
      visibility = 'public',
      rewardPoolCoins = 100,
    } = req.body;

    if (!title || !targetSteps || Number(targetSteps) <= 0) {
      res.status(400).json({ error: 'Title and valid target steps are required' });
      return;
    }

    const challengeId = `ch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const inviteCode = generateInviteCode();
    const now = Date.now();
    const creatorId = req.user!.id;
    const creatorUsername = req.user!.username;

    db.prepare(`
      INSERT INTO challenges (id, creatorId, title, description, targetSteps, maxPlayers, visibility, status, inviteCode, rewardPoolCoins, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting', ?, ?, ?)
    `).run(
      challengeId,
      creatorId,
      title.trim(),
      description ? description.trim() : null,
      Number(targetSteps),
      Number(maxPlayers),
      visibility === 'private' ? 'private' : 'public',
      inviteCode,
      Number(rewardPoolCoins),
      now
    );

    // Creator automatically joins the challenge
    const participantId = `cp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO challenge_participants (id, challengeId, userId, username, currentSteps, status, joinedAt)
      VALUES (?, ?, ?, ?, 0, 'joined', ?)
    `).run(participantId, challengeId, creatorId, creatorUsername, now);

    const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(challengeId) as any;
    const participants = db.prepare('SELECT * FROM challenge_participants WHERE challengeId = ?').all(challengeId);

    res.json({
      challenge,
      participants,
    });
  } catch (error) {
    console.error('Create challenge error:', error);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

// GET /api/challenges/public (List public waiting and active challenges)
challengeRouter.get('/public', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const challenges = db.prepare(`
      SELECT 
        c.*, 
        (SELECT COUNT(*) FROM challenge_participants WHERE challengeId = c.id) as joinedPlayersCount,
        u.username as creatorUsername
      FROM challenges c
      JOIN users u ON c.creatorId = u.id
      WHERE c.visibility = 'public' AND (c.status = 'waiting' OR c.status = 'active')
      ORDER BY c.createdAt DESC
      LIMIT 30
    `).all();

    res.json({ challenges });
  } catch (error) {
    console.error('Public challenges error:', error);
    res.status(500).json({ error: 'Failed to fetch public challenges' });
  }
});

// GET /api/challenges/user (List challenges current user has joined)
challengeRouter.get('/user/active', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const challenges = db.prepare(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM challenge_participants WHERE challengeId = c.id) as joinedPlayersCount,
        cp.currentSteps as userCurrentSteps,
        cp.status as userStatus
      FROM challenges c
      JOIN challenge_participants cp ON c.id = cp.challengeId
      WHERE cp.userId = ?
      ORDER BY c.createdAt DESC
      LIMIT 20
    `).all(req.user!.id);

    res.json({ challenges });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user challenges' });
  }
});

// GET /api/challenges/:id (Get challenge lobby & participants)
challengeRouter.get('/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const targetParam = String(req.params.id);
    const challenge = db.prepare(`
      SELECT c.*, u.username as creatorUsername 
      FROM challenges c
      JOIN users u ON c.creatorId = u.id
      WHERE c.id = ? OR c.inviteCode = ?
    `).get(targetParam, targetParam) as any;

    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    const participants = db.prepare(`
      SELECT cp.*, u.avatarUrl 
      FROM challenge_participants cp
      JOIN users u ON cp.userId = u.id
      WHERE cp.challengeId = ?
      ORDER BY cp.currentSteps DESC, cp.joinedAt ASC
    `).all(challenge.id);

    const photos = db.prepare(`
      SELECT * FROM challenge_photos WHERE challengeId = ? ORDER BY uploadedAt ASC
    `).all(challenge.id);

    res.json({
      challenge,
      participants,
      photos,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch challenge details' });
  }
});

// POST /api/challenges/join (Join by inviteCode or challengeId)
challengeRouter.post('/join', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const { codeOrId } = req.body;
    if (!codeOrId) {
      res.status(400).json({ error: 'Invite code or Challenge ID is required' });
      return;
    }

    const cleanCode = codeOrId.trim().toUpperCase();
    const challenge = db.prepare(`
      SELECT * FROM challenges 
      WHERE inviteCode = ? OR id = ?
    `).get(cleanCode, codeOrId.trim()) as any;

    if (!challenge) {
      res.status(404).json({ error: 'No challenge found with this invite code.' });
      return;
    }

    if (challenge.status === 'completed') {
      res.status(400).json({ error: 'This challenge has already completed.' });
      return;
    }

    // Check player count
    const participantCount = (db.prepare('SELECT COUNT(*) as count FROM challenge_participants WHERE challengeId = ?').get(challenge.id) as any).count;
    if (participantCount >= challenge.maxPlayers) {
      res.status(400).json({ error: 'This challenge lobby is already full.' });
      return;
    }

    // Check if already joined
    const existing = db.prepare('SELECT id FROM challenge_participants WHERE challengeId = ? AND userId = ?').get(challenge.id, req.user!.id) as any;
    if (existing) {
      res.json({
        message: 'Already joined',
        challengeId: challenge.id,
      });
      return;
    }

    const participantId = `cp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = Date.now();

    db.prepare(`
      INSERT INTO challenge_participants (id, challengeId, userId, username, currentSteps, status, joinedAt)
      VALUES (?, ?, ?, ?, 0, 'joined', ?)
    `).run(participantId, challenge.id, req.user!.id, req.user!.username, now);

    res.json({
      message: 'Successfully joined challenge',
      challengeId: challenge.id,
    });
  } catch (error) {
    console.error('Join challenge error:', error);
    res.status(500).json({ error: 'Failed to join challenge' });
  }
});

// POST /api/challenges/:id/invite (Invite user by username or userId)
challengeRouter.post('/:id/invite', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const challengeId = String(req.params.id);
    const { targetUsernameOrId } = req.body;
    if (!targetUsernameOrId) {
      res.status(400).json({ error: 'Username or User ID is required' });
      return;
    }

    const targetUser = db.prepare(`
      SELECT id, username FROM users 
      WHERE username = ? OR id = ?
    `).get(targetUsernameOrId.trim().toLowerCase(), targetUsernameOrId.trim()) as any;

    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(challengeId) as any;
    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    // Check if already joined
    const existing = db.prepare('SELECT id FROM challenge_participants WHERE challengeId = ? AND userId = ?').get(challenge.id, targetUser.id) as any;
    if (existing) {
      res.status(400).json({ error: `${targetUser.username} has already joined this challenge.` });
      return;
    }

    // Automatically add user to lobby upon invite
    const participantId = `cp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO challenge_participants (id, challengeId, userId, username, currentSteps, status, joinedAt)
      VALUES (?, ?, ?, ?, 0, 'joined', ?)
    `).run(participantId, challenge.id, targetUser.id, targetUser.username, Date.now());

    res.json({
      message: `Invitation sent to ${targetUser.username}!`,
      invitedUser: targetUser,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to invite user' });
  }
});

// POST /api/challenges/:id/photo (Upload post-race celebration photo)
challengeRouter.post('/:id/photo', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const challengeId = String(req.params.id);
    const { photoBase64, caption } = req.body;
    if (!photoBase64) {
      res.status(400).json({ error: 'Photo is required' });
      return;
    }

    const photoId = `ph_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = Date.now();

    db.prepare(`
      INSERT INTO challenge_photos (id, challengeId, userId, username, photoBase64, caption, uploadedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      photoId,
      challengeId,
      req.user!.id,
      req.user!.username,
      photoBase64,
      caption || '',
      now
    );

    const photos = db.prepare('SELECT * FROM challenge_photos WHERE challengeId = ? ORDER BY uploadedAt ASC').all(challengeId);

    res.json({
      message: 'Photo uploaded successfully',
      photos,
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// POST /api/challenges/:id/cancel (Cancel challenge by host/leader)
challengeRouter.post('/:id/cancel', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const challengeId = String(req.params.id);
    const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(challengeId) as any;

    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    if (challenge.creatorId !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only the challenge leader can cancel this challenge.' });
      return;
    }

    db.prepare("UPDATE challenges SET status = 'cancelled' WHERE id = ?").run(challengeId);
    db.prepare("UPDATE challenge_participants SET status = 'cancelled' WHERE challengeId = ?").run(challengeId);

    res.json({
      message: 'Challenge has been cancelled successfully',
      challengeId,
    });
  } catch (error) {
    console.error('Cancel challenge error:', error);
    res.status(500).json({ error: 'Failed to cancel challenge' });
  }
});
