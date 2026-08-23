import * as SQLite from 'expo-sqlite';
import { DailyStepRecord, OverallStats } from '../types';
import { getLocalDateString } from '../services/metricsCalculator';

const DB_NAME = 'walkapp.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
    dbInstance.execSync('PRAGMA journal_mode = WAL;');
    dbInstance.execSync(`
      CREATE TABLE IF NOT EXISTS daily_records (
        date TEXT PRIMARY KEY,
        steps INTEGER NOT NULL DEFAULT 0,
        distanceKm REAL NOT NULL DEFAULT 0.0,
        calories INTEGER NOT NULL DEFAULT 0,
        activeMinutes INTEGER NOT NULL DEFAULT 0,
        goal INTEGER NOT NULL DEFAULT 10000,
        goalReached INTEGER NOT NULL DEFAULT 0,
        updatedAt INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_records (date DESC);

      CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY,
        startTime INTEGER NOT NULL,
        endTime INTEGER NOT NULL,
        durationSeconds INTEGER NOT NULL,
        distanceKm REAL NOT NULL,
        avgSpeedKmh REAL NOT NULL,
        steps INTEGER NOT NULL,
        calories INTEGER NOT NULL,
        date TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions (date DESC);
    `);
  }
  return dbInstance;
}

/**
 * Inserts or updates today's or any specific date's step record.
 */
export function upsertDailyRecord(record: DailyStepRecord): void {
  const db = getDatabase();
  const goalReachedInt = record.steps >= record.goal ? 1 : 0;
  const now = Date.now();

  db.runSync(
    `INSERT INTO daily_records (date, steps, distanceKm, calories, activeMinutes, goal, goalReached, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       steps = excluded.steps,
       distanceKm = excluded.distanceKm,
       calories = excluded.calories,
       activeMinutes = excluded.activeMinutes,
       goal = excluded.goal,
       goalReached = excluded.goalReached,
       updatedAt = excluded.updatedAt;`,
    [
      record.date,
      record.steps,
      record.distanceKm,
      record.calories,
      record.activeMinutes,
      record.goal,
      goalReachedInt,
      now,
    ]
  );
}

/**
 * Retrieves a daily step record by date string ('YYYY-MM-DD').
 */
export function getRecordByDate(date: string): DailyStepRecord | null {
  const db = getDatabase();
  const row = db.getFirstSync<any>(
    `SELECT date, steps, distanceKm, calories, activeMinutes, goal, goalReached, updatedAt 
     FROM daily_records 
     WHERE date = ?`,
    [date]
  );

  if (!row) {
    return null;
  }

  return {
    date: row.date,
    steps: Number(row.steps),
    distanceKm: Number(row.distanceKm),
    calories: Number(row.calories),
    activeMinutes: Number(row.activeMinutes),
    goal: Number(row.goal),
    goalReached: Boolean(row.goalReached),
    updatedAt: Number(row.updatedAt),
  };
}

/**
 * Retrieves the most recent N days of records, sorted chronologically (oldest to newest)
 * for charting, or newest to oldest for history listing.
 */
export function getRecentRecords(limit: number = 30, ascending: boolean = false): DailyStepRecord[] {
  const db = getDatabase();
  const order = ascending ? 'ASC' : 'DESC';
  const rows = db.getAllSync<any>(
    `SELECT date, steps, distanceKm, calories, activeMinutes, goal, goalReached, updatedAt 
     FROM daily_records 
     ORDER BY date ${order} 
     LIMIT ?`,
    [limit]
  );

  return rows.map((row) => ({
    date: row.date,
    steps: Number(row.steps),
    distanceKm: Number(row.distanceKm),
    calories: Number(row.calories),
    activeMinutes: Number(row.activeMinutes),
    goal: Number(row.goal),
    goalReached: Boolean(row.goalReached),
    updatedAt: Number(row.updatedAt),
  }));
}

/**
 * Calculates current streak and longest streak of hitting the daily goal.
 */
