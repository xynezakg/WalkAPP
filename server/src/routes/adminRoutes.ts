import { Router, Response, NextFunction } from 'express';
import { db } from '../db';
import { authenticateToken, AuthRequest } from './authRoutes';

export const adminRouter = Router();

// Middleware: Require Admin role
function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Access denied: Administrator privileges required' });
    return;
  }
  next();
}

adminRouter.use(authenticateToken);
adminRouter.use(requireAdmin);

// GET /api/admin/stats (Platform KPIs)
adminRouter.get('/stats', (req: AuthRequest, res: Response): void => {
  try {
    const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
    const activeChallenges = (db.prepare("SELECT COUNT(*) as count FROM challenges WHERE status = 'active' OR status = 'waiting'").get() as any).count;
    const completedChallenges = (db.prepare("SELECT COUNT(*) as count FROM challenges WHERE status = 'completed'").get() as any).count;
    const totalCoins = (db.prepare('SELECT COALESCE(SUM(coinsBalance), 0) as total FROM users').get() as any).total;
    const totalPhotos = (db.prepare('SELECT COUNT(*) as count FROM challenge_photos').get() as any).count;

    res.json({
      stats: {
        totalUsers,
        activeChallenges,
        completedChallenges,
        totalCoinsInCirculation: totalCoins,
        totalPhotosUploaded: totalPhotos,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch platform statistics' });
  }
});

// GET /api/admin/users (User Management List)
adminRouter.get('/users', (req: AuthRequest, res: Response): void => {
  try {
    const users = db.prepare(`
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.role, 
        u.coinsBalance, 
        u.isBanned, 
        u.createdAt,
        (SELECT COUNT(*) FROM challenge_participants WHERE userId = u.id) as challengesJoinedCount
      FROM users u
      ORDER BY u.createdAt DESC
    `).all();

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user list' });
  }
});

// POST /api/admin/users/:id/toggle-ban
adminRouter.post('/users/:id/toggle-ban', (req: AuthRequest, res: Response): void => {
  try {
    const targetId = String(req.params.id);
    const user = db.prepare('SELECT id, username, isBanned, role FROM users WHERE id = ?').get(targetId) as any;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.role === 'admin') {
      res.status(400).json({ error: 'Cannot ban an administrator account' });
      return;
    }

    const newBanState = user.isBanned ? 0 : 1;
    db.prepare('UPDATE users SET isBanned = ? WHERE id = ?').run(newBanState, user.id);

    res.json({
      message: `User ${user.username} is now ${newBanState ? 'banned' : 'active'}.`,
      isBanned: Boolean(newBanState),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle ban status' });
  }
});

// POST /api/admin/users/:id/adjust-coins
adminRouter.post('/users/:id/adjust-coins', (req: AuthRequest, res: Response): void => {
  try {
    const targetId = String(req.params.id);
    const { amount, reason = 'Admin Adjustment' } = req.body;
    const user = db.prepare('SELECT id, username, coinsBalance FROM users WHERE id = ?').get(targetId) as any;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const newBalance = Math.max(0, user.coinsBalance + Number(amount));
    db.prepare('UPDATE users SET coinsBalance = ? WHERE id = ?').run(newBalance, user.id);

    db.prepare(`
      INSERT INTO coin_transactions (id, userId, amount, reason, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(`tx_${Date.now()}`, user.id, Number(amount), reason, Date.now());

    res.json({
      message: `Updated coins for ${user.username}`,
      newBalance,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to adjust coins' });
  }
});

// GET /api/admin/challenges
adminRouter.get('/challenges', (req: AuthRequest, res: Response): void => {
  try {
    const challenges = db.prepare(`
      SELECT 
        c.*, 
        u.username as creatorUsername,
        (SELECT COUNT(*) FROM challenge_participants WHERE challengeId = c.id) as participantCount
      FROM challenges c
      JOIN users u ON c.creatorId = u.id
      ORDER BY c.createdAt DESC
    `).all();

    res.json({ challenges });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

// DELETE /api/admin/challenges/:id (Cancel/Delete Challenge)
adminRouter.delete('/challenges/:id', (req: AuthRequest, res: Response): void => {
  try {
    const challengeId = String(req.params.id);
    db.prepare('DELETE FROM challenge_participants WHERE challengeId = ?').run(challengeId);
    db.prepare('DELETE FROM challenge_photos WHERE challengeId = ?').run(challengeId);
    db.prepare('DELETE FROM challenges WHERE id = ?').run(challengeId);

    res.json({ message: 'Challenge deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete challenge' });
  }
});
