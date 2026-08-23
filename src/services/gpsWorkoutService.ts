import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number | null; // in m/s
  accuracy: number | null;
}

/**
 * Calculates geographical distance between two GPS coordinates in kilometers using Haversine formula.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Requests Foreground Location permission for Strava-style outdoor workouts.
 */
export async function requestLocationPermissions(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === Location.PermissionStatus.GRANTED;
  } catch (error) {
    console.warn('Error requesting location permissions:', error);
    Alert.alert(
      'Location Permission Required',
      'WalkAPP needs GPS location access to track your outdoor walking route, live speed, and distance.'
    );
    return false;
  }
}

/**
 * Checks if location permission is currently granted.
 */
export async function checkLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === Location.PermissionStatus.GRANTED;
  } catch (_) {
    return false;
  }
}

/**
 * Formats duration in seconds into 'hh:mm:ss' or 'mm:ss'.
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Formats pace in minutes per km into friendly Strava format (e.g. 9'45" /km).
 */
export function formatPace(paceMinutesPerKm: number): string {
  if (!isFinite(paceMinutesPerKm) || paceMinutesPerKm <= 0 || paceMinutesPerKm > 60) {
    return "--'--\"";
  }

  const mins = Math.floor(paceMinutesPerKm);
  const secs = Math.round((paceMinutesPerKm - mins) * 60);
  return `${mins}'${String(secs).padStart(2, '0')}"`;
}
