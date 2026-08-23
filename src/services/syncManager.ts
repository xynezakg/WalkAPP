import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, DailyStepRecord } from '../types';
import {
  fetchHistoricalHealthData,
  getHealthConnectStatus,
} from './healthConnectService';
import {
  upsertDailyRecord,
  getRecordByDate,
} from '../db/database';
import {
  calculateDistanceKm,
  calculateCalories,
  calculateActiveMinutes,
  getLocalDateString,
} from './metricsCalculator';

const LAST_SYNC_KEY = '@walkapp_health_connect_last_sync';

export interface SyncResult {
  success: boolean;
  syncedDaysCount: number;
  todaySteps: number;
  message: string;
}

/**
 * Performs a full synchronization with Health Connect / Samsung Health.
 */
export async function performHealthSync(profile: UserProfile): Promise<SyncResult> {
  try {
    const status = await getHealthConnectStatus();
    if (!status.isAvailable) {
      return {
        success: false,
        syncedDaysCount: 0,
        todaySteps: 0,
        message: 'Health Connect is not available on this build/device.',
      };
    }

    if (!status.hasPermissions) {
      return {
        success: false,
        syncedDaysCount: 0,
        todaySteps: 0,
        message: 'Health Connect permissions not granted.',
      };
    }

    const historicalData = await fetchHistoricalHealthData(30);
    let todaySteps = 0;
    const todayStr = getLocalDateString(new Date());

    for (const item of historicalData) {
      const existing = getRecordByDate(item.date);
      const effectiveSteps = Math.max(existing?.steps || 0, item.steps);

      if (item.date === todayStr) {
        todaySteps = effectiveSteps;
      }

      const record: DailyStepRecord = {
        date: item.date,
        steps: effectiveSteps,
        distanceKm: calculateDistanceKm(effectiveSteps, profile),
        calories: calculateCalories(effectiveSteps, profile),
        activeMinutes: calculateActiveMinutes(effectiveSteps),
        goal: profile.dailyGoal,
        goalReached: effectiveSteps >= profile.dailyGoal,
        updatedAt: Date.now(),
      };

      upsertDailyRecord(record);
    }

    await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now()));

    return {
      success: true,
      syncedDaysCount: historicalData.length,
      todaySteps,
      message: `Successfully synced ${historicalData.length} days of activity.`,
    };
  } catch (error) {
    console.error('Error during Health Connect synchronization:', error);
    return {
      success: false,
      syncedDaysCount: 0,
      todaySteps: 0,
      message: 'Failed to synchronize with Health Connect.',
    };
  }
}

/**
 * Retrieves the timestamp of the last successful Health Connect synchronization.
 */
export async function getLastSyncTimestamp(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return raw ? Number(raw) : null;
  } catch (_) {
    return null;
  }
}
