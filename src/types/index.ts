export interface DailyStepRecord {
  date: string; // Format: 'YYYY-MM-DD'
  steps: number;
  distanceKm: number;
  calories: number;
  activeMinutes: number;
  goal: number;
  goalReached: boolean;
  updatedAt?: number;
}

export interface UserProfile {
  dailyGoal: number;
  heightCm: number;
  weightKg: number;
  strideLengthCm?: number;
  stepLengthAuto: boolean;
  gender: 'male' | 'female' | 'other';
  stepUnit: 'metric' | 'imperial';
  notificationsEnabled: boolean;
}

export interface OverallStats {
  totalSteps: number;
  totalDistanceKm: number;
  totalCalories: number;
  totalActiveMinutes: number;
  bestDay: {
    date: string;
    steps: number;
  } | null;
  currentStreak: number;
  longestStreak: number;
  daysTracked: number;
}

export interface WeeklyDataPoint {
  dayLabel: string; // 'Mon', 'Tue', etc.
  date: string; // 'YYYY-MM-DD'
  steps: number;
  goal: number;
  isToday: boolean;
}

export interface WorkoutSession {
  id: string;
  startTime: number;
  endTime?: number;
  durationSeconds: number;
  distanceKm: number;
  avgSpeedKmh: number;
  currentSpeedKmh: number;
  paceMinutesPerKm: number;
  steps: number;
  calories: number;
  date: string; // 'YYYY-MM-DD'
}

export type TabType = 'today' | 'challenges' | 'analytics' | 'history' | 'profile';
