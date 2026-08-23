import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import * as Haptics from 'expo-haptics';
import { DailyStepRecord, UserProfile, OverallStats, WeeklyDataPoint } from '../types';
import {
  DEFAULT_USER_PROFILE,
  calculateCalories,
  calculateDistanceKm,
  calculateActiveMinutes,
  getLocalDateString,
} from '../services/metricsCalculator';
import {
  getDatabase,
  upsertDailyRecord,
  getRecordByDate,
  getRecentRecords,
  getOverallStats,
  clearAllRecords,
} from '../db/database';
import {
  checkPedometerAvailability,
  requestPedometerPermissions,
  getTodayStepCountFromOS,
  startHybridStepTracking,
  TrackingStatus,
} from '../services/pedometerService';
import {
  getHealthConnectStatus,
  requestHealthConnectPermissions,
  HealthConnectStatus,
} from '../services/healthConnectService';
import {
  performHealthSync,
  getLastSyncTimestamp,
} from '../services/syncManager';

const USER_PROFILE_KEY = '@walkapp_user_profile_v1';

interface StepContextType {
  todayRecord: DailyStepRecord;
  profile: UserProfile;
  overallStats: OverallStats;
  weeklyData: WeeklyDataPoint[];
  historyRecords: DailyStepRecord[];
  trackingStatus: TrackingStatus;
  healthConnectStatus: HealthConnectStatus;
  lastSyncTime: number | null;
  isSyncing: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  syncWithHealthConnect: () => Promise<boolean>;
  connectHealthConnect: () => Promise<boolean>;
  updateProfile: (newProfile: Partial<UserProfile>) => Promise<void>;
  addManualSteps: (amount: number) => void;
  resetAllAppData: () => void;
  seedDemoData: () => void;
  refreshData: () => void;
}

const StepContext = createContext<StepContextType | undefined>(undefined);

