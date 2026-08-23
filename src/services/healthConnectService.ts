import { Platform, Linking, Alert } from 'react-native';

export interface HealthConnectStatus {
  isAvailable: boolean;
  hasPermissions: boolean;
  sdkStatus: 'available' | 'update_required' | 'not_installed' | 'unsupported';
  providerName: string;
}

export interface DayStepData {
  date: string; // 'YYYY-MM-DD'
  steps: number;
  distanceMeters?: number;
  caloriesKcal?: number;
}

// Lazy safe loader for react-native-health-connect native module
let HealthConnect: typeof import('react-native-health-connect') | null = null;
try {
  HealthConnect = require('react-native-health-connect');
} catch (e) {
  HealthConnect = null;
}

/**
 * Checks if Health Connect SDK is supported and available on this Android device.
 */
export async function getHealthConnectStatus(): Promise<HealthConnectStatus> {
  if (Platform.OS !== 'android' || !HealthConnect) {
    return {
      isAvailable: false,
      hasPermissions: false,
      sdkStatus: 'unsupported',
      providerName: 'Google Health Connect',
    };
  }

  try {
    const isInitialized = await HealthConnect.initialize();
    if (!isInitialized) {
      return {
        isAvailable: false,
        hasPermissions: false,
        sdkStatus: 'unsupported',
        providerName: 'Google Health Connect',
      };
    }

    const status = await HealthConnect.getSdkStatus();
    const isAvailable = status === HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE;

    let sdkStatusStr: HealthConnectStatus['sdkStatus'] = 'available';
    if (status === HealthConnect.SdkAvailabilityStatus.SDK_UNAVAILABLE) {
      sdkStatusStr = 'not_installed';
    } else if (status === HealthConnect.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
      sdkStatusStr = 'update_required';
    }

    let hasPermissions = false;
    if (isAvailable) {
      const granted = await HealthConnect.getGrantedPermissions();
      hasPermissions = granted.some(
        (p) => p.recordType === 'Steps' && p.accessType === 'read'
      );
    }

    return {
      isAvailable,
      hasPermissions,
      sdkStatus: sdkStatusStr,
      providerName: 'Google Health Connect / Samsung Health',
    };
  } catch (error) {
    // Expected in generic Expo Go client as custom native modules require a Dev Build
    return {
      isAvailable: false,
      hasPermissions: false,
      sdkStatus: 'unsupported',
      providerName: 'Google Health Connect',
    };
  }
}

/**
 * Requests read permissions for Steps, Distance, and Calories.
 */
export async function requestHealthConnectPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android' || !HealthConnect) {
    Alert.alert(
      'Custom Build Required for Health Connect',
      'Direct Samsung Health synchronization requires a Custom Android Build (npx expo run:android). In Expo Go, your app uses the Motion Sensor Engine for step counting.'
    );
    return false;
  }

  try {
    const initialized = await HealthConnect.initialize();
    if (!initialized) {
      Alert.alert(
        'Health Connect',
        'Health Connect could not be initialized. Please check that Health Connect is installed on your device.'
      );
      return false;
    }

    const permissions = await HealthConnect.requestPermission([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'Distance' },
      { accessType: 'read', recordType: 'TotalCaloriesBurned' },
    ]);

    const stepsGranted = permissions.some(
      (p) => p.recordType === 'Steps' && p.accessType === 'read'
    );
    return stepsGranted;
  } catch (error) {
    Alert.alert(
      'Development Build Required',
      'Direct Samsung Health synchronization uses native Android Health APIs which run in a Custom Android Build (npx expo run:android). In Expo Go preview mode, your app automatically tracks steps with the Motion Sensor.'
    );
    return false;
  }
}

/**
 * Reads aggregated steps from Health Connect for a specific date range.
 */
export async function fetchHealthConnectSteps(
  startDate: Date,
  endDate: Date
): Promise<number> {
  if (Platform.OS !== 'android' || !HealthConnect) {
    return 0;
  }

  try {
    const result = await HealthConnect.aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter: {
        operator: 'between',
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      },
    });

    return result.COUNT_TOTAL || 0;
  } catch (error) {
    console.log('Error reading Health Connect steps:', error);
    return 0;
  }
}

/**
 * Reads daily steps, distance, and calories for the past N days from Health Connect.
 */
export async function fetchHistoricalHealthData(
  daysCount: number = 30
): Promise<DayStepData[]> {
  if (Platform.OS !== 'android' || !HealthConnect) {
    return [];
  }

  const results: DayStepData[] = [];
  const now = new Date();

  for (let i = 0; i < daysCount; i++) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999);

    const year = dayStart.getFullYear();
    const month = String(dayStart.getMonth() + 1).padStart(2, '0');
    const day = String(dayStart.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    try {
      const stepAgg = await HealthConnect.aggregateRecord({
        recordType: 'Steps',
        timeRangeFilter: {
          operator: 'between',
          startTime: dayStart.toISOString(),
          endTime: dayEnd.toISOString(),
        },
      });

      const steps = stepAgg.COUNT_TOTAL || 0;
      if (steps > 0 || i === 0) {
        results.push({
          date: dateStr,
          steps,
        });
      }
    } catch (err) {
      // Continue next day if one fails
    }
  }

  return results;
}

/**
 * Open Health Connect settings in Android.
 */
export async function openHealthSettings(): Promise<void> {
  if (Platform.OS === 'android' && HealthConnect) {
    try {
      HealthConnect.openHealthConnectSettings();
      return;
    } catch (_) {}
  }
  Linking.openSettings();
}