export function calculateStreaks(): { currentStreak: number; longestStreak: number } {
  const db = getDatabase();
  const rows = db.getAllSync<{ date: string; steps: number; goal: number }>(
    `SELECT date, steps, goal FROM daily_records ORDER BY date DESC`
  );

  if (rows.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const todayStr = getLocalDateString(new Date());
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Calculate current streak
  let checkDate = new Date();
  // Check if today reached goal
  const todayRecord = rows.find((r) => r.date === todayStr);
  let streakAnchorDate = new Date();

  if (todayRecord && todayRecord.steps >= todayRecord.goal) {
    currentStreak++;
    streakAnchorDate.setDate(streakAnchorDate.getDate() - 1);
  } else {
    // Today not yet reached, start checking from yesterday
    streakAnchorDate.setDate(streakAnchorDate.getDate() - 1);
  }

  while (true) {
    const targetDateStr = getLocalDateString(streakAnchorDate);
    const rec = rows.find((r) => r.date === targetDateStr);
    if (rec && rec.steps >= rec.goal) {
      currentStreak++;
      streakAnchorDate.setDate(streakAnchorDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak across history
  // Sort oldest to newest
  const sortedOldest = [...rows].reverse();
  for (let i = 0; i < sortedOldest.length; i++) {
    if (sortedOldest[i].steps >= sortedOldest[i].goal) {
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
  };
}

/**
 * Retrieves overall lifetime statistics.
 */
export function getOverallStats(): OverallStats {
  const db = getDatabase();
  const aggregate = db.getFirstSync<{
    totalSteps: number;
    totalDistance: number;
    totalCalories: number;
    totalActive: number;
    daysCount: number;
  }>(`
    SELECT 
      COALESCE(SUM(steps), 0) as totalSteps,
      COALESCE(SUM(distanceKm), 0.0) as totalDistance,
      COALESCE(SUM(calories), 0) as totalCalories,
      COALESCE(SUM(activeMinutes), 0) as totalActive,
      COUNT(date) as daysCount
    FROM daily_records
  `);

  const bestRow = db.getFirstSync<{ date: string; steps: number }>(`
    SELECT date, steps 
    FROM daily_records 
    ORDER BY steps DESC 
    LIMIT 1
  `);

  const streaks = calculateStreaks();

  return {
    totalSteps: aggregate?.totalSteps || 0,
    totalDistanceKm: Number((aggregate?.totalDistance || 0).toFixed(2)),
    totalCalories: aggregate?.totalCalories || 0,
    totalActiveMinutes: aggregate?.totalActive || 0,
    daysTracked: aggregate?.daysCount || 0,
    bestDay: bestRow ? { date: bestRow.date, steps: bestRow.steps } : null,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
  };
}

/**
 * Clear all data for reset functionality.
 */
export function clearAllRecords(): void {
  const db = getDatabase();
  db.runSync(`DELETE FROM daily_records`);
  db.runSync(`DELETE FROM workout_sessions`);
}

/**
 * Saves a completed GPS workout session.
 */
export function saveWorkoutSession(session: import('../types').WorkoutSession): void {
  const db = getDatabase();
  db.runSync(
    `INSERT INTO workout_sessions (id, startTime, endTime, durationSeconds, distanceKm, avgSpeedKmh, steps, calories, date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      session.id,
      session.startTime,
      session.endTime || Date.now(),
      session.durationSeconds,
      session.distanceKm,
      session.avgSpeedKmh,
      session.steps,
      session.calories,
      session.date,
    ]
  );
}

/**
 * Retrieves recent completed GPS workout sessions.
 */
export function getRecentWorkouts(limit: number = 10): import('../types').WorkoutSession[] {
  const db = getDatabase();
  const rows = db.getAllSync<any>(
    `SELECT id, startTime, endTime, durationSeconds, distanceKm, avgSpeedKmh, steps, calories, date
     FROM workout_sessions
     ORDER BY startTime DESC
     LIMIT ?;`,
    [limit]
  );

  return rows.map((r) => ({
    id: r.id,
    startTime: Number(r.startTime),
    endTime: Number(r.endTime),
    durationSeconds: Number(r.durationSeconds),
    distanceKm: Number(r.distanceKm),
    avgSpeedKmh: Number(r.avgSpeedKmh),
    currentSpeedKmh: 0,
    paceMinutesPerKm: r.distanceKm > 0 ? (r.durationSeconds / 60) / r.distanceKm : 0,
    steps: Number(r.steps),
    calories: Number(r.calories),
    date: r.date,
  }));
}