export const StepProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>({
    isAvailable: true,
    isTracking: true,
    trackingMode: 'accelerometer',
    permissionGranted: true,
  });
  const [healthConnectStatus, setHealthConnectStatus] = useState<HealthConnectStatus>({
    isAvailable: false,
    hasPermissions: false,
    sdkStatus: 'unsupported',
    providerName: 'Google Health Connect / Samsung Health',
  });
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [todayRecord, setTodayRecord] = useState<DailyStepRecord>({
    date: getLocalDateString(new Date()),
    steps: 0,
    distanceKm: 0,
    calories: 0,
    activeMinutes: 0,
    goal: 10000,
    goalReached: false,
  });
  const [overallStats, setOverallStats] = useState<OverallStats>({
    totalSteps: 0,
    totalDistanceKm: 0,
    totalCalories: 0,
    totalActiveMinutes: 0,
    bestDay: null,
    currentStreak: 0,
    longestStreak: 0,
    daysTracked: 0,
  });
  const [weeklyData, setWeeklyData] = useState<WeeklyDataPoint[]>([]);
  const [historyRecords, setHistoryRecords] = useState<DailyStepRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and load stored settings & database
  const loadInitialData = useCallback(async () => {
    try {
      // 1. Ensure DB is created
      getDatabase();

      // 2. Load User Profile from AsyncStorage
      const storedProfile = await AsyncStorage.getItem(USER_PROFILE_KEY);
      let currentProf = DEFAULT_USER_PROFILE;
      if (storedProfile) {
        currentProf = { ...DEFAULT_USER_PROFILE, ...JSON.parse(storedProfile) };
        setProfile(currentProf);
      }

      // 3. Load or initialize today's record from SQLite
      const todayStr = getLocalDateString(new Date());
      let rec = getRecordByDate(todayStr);

      if (!rec) {
        rec = {
          date: todayStr,
          steps: 0,
          distanceKm: 0,
          calories: 0,
          activeMinutes: 0,
          goal: currentProf.dailyGoal,
          goalReached: false,
        };
        upsertDailyRecord(rec);
      }
      setTodayRecord(rec);

      // 4. Check sensor availability
      const status = await checkPedometerAvailability();
      setTrackingStatus(status);

      // 5. Check Health Connect status & last sync
      const hcStatus = await getHealthConnectStatus();
      setHealthConnectStatus(hcStatus);
      const lastSync = await getLastSyncTimestamp();
      setLastSyncTime(lastSync);

      // 6. If Health Connect has permission, auto-sync
      if (hcStatus.isAvailable && hcStatus.hasPermissions) {
        await performHealthSync(currentProf);
        const updatedToday = getRecordByDate(todayStr);
        if (updatedToday) {
          setTodayRecord(updatedToday);
        }
      } else if (status.trackingMode === 'hardware') {
        const osSteps = await getTodayStepCountFromOS();
        if (osSteps !== null && osSteps > rec.steps) {
          rec = {
            ...rec,
            steps: osSteps,
            distanceKm: calculateDistanceKm(osSteps, currentProf),
            calories: calculateCalories(osSteps, currentProf),
            activeMinutes: calculateActiveMinutes(osSteps),
            goalReached: osSteps >= currentProf.dailyGoal,
          };
          upsertDailyRecord(rec);
          setTodayRecord(rec);
        }
      }

      // 7. Refresh aggregate tables and charts
      refreshAggregates(currentProf);
    } catch (err) {
      console.warn('Error loading step tracker initial data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshAggregates = (currentProfile: UserProfile = profile) => {
    const stats = getOverallStats();
    setOverallStats(stats);

    const recent = getRecentRecords(30, false);
    setHistoryRecords(recent);

    // Build last 7 days chart data
    const daysArr: WeeklyDataPoint[] = [];
    const today = new Date();
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dStr = getLocalDateString(d);
      const dayName = dayLabels[d.getDay()];
      const isToday = i === 0;

      const found = recent.find((r) => r.date === dStr);
      daysArr.push({
        dayLabel: dayName,
        date: dStr,
        steps: found ? found.steps : 0,
        goal: currentProfile.dailyGoal,
        isToday,
      });
    }
    setWeeklyData(daysArr);
  };

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle live hybrid step tracking (Hardware or Accelerometer)
  useEffect(() => {
    const unsubscribe = startHybridStepTracking((delta) => {
      setTodayRecord((prev) => {
        const todayStr = getLocalDateString(new Date());
        const targetDate = prev.date === todayStr ? prev.date : todayStr;
        const newSteps = (prev.date === todayStr ? prev.steps : 0) + delta;
        const wasReached = prev.goalReached;
        const nowReached = newSteps >= profile.dailyGoal;

        if (!wasReached && nowReached) {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (_) {}
        }

        const updated: DailyStepRecord = {
          date: targetDate,
          steps: newSteps,
          distanceKm: calculateDistanceKm(newSteps, profile),
          calories: calculateCalories(newSteps, profile),
          activeMinutes: calculateActiveMinutes(newSteps),
          goal: profile.dailyGoal,
          goalReached: nowReached,
        };

        upsertDailyRecord(updated);
        return updated;
      });

      refreshAggregates(profile);
    });

    return () => {
      unsubscribe();
    };
  }, [profile]);

  // Handle AppState changes (when returning from background or settings, refresh steps & permissions)
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const status = await checkPedometerAvailability();
        setTrackingStatus(status);

        const hcStatus = await getHealthConnectStatus();
        setHealthConnectStatus(hcStatus);

        const todayStr = getLocalDateString(new Date());
        let currentToday = getRecordByDate(todayStr);
        if (!currentToday) {
          currentToday = {
            date: todayStr,
            steps: 0,
            distanceKm: 0,
            calories: 0,
            activeMinutes: 0,
            goal: profile.dailyGoal,
            goalReached: false,
          };
          upsertDailyRecord(currentToday);
        }

        if (hcStatus.isAvailable && hcStatus.hasPermissions) {
          await performHealthSync(profile);
          const syncedToday = getRecordByDate(todayStr);
          if (syncedToday) {
            currentToday = syncedToday;
          }
        } else if (status.trackingMode === 'hardware') {
          const osSteps = await getTodayStepCountFromOS();
          if (osSteps !== null && osSteps > currentToday.steps) {
            currentToday = {
              ...currentToday,
              steps: osSteps,
              distanceKm: calculateDistanceKm(osSteps, profile),
              calories: calculateCalories(osSteps, profile),
              activeMinutes: calculateActiveMinutes(osSteps),
              goalReached: osSteps >= profile.dailyGoal,
            };
            upsertDailyRecord(currentToday);
          }
        }

        setTodayRecord(currentToday);
        refreshAggregates(profile);
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [profile]);

  const requestPermission = async (): Promise<boolean> => {
    const granted = await requestPedometerPermissions();
    const updatedStatus = await checkPedometerAvailability();
    setTrackingStatus(updatedStatus);

    if (granted && updatedStatus.trackingMode === 'hardware') {
      const osSteps = await getTodayStepCountFromOS();
      if (osSteps !== null) {
        setTodayRecord((prev) => {
          const updated: DailyStepRecord = {
            ...prev,
            steps: Math.max(prev.steps, osSteps),
            distanceKm: calculateDistanceKm(Math.max(prev.steps, osSteps), profile),
            calories: calculateCalories(Math.max(prev.steps, osSteps), profile),
            activeMinutes: calculateActiveMinutes(Math.max(prev.steps, osSteps)),
            goalReached: Math.max(prev.steps, osSteps) >= profile.dailyGoal,
          };
          upsertDailyRecord(updated);
          return updated;
        });
        refreshAggregates(profile);
      }
    }
    return granted;
  };

  const connectHealthConnect = async (): Promise<boolean> => {
    const granted = await requestHealthConnectPermissions();
    const hcStatus = await getHealthConnectStatus();
    setHealthConnectStatus(hcStatus);

    if (granted) {
      await syncWithHealthConnect();
    }
    return granted;
  };

  const syncWithHealthConnect = async (): Promise<boolean> => {
    setIsSyncing(true);
    try {
      const res = await performHealthSync(profile);
      if (res.success) {
        const todayStr = getLocalDateString(new Date());
        const updatedToday = getRecordByDate(todayStr);
        if (updatedToday) {
          setTodayRecord(updatedToday);
        }
        const lastSync = await getLastSyncTimestamp();
        setLastSyncTime(lastSync);
        refreshAggregates(profile);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (_) {}
      }
      return res.success;
    } finally {
      setIsSyncing(false);
    }
  };

  const updateProfile = async (newProfileData: Partial<UserProfile>) => {
    const updated = { ...profile, ...newProfileData };
    setProfile(updated);
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(updated));

    // Recalculate today's values with updated height/weight/goal
    setTodayRecord((prev) => {
      const rec: DailyStepRecord = {
        ...prev,
        goal: updated.dailyGoal,
        distanceKm: calculateDistanceKm(prev.steps, updated),
        calories: calculateCalories(prev.steps, updated),
        goalReached: prev.steps >= updated.dailyGoal,
      };
      upsertDailyRecord(rec);
      return rec;
    });

    refreshAggregates(updated);
  };

  const addManualSteps = (amount: number) => {
    setTodayRecord((prev) => {
      const newSteps = Math.max(0, prev.steps + amount);
      const wasReached = prev.goalReached;
      const nowReached = newSteps >= profile.dailyGoal;

      if (!wasReached && nowReached) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (_) {}
      }

      const updated: DailyStepRecord = {
        ...prev,
        steps: newSteps,
        distanceKm: calculateDistanceKm(newSteps, profile),
        calories: calculateCalories(newSteps, profile),
        activeMinutes: calculateActiveMinutes(newSteps),
        goalReached: nowReached,
      };

      upsertDailyRecord(updated);
      return updated;
    });

    refreshAggregates(profile);
  };

  const resetAllAppData = () => {
    clearAllRecords();
    const todayStr = getLocalDateString(new Date());
    const emptyToday: DailyStepRecord = {
      date: todayStr,
      steps: 0,
      distanceKm: 0,
      calories: 0,
      activeMinutes: 0,
      goal: profile.dailyGoal,
      goalReached: false,
    };
    upsertDailyRecord(emptyToday);
    setTodayRecord(emptyToday);
    refreshAggregates(profile);
  };

  const seedDemoData = () => {
    clearAllRecords();
    const today = new Date();

    const sampleStepPatterns = [
      8540, 10230, 6420, 11450, 9800, 12300, 7890, 10500, 9100, 13400, 10100, 8900, 11200, 6800,
    ];

    sampleStepPatterns.forEach((steps, idx) => {
      const d = new Date();
      d.setDate(today.getDate() - (sampleStepPatterns.length - 1 - idx));
      const dateStr = getLocalDateString(d);

      const record: DailyStepRecord = {
        date: dateStr,
        steps,
        distanceKm: calculateDistanceKm(steps, profile),
        calories: calculateCalories(steps, profile),
        activeMinutes: calculateActiveMinutes(steps),
        goal: profile.dailyGoal,
        goalReached: steps >= profile.dailyGoal,
        updatedAt: Date.now(),
      };
      upsertDailyRecord(record);
    });

    // Update today
    const todayStr = getLocalDateString(today);
    const todayRec = getRecordByDate(todayStr);
    if (todayRec) {
      setTodayRecord(todayRec);
    }
    refreshAggregates(profile);
  };

  const refreshData = () => {
    loadInitialData();
  };

  return (
    <StepContext.Provider
      value={{
        todayRecord,
        profile,
        overallStats,
        weeklyData,
        historyRecords,
        trackingStatus,
        healthConnectStatus,
        lastSyncTime,
        isSyncing,
        isLoading,
        requestPermission,
        syncWithHealthConnect,
        connectHealthConnect,
        updateProfile,
        addManualSteps,
        resetAllAppData,
        seedDemoData,
        refreshData,
      }}
    >
      {children}
    </StepContext.Provider>
  );
};

export function useSteps() {
  const context = useContext(StepContext);
  if (!context) {
    throw new Error('useSteps must be used within a StepProvider');
  }
  return context;
}
