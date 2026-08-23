import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';

export const authRouter = Router();
export const JWT_SECRET = process.env.JWT_SECRET || 'walkapp_jwt_secret_key_2026';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// POST /api/auth/register
authRouter.post('/register', (req: Request, res: Response): void => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: 'Username, email, and password are required' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    const existing = db
      .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
      .get(cleanUsername, cleanEmail) as any;

    if (existing) {
      res.status(400).json({ error: 'Username or email is already in use' });
      return;
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = Date.now();
    const starterCoins = 50;

    db.prepare(`
      INSERT INTO users (id, username, email, passwordHash, role, coinsBalance, createdAt)
      VALUES (?, ?, ?, ?, 'user', ?, ?)
    `).run(userId, cleanUsername, cleanEmail, passwordHash, starterCoins, now);

    db.prepare(`
      INSERT INTO coin_transactions (id, userId, amount, reason, createdAt)
      VALUES (?, ?, ?, 'Starter Welcome Bonus', ?)
    `).run(`tx_${Date.now()}`, userId, starterCoins, now);

    const token = jwt.sign(
      { id: userId, username: cleanUsername, role: 'user' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: userId,
        username: cleanUsername,
        email: cleanEmail,
        role: 'user',
        coinsBalance: starterCoins,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to create user account' });
  }
});

// POST /api/auth/login
authRouter.post('/login', (req: Request, res: Response): void => {
  try {
    const { identifier, password } = req.body; // username or email

    if (!identifier || !password) {
      res.status(400).json({ error: 'Username/email and password are required' });
      return;
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    const user = db
      .prepare('SELECT * FROM users WHERE username = ? OR email = ?')
      .get(cleanIdentifier, cleanIdentifier) as any;

    if (!user) {
      res.status(400).json({ error: 'Invalid username/email or password' });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({ error: 'This account has been suspended by an administrator.' });
      return;
    }

    const passwordValid = bcrypt.compareSync(password, user.passwordHash);
    if (!passwordValid) {
      res.status(400).json({ error: 'Invalid username/email or password' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        coinsBalance: user.coinsBalance,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const user = db.prepare('SELECT id, username, email, role, coinsBalance, avatarUrl, isBanned FROM users WHERE id = ?').get(req.user!.id) as any;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user session' });
  }
});
