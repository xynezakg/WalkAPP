import { UserProfile } from '../types';

export const DEFAULT_USER_PROFILE: UserProfile = {
  dailyGoal: 10000,
  heightCm: 175,
  weightKg: 70,
  strideLengthCm: 72,
  stepLengthAuto: true,
  gender: 'male',
  stepUnit: 'metric',
  notificationsEnabled: true,
};

/**
 * Calculates stride length in centimeters based on height and gender.
 */
export function getEstimatedStrideLengthCm(heightCm: number, gender: 'male' | 'female' | 'other'): number {
  if (gender === 'female') {
    return Math.round(heightCm * 0.413);
  }
  if (gender === 'male') {
    return Math.round(heightCm * 0.415);
  }
  return Math.round(heightCm * 0.414);
}

/**
 * Calculates walking distance in kilometers.
 */
export function calculateDistanceKm(steps: number, profile: UserProfile): number {
  const strideCm = profile.stepLengthAuto
    ? getEstimatedStrideLengthCm(profile.heightCm, profile.gender)
    : (profile.strideLengthCm || 72);

  const totalCentimeters = steps * strideCm;
  const kilometers = totalCentimeters / 100000;
  return Number(kilometers.toFixed(2));
}

/**
 * Calculates calories burned during walking.
 * Standard MET for moderate walking (~4.8 km/h) is 3.5.
 * Formula: Calories = MET * 3.5 * weightKg / 200 * durationMinutes
 * Since steps / 100 is approx 1 minute of walking:
 * Average ~0.044 kcal per step for a 70kg individual.
 */
export function calculateCalories(steps: number, profile: UserProfile): number {
  const weightFactor = profile.weightKg / 70;
  const baseKcalPerStep = 0.044;
  const totalKcal = steps * baseKcalPerStep * weightFactor;
  return Math.round(totalKcal);
}

/**
 * Calculates active walking minutes based on an average cadence of 105 steps/minute.
 */
export function calculateActiveMinutes(steps: number): number {
  const averageCadence = 105; // steps per minute
  return Math.round(steps / averageCadence);
}

/**
 * Get date string in 'YYYY-MM-DD' formatted for the device's local timezone.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date for friendly UI display.
 */
export function formatFriendlyDate(dateStr: string): string {
  const today = getLocalDateString(new Date());
  if (dateStr === today) {
    return 'Today';
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === getLocalDateString(yesterday)) {
    return 'Yesterday';
  }

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  return dateStr;
}

/**
 * Format numbers with commas (e.g. 10,000)
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}
