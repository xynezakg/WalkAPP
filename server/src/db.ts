import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const dbPath = path.join(__dirname, '..', 'walkapp_server.db');
export const db = new DatabaseSync(dbPath);

// Initialize Tables
export function initServerDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      coinsBalance INTEGER NOT NULL DEFAULT 50,
      avatarUrl TEXT,
      isBanned INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      creatorId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL DEFAULT 'steps_race',
      targetSteps INTEGER NOT NULL,
      maxPlayers INTEGER NOT NULL DEFAULT 10,
      visibility TEXT NOT NULL DEFAULT 'public',
      status TEXT NOT NULL DEFAULT 'waiting',
      inviteCode TEXT UNIQUE NOT NULL,
      rewardPoolCoins INTEGER NOT NULL DEFAULT 100,
      createdAt INTEGER NOT NULL,
      startTime INTEGER,
      endTime INTEGER
    );

    CREATE TABLE IF NOT EXISTS challenge_participants (
      id TEXT PRIMARY KEY,
      challengeId TEXT NOT NULL,
      userId TEXT NOT NULL,
      username TEXT NOT NULL,
      currentSteps INTEGER NOT NULL DEFAULT 0,
      finalRank INTEGER,
      coinsEarned INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'joined',
      finishedAt INTEGER,
      joinedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS challenge_photos (
      id TEXT PRIMARY KEY,
      challengeId TEXT NOT NULL,
      userId TEXT NOT NULL,
      username TEXT NOT NULL,
      photoBase64 TEXT NOT NULL,
      caption TEXT,
      uploadedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coin_transactions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
  `);

  // Seed default Admin and sample demo users if not existing
  const checkAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as any;
  if (!checkAdmin) {
    const adminPassHash = bcrypt.hashSync('admin123', 10);
    const now = Date.now();
    db.prepare(`
      INSERT INTO users (id, username, email, passwordHash, role, coinsBalance, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('usr_admin', 'admin', 'admin@walkapp.com', adminPassHash, 'admin', 1000, now);

    const userPassHash = bcrypt.hashSync('user123', 10);
    db.prepare(`
      INSERT INTO users (id, username, email, passwordHash, role, coinsBalance, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('usr_alex', 'alex_walker', 'alex@walkapp.com', userPassHash, 'user', 250, now);

    db.prepare(`
      INSERT INTO users (id, username, email, passwordHash, role, coinsBalance, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('usr_sarah', 'sarah_runner', 'sarah@walkapp.com', userPassHash, 'user', 180, now);

    // Seed a sample public challenge
    db.prepare(`
      INSERT INTO challenges (id, creatorId, title, description, targetSteps, maxPlayers, visibility, status, inviteCode, rewardPoolCoins, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ch_morning_sprint',
      'usr_alex',
      'Morning 3K Step Dash 🏃‍♂️',
      'First to reach 3,000 steps wins the grand prize!',
      3000,
      8,
      'public',
      'waiting',
      'WALK3K',
      200,
      now
    );

    db.prepare(`
      INSERT INTO challenge_participants (id, challengeId, userId, username, currentSteps, status, joinedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('cp_alex_1', 'ch_morning_sprint', 'usr_alex', 'alex_walker', 0, 'joined', now);

    db.prepare(`
      INSERT INTO challenge_participants (id, challengeId, userId, username, currentSteps, status, joinedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('cp_sarah_1', 'ch_morning_sprint', 'usr_sarah', 'sarah_runner', 0, 'joined', now);
  }
}
