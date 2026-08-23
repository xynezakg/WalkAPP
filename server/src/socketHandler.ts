import { Server, Socket } from 'socket.io';
import { db } from './db';

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join Challenge Lobby or Live Race Room
    socket.on('join_challenge', ({ challengeId, userId, username }) => {
      const roomName = `challenge:${challengeId}`;
      socket.join(roomName);
      console.log(`[Socket] ${username} (${userId}) joined room ${roomName}`);

      // Broadcast current participant list to room
      const participants = db.prepare(`
        SELECT cp.*, u.avatarUrl 
        FROM challenge_participants cp
        JOIN users u ON cp.userId = u.id
        WHERE cp.challengeId = ?
        ORDER BY cp.currentSteps DESC, cp.joinedAt ASC
      `).all(challengeId);

      const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(challengeId) as any;

      io.to(roomName).emit('participants_update', {
        challenge,
        participants,
      });
    });

    // Host starts countdown
    socket.on('start_challenge', ({ challengeId, userId }) => {
      const roomName = `challenge:${challengeId}`;
      const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(challengeId) as any;

      if (!challenge) return;
      if (challenge.creatorId !== userId) {
        socket.emit('error_message', 'Only the challenge host can start the race.');
        return;
      }

      // Update challenge state in DB
      const startTime = Date.now() + 3500; // 3.5s countdown buffer
      db.prepare("UPDATE challenges SET status = 'active', startTime = ? WHERE id = ?").run(startTime, challengeId);
      db.prepare("UPDATE challenge_participants SET status = 'racing', currentSteps = 0 WHERE challengeId = ?").run(challengeId);

      io.to(roomName).emit('challenge_starting', {
        startTime,
        countdownSeconds: 3,
      });
    });

    // Participant sends real-time step increments
    socket.on('step_update', ({ challengeId, userId, currentSteps }) => {
      const roomName = `challenge:${challengeId}`;
      const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(challengeId) as any;
      if (!challenge || challenge.status !== 'active') return;

      const participant = db.prepare('SELECT * FROM challenge_participants WHERE challengeId = ? AND userId = ?').get(challengeId, userId) as any;
      if (!participant) return;

      // Update step count in DB
      db.prepare('UPDATE challenge_participants SET currentSteps = ? WHERE challengeId = ? AND userId = ?').run(Number(currentSteps), challengeId, userId);

      // Check if participant has finished
      if (Number(currentSteps) >= challenge.targetSteps && participant.status !== 'finished') {
        const finishedCount = (db.prepare("SELECT COUNT(*) as count FROM challenge_participants WHERE challengeId = ? AND status = 'finished'").get(challengeId) as any).count;
        const rank = finishedCount + 1;
        const now = Date.now();

        // Calculate coin rewards based on rank
        let rewardCoins = 10;
        if (rank === 1) rewardCoins = Math.round(challenge.rewardPoolCoins * 0.5) || 100;
        else if (rank === 2) rewardCoins = Math.round(challenge.rewardPoolCoins * 0.3) || 50;
        else if (rank === 3) rewardCoins = Math.round(challenge.rewardPoolCoins * 0.2) || 25;

        db.prepare(`
          UPDATE challenge_participants 
          SET status = 'finished', finalRank = ?, finishedAt = ?, coinsEarned = ? 
          WHERE challengeId = ? AND userId = ?
        `).run(rank, now, rewardCoins, challengeId, userId);

        // Credit coins to user wallet
        db.prepare('UPDATE users SET coinsBalance = coinsBalance + ? WHERE id = ?').run(rewardCoins, userId);
        db.prepare(`
          INSERT INTO coin_transactions (id, userId, amount, reason, createdAt)
          VALUES (?, ?, ?, ?, ?)
        `).run(`tx_${Date.now()}`, userId, rewardCoins, `Rank #${rank} in Challenge "${challenge.title}"`, now);

        io.to(roomName).emit('participant_finished', {
          userId,
          username: participant.username,
          rank,
          coinsEarned: rewardCoins,
        });

        // Check if all players finished
        const totalParticipants = (db.prepare('SELECT COUNT(*) as count FROM challenge_participants WHERE challengeId = ?').get(challengeId) as any).count;
        const allFinished = (db.prepare("SELECT COUNT(*) as count FROM challenge_participants WHERE challengeId = ? AND status = 'finished'").get(challengeId) as any).count;

        if (allFinished >= totalParticipants) {
          db.prepare("UPDATE challenges SET status = 'completed', endTime = ? WHERE id = ?").run(now, challengeId);
          io.to(roomName).emit('challenge_completed', {
            challengeId,
            endTime: now,
          });
        }
      }

      // Broadcast live leaderboard to room
      const participants = db.prepare(`
        SELECT cp.*, u.avatarUrl 
        FROM challenge_participants cp
        JOIN users u ON cp.userId = u.id
        WHERE cp.challengeId = ?
        ORDER BY cp.status = 'finished' DESC, cp.finalRank ASC, cp.currentSteps DESC
      `).all(challengeId);

      io.to(roomName).emit('leaderboard_update', {
        challengeId,
        participants,
      });
    });

    // Leader cancels the challenge
    socket.on('cancel_challenge', ({ challengeId, userId }) => {
      const roomName = `challenge:${challengeId}`;
      const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(challengeId) as any;

      if (!challenge) return;
      if (challenge.creatorId !== userId) {
        socket.emit('error_message', 'Only the challenge leader can cancel this challenge.');
        return;
      }

      db.prepare("UPDATE challenges SET status = 'cancelled' WHERE id = ?").run(challengeId);
      db.prepare("UPDATE challenge_participants SET status = 'cancelled' WHERE challengeId = ?").run(challengeId);

      io.to(roomName).emit('challenge_cancelled', {
        challengeId,
        message: `Challenge "${challenge.title}" was cancelled by the host.`,
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
}
