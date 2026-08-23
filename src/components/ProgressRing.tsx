import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Flame, CheckCircle2 } from 'lucide-react-native';
import { formatNumber } from '../services/metricsCalculator';

interface ProgressRingProps {
  currentSteps: number;
  goalSteps: number;
  size?: number;
  strokeWidth?: number;
  streak?: number;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  currentSteps,
  goalSteps,
  size = 260,
  strokeWidth = 20,
  streak = 0,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = goalSteps > 0 ? Math.min(currentSteps / goalSteps, 1) : 0;
  const strokeDashoffset = circumference - progressRatio * circumference;
  const percent = Math.min(100, Math.round((currentSteps / (goalSteps || 1)) * 100));
  const isGoalAchieved = currentSteps >= goalSteps && goalSteps > 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#38BDF8" />
            <Stop offset="50%" stopColor="#0284C7" />
            <Stop offset="100%" stopColor="#2563EB" />
          </LinearGradient>
          <LinearGradient id="goalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#10B981" />
            <Stop offset="100%" stopColor="#059669" />
          </LinearGradient>
        </Defs>

        {/* Background Track Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Dynamic Progress Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isGoalAchieved ? 'url(#goalGradient)' : 'url(#progressGradient)'}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Center Metrics Content */}
      <View style={styles.centerContent}>
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Flame size={14} color="#F97316" />
            <Text style={styles.streakText}>{streak} day streak</Text>
          </View>
        )}

        <Text style={styles.stepsValue}>{formatNumber(currentSteps)}</Text>
        <Text style={styles.stepsLabel}>STEPS</Text>

        <View style={styles.goalContainer}>
          {isGoalAchieved ? (
            <View style={styles.goalAchievedRow}>
              <CheckCircle2 size={16} color="#059669" />
              <Text style={styles.goalAchievedText}>Goal Hit! ({percent}%)</Text>
            </View>
          ) : (
            <Text style={styles.goalText}>
              Goal: {formatNumber(goalSteps)} ({percent}%)
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 12,
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
    marginLeft: 3,
  },
  stepsValue: {
    fontSize: 38,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  stepsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1.5,
    marginTop: -2,
  },
  goalContainer: {
    marginTop: 6,
  },
  goalText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  goalAchievedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  goalAchievedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 4,
  },
});
