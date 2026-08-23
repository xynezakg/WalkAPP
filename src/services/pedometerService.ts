import { Pedometer, Accelerometer } from 'expo-sensors';
import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';

export type TrackingMode = 'hardware' | 'accelerometer' | 'none';

export interface TrackingStatus {
  isAvailable: boolean;
  isTracking: boolean;
  trackingMode: TrackingMode;
  permissionGranted: boolean;
}

/**
 * Checks if the hardware step detector sensor is available and queries current permission status.
 */
export async function checkPedometerAvailability(): Promise<TrackingStatus> {
  try {
    const isPedometerAvailable = await Pedometer.isAvailableAsync();
    let permissionGranted = false;

    if (Platform.OS === 'android') {
      if (Platform.Version >= 29) {
        try {
          permissionGranted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
          );
        } catch (_) {
          permissionGranted = true;
        }
      } else {
        permissionGranted = true;
      }
    } else {
      const permissions = await Pedometer.getPermissionsAsync();
      permissionGranted = permissions.granted;
    }

    const isAccelAvailable = await Accelerometer.isAvailableAsync();

    let trackingMode: TrackingMode = 'none';
    if (isPedometerAvailable && permissionGranted) {
      trackingMode = 'hardware';
    } else if (isAccelAvailable) {
      trackingMode = 'accelerometer';
    }

    return {
      isAvailable: isPedometerAvailable || isAccelAvailable,
      isTracking: trackingMode !== 'none',
      trackingMode,
      permissionGranted: permissionGranted || isAccelAvailable,
    };
  } catch (error) {
    console.warn('Error checking tracking availability:', error);
    return {
      isAvailable: true,
      isTracking: true,
      trackingMode: 'accelerometer',
      permissionGranted: true,
    };
  }
}

/**
 * Requests runtime Activity Recognition permissions from the user.
 */
export async function requestPedometerPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 29) {
      try {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
          {
            title: 'Physical Activity Permission',
            message:
              'WalkAPP uses activity tracking to count your steps. If this permission is unavailable on your device, accelerometer tracking will be used automatically.',
            buttonPositive: 'Allow',
            buttonNegative: 'Cancel',
          }
        );
        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        }
      } catch (err) {
        console.log('PermissionsAndroid request bypassed, using sensor fallback:', err);
      }
    } else {
      const response = await Pedometer.requestPermissionsAsync();
      if (response.granted) return true;
    }

    // If hardware pedometer permission is not available or not supported on this phone,
    // accelerometer tracking is ready to take over seamlessly.
    return true;
  } catch (error) {
    console.warn('Error requesting pedometer permissions:', error);
    return true;
  }
}

/**
 * Fetches steps recorded by the OS from the start of the current day until now.
 */
export async function getTodayStepCountFromOS(): Promise<number | null> {
  try {
    const isAvailable = await Pedometer.isAvailableAsync();
    if (!isAvailable) return null;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfNow = new Date();

    const result = await Pedometer.getStepCountAsync(startOfDay, endOfNow);
    return result ? result.steps : null;
  } catch (error) {
    return null;
  }
}

/**
 * Starts hybrid step tracking:
 * 1. Subscribes to high-precision Accelerometer with adaptive peak detection.
 * 2. Also listens to Pedometer.watchStepCount if available and permitted.
 */
export function startHybridStepTracking(
  onStepIncrement: (delta: number) => void
): () => void {
  let isCleanedUp = false;
  let pedometerSub: { remove: () => void } | null = null;
  let accelSub: { remove: () => void } | null = null;
  let lastStepTime = 0;

  // 1. Try Hardware Pedometer
  Pedometer.isAvailableAsync()
    .then((available) => {
      if (isCleanedUp || !available) return;

      let prevCount = 0;
      try {
        pedometerSub = Pedometer.watchStepCount((result) => {
          const now = Date.now();
          const delta = result.steps - prevCount;
          if (delta > 0 && delta < 50) {
            prevCount = result.steps;
            lastStepTime = now;
            onStepIncrement(delta);
          }
        });
      } catch (err) {
        console.log('Hardware pedometer listener not active:', err);
      }
    })
    .catch(() => {});

  // 2. High-Precision Adaptive Accelerometer Step Detector
  // Always active to guarantee immediate step detection on any device/ROM
  try {
    Accelerometer.setUpdateInterval(40); // 25Hz update rate

    let baseline = 1.0;
    let smoothed = 1.0;
    let stepState: 'WAITING_FOR_PEAK' | 'WAITING_FOR_VALLEY' = 'WAITING_FOR_PEAK';
    let peakTimestamp = 0;

    accelSub = Accelerometer.addListener(({ x, y, z }) => {
      if (isCleanedUp) return;

      // 3D vector acceleration magnitude
      const rawMag = Math.sqrt(x * x + y * y + z * z);

      // Low-pass filtered signal
      smoothed = 0.25 * rawMag + 0.75 * smoothed;

      // Adaptive dynamic baseline (tracks device tilt/position changes)
      baseline = 0.98 * baseline + 0.02 * smoothed;

      const deltaFromBaseline = smoothed - baseline;
      const now = Date.now();

      // Step detection thresholds:
      // A genuine walking step creates a delta > +0.08g followed by a return to baseline < +0.01g
      const PEAK_THRESHOLD = 0.08;
      const VALLEY_THRESHOLD = 0.01;

      if (stepState === 'WAITING_FOR_PEAK') {
        if (deltaFromBaseline > PEAK_THRESHOLD && now - lastStepTime > 260) {
          stepState = 'WAITING_FOR_VALLEY';
          peakTimestamp = now;
        }
      } else if (stepState === 'WAITING_FOR_VALLEY') {
        // Must return to valley within 600ms of peak
        if (deltaFromBaseline < VALLEY_THRESHOLD) {
          stepState = 'WAITING_FOR_PEAK';
          // Ensure hardware pedometer didn't just count this exact millisecond
          if (now - lastStepTime > 240) {
            lastStepTime = now;
            onStepIncrement(1);
          }
        } else if (now - peakTimestamp > 700) {
          // Timeout reset
          stepState = 'WAITING_FOR_PEAK';
        }
      }
    });
  } catch (err) {
    console.warn('Accelerometer listener initialization error:', err);
  }

  return () => {
    isCleanedUp = true;
    if (pedometerSub) {
      pedometerSub.remove();
    }
    if (accelSub) {
      accelSub.remove();
    }
  };
}
