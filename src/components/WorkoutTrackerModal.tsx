import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import {
  Play,
  Pause,
  Square,
  Navigation,
  Flame,
  Footprints,
  Gauge,
  Timer,
  CheckCircle2,
  X,
} from 'lucide-react-native';
import { useSteps } from '../context/StepContext';
import { WorkoutSession } from '../types';
import {
  calculateHaversineDistanceKm,
  requestLocationPermissions,
  formatDuration,
  formatPace,
  LocationPoint,
} from '../services/gpsWorkoutService';
import { saveWorkoutSession } from '../db/database';
import { calculateCalories, getLocalDateString } from '../services/metricsCalculator';

interface WorkoutTrackerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const WorkoutTrackerModal: React.FC<WorkoutTrackerModalProps> = ({
  visible,
  onClose,
}) => {
  const { profile, addManualSteps } = useSteps();

  const [isActive, setIsActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [distanceKm, setDistanceKm] = useState<number>(0.0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number>(0.0);
  const [workoutSteps, setWorkoutSteps] = useState<number>(0);
  const [completedSummary, setCompletedSummary] = useState<WorkoutSession | null>(null);

  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const lastLocationRef = useRef<LocationPoint | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Timer interval when active and not paused
  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused]);

  // Start GPS Workout
  const handleStartWorkout = async () => {
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}

    setIsActive(true);
    setIsPaused(false);
    setDurationSeconds(0);
    setDistanceKm(0.0);
    setCurrentSpeedKmh(0.0);
    setWorkoutSteps(0);
    setCompletedSummary(null);
    lastLocationRef.current = null;
    startTimeRef.current = Date.now();

    // Subscribe to High-Accuracy GPS Position
    locationSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 2, // every 2 meters
      },
      (location) => {
        const { latitude, longitude, speed, accuracy } = location.coords;

        // Discard low-accuracy GPS jumps
        if (accuracy && accuracy > 30) return;

        const currentPoint: LocationPoint = {
          latitude,
          longitude,
          timestamp: location.timestamp,
          speed,
          accuracy,
        };

        if (lastLocationRef.current) {
          const deltaKm = calculateHaversineDistanceKm(
            lastLocationRef.current.latitude,
            lastLocationRef.current.longitude,
            latitude,
            longitude
          );

          // Discard unrealistic GPS jumps (> 40 km/h)
          if (deltaKm > 0.001 && deltaKm < 0.08) {
            setDistanceKm((prev) => {
              const updatedDist = Number((prev + deltaKm).toFixed(3));
              // Estimate steps from GPS distance and stride
              const strideMeters = (profile.strideLengthCm || 72) / 100;
              const estSteps = Math.round((updatedDist * 1000) / strideMeters);
              setWorkoutSteps(estSteps);
              return updatedDist;
            });
          }
        }

        // Live speed in km/h
        const speedKmh = Math.max(0, (speed || 0) * 3.6);
        setCurrentSpeedKmh(Number(speedKmh.toFixed(1)));

        lastLocationRef.current = currentPoint;
      }
    );
  };

  const handlePauseWorkout = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}
    setIsPaused(true);
    setCurrentSpeedKmh(0.0);
  };

  const handleResumeWorkout = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}
    setIsPaused(false);
  };

  const handleFinishWorkout = () => {
    if (locationSubRef.current) {
      locationSubRef.current.remove();
      locationSubRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const durationMins = durationSeconds / 60;
    const avgSpeed = durationMins > 0 ? Number(((distanceKm / durationMins) * 60).toFixed(1)) : 0;
    const pace = distanceKm > 0 ? durationMins / distanceKm : 0;
    const cals = calculateCalories(workoutSteps, profile);

    const session: WorkoutSession = {
      id: `workout_${Date.now()}`,
      startTime: startTimeRef.current,
      endTime: Date.now(),
      durationSeconds,
      distanceKm: Number(distanceKm.toFixed(2)),
      avgSpeedKmh: avgSpeed,
      currentSpeedKmh: 0,
      paceMinutesPerKm: pace,
      steps: workoutSteps,
      calories: cals,
      date: getLocalDateString(new Date()),
    };

    saveWorkoutSession(session);
    // Add workout steps to today's aggregate
    if (workoutSteps > 0) {
      addManualSteps(workoutSteps);
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}

    setIsActive(false);
    setIsPaused(false);
    setCompletedSummary(session);
  };

  const handleClose = () => {
    if (isActive) {
      Alert.alert(
        'Workout in Progress',
        'Do you want to discard this workout or continue recording?',
        [
          { text: 'Continue Recording', style: 'cancel' },
          {
            text: 'Discard Workout',
            style: 'destructive',
            onPress: () => {
              if (locationSubRef.current) locationSubRef.current.remove();
              if (timerRef.current) clearInterval(timerRef.current);
              setIsActive(false);
              onClose();
            },
          },
        ]
      );
    } else {
      setCompletedSummary(null);
      onClose();
    }
  };

  const currentPace = currentSpeedKmh > 0 ? 60 / currentSpeedKmh : 0;
  const currentCalories = calculateCalories(workoutSteps, profile);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Navigation size={22} color="#2563EB" />
            <Text style={styles.headerTitle}>GPS Outdoor Walk</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
            <X size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* COMPLETED WORKOUT SUMMARY VIEW */}
        {completedSummary ? (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryHeader}>
              <CheckCircle2 size={56} color="#10B981" />
              <Text style={styles.summaryTitle}>Workout Completed!</Text>
              <Text style={styles.summarySub}>Your walk was saved to your history.</Text>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardLabel}>DISTANCE</Text>
                <Text style={styles.summaryCardValue}>{completedSummary.distanceKm}</Text>
                <Text style={styles.summaryCardUnit}>km</Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardLabel}>DURATION</Text>
                <Text style={styles.summaryCardValue}>
                  {formatDuration(completedSummary.durationSeconds)}
                </Text>
                <Text style={styles.summaryCardUnit}>time</Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardLabel}>AVG SPEED</Text>
                <Text style={styles.summaryCardValue}>{completedSummary.avgSpeedKmh}</Text>
                <Text style={styles.summaryCardUnit}>km/h</Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardLabel}>CALORIES</Text>
                <Text style={styles.summaryCardValue}>{completedSummary.calories}</Text>
                <Text style={styles.summaryCardUnit}>kcal</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* LIVE WORKOUT HUD VIEW */
          <View style={styles.hudContainer}>
            {/* Status indicator */}
            <View style={styles.statusRow}>
              {isActive && (
                <View style={[styles.statusPill, isPaused ? styles.pausedPill : styles.recPill]}>
                  <View style={[styles.statusDot, isPaused && { backgroundColor: '#F59E0B' }]} />
                  <Text style={[styles.statusPillText, isPaused && { color: '#92400E' }]}>
                    {isPaused ? 'PAUSED' : 'GPS RECORDING'}
                  </Text>
                </View>
              )}
            </View>

            {/* Giant Distance Metric */}
            <View style={styles.mainMetricBlock}>
              <Text style={styles.mainMetricLabel}>DISTANCE (KM)</Text>
              <Text style={styles.mainMetricValue}>{distanceKm.toFixed(2)}</Text>
            </View>

            {/* Telemetry Grid */}
            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryCard}>
                <View style={styles.telemetryHeader}>
                  <Timer size={16} color="#64748B" />
                  <Text style={styles.telemetryLabel}>TIME</Text>
                </View>
                <Text style={styles.telemetryValue}>{formatDuration(durationSeconds)}</Text>
              </View>

              <View style={styles.telemetryCard}>
                <View style={styles.telemetryHeader}>
                  <Gauge size={16} color="#64748B" />
                  <Text style={styles.telemetryLabel}>SPEED</Text>
                </View>
                <Text style={styles.telemetryValue}>{currentSpeedKmh} km/h</Text>
              </View>

              <View style={styles.telemetryCard}>
                <View style={styles.telemetryHeader}>
                  <Footprints size={16} color="#64748B" />
                  <Text style={styles.telemetryLabel}>STEPS</Text>
                </View>
                <Text style={styles.telemetryValue}>{workoutSteps.toLocaleString()}</Text>
              </View>

              <View style={styles.telemetryCard}>
                <View style={styles.telemetryHeader}>
                  <Flame size={16} color="#64748B" />
                  <Text style={styles.telemetryLabel}>CALORIES</Text>
                </View>
                <Text style={styles.telemetryValue}>{currentCalories} kcal</Text>
              </View>
            </View>

            {/* Bottom Controls */}
            <View style={styles.controlArea}>
              {!isActive ? (
                <TouchableOpacity
                  style={styles.startBtn}
                  onPress={handleStartWorkout}
                  activeOpacity={0.8}
                >
                  <Play size={26} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.startBtnText}>START WALK</Text>
                </TouchableOpacity>
              ) : isPaused ? (
                <View style={styles.pausedControlRow}>
                  <TouchableOpacity
                    style={styles.resumeBtn}
                    onPress={handleResumeWorkout}
                    activeOpacity={0.8}
                  >
                    <Play size={22} color="#FFFFFF" fill="#FFFFFF" />
                    <Text style={styles.btnText}>Resume</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.finishBtn}
                    onPress={handleFinishWorkout}
                    activeOpacity={0.8}
                  >
                    <Square size={20} color="#FFFFFF" fill="#FFFFFF" />
                    <Text style={styles.btnText}>Finish & Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pauseBtn}
                  onPress={handlePauseWorkout}
                  activeOpacity={0.8}
                >
                  <Pause size={24} color="#0F172A" fill="#0F172A" />
                  <Text style={styles.pauseBtnText}>PAUSE</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: 48,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  statusRow: {
    alignItems: 'center',
    height: 30,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  recPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  pausedPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  mainMetricBlock: {
    alignItems: 'center',
    marginVertical: 20,
  },
  mainMetricLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  mainMetricValue: {
    fontSize: 76,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 30,
  },
  telemetryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    flex: 1,
    minWidth: '45%',
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  telemetryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  telemetryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  controlArea: {
    marginTop: 'auto',
  },
  startBtn: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    gap: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  pauseBtn: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    gap: 10,
  },
  pauseBtnText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  pausedControlRow: {
    flexDirection: 'row',
    gap: 12,
  },
  resumeBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    gap: 8,
  },
  finishBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    gap: 8,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  summaryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  summaryHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 14,
  },
  summarySub: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    marginBottom: 30,
  },
  summaryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  summaryCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryCardValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  summaryCardUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  doneBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
