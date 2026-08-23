import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { MapPin, Flame, Clock, Trophy, Footprints, Navigation } from 'lucide-react-native';
import { useSteps } from '../context/StepContext';
import { ProgressRing } from '../components/ProgressRing';
import { StatCard } from '../components/StatCard';
import { WeeklyBarChart } from '../components/WeeklyBarChart';
import { PermissionBanner } from '../components/PermissionBanner';
import { SimulateStepControls } from '../components/SimulateStepControls';
import { WorkoutTrackerModal } from '../components/WorkoutTrackerModal';
import { formatFriendlyDate, formatNumber } from '../services/metricsCalculator';

export const HomeScreen: React.FC = () => {
  const {
    todayRecord,
    profile,
    overallStats,
    weeklyData,
    trackingStatus,
    healthConnectStatus,
    syncWithHealthConnect,
    isSyncing,
    refreshData,
    isLoading,
  } = useSteps();

  const remainingSteps = Math.max(0, profile.dailyGoal - todayRecord.steps);
  const isGoalAchieved = todayRecord.steps >= profile.dailyGoal;

  const handlePullRefresh = () => {
    if (healthConnectStatus.isAvailable && healthConnectStatus.hasPermissions) {
      syncWithHealthConnect();
    } else {
      refreshData();
    }
  };

  const [workoutModalVisible, setWorkoutModalVisible] = useState<boolean>(false);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading || isSyncing}
          onRefresh={handlePullRefresh}
          colors={['#2563EB']}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateText}>{formatFriendlyDate(todayRecord.date)}</Text>
          <Text style={styles.greetingText}>Daily Activity</Text>
        </View>
        <View style={styles.sensorBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.sensorBadgeText}>
            {healthConnectStatus.isAvailable && healthConnectStatus.hasPermissions
              ? 'Samsung Health Sync'
              : trackingStatus.trackingMode === 'hardware'
              ? 'Hardware Sensor'
              : 'Motion Sensor Active'}
          </Text>
        </View>
      </View>

      {/* Strava-Style Outdoor Walk Hero Button */}
      <TouchableOpacity
        style={styles.gpsHeroCard}
        onPress={() => setWorkoutModalVisible(true)}
        activeOpacity={0.85}
      >
        <View style={styles.gpsHeroContent}>
          <View style={styles.gpsIconCircle}>
            <MapPin size={22} color="#EA580C" />
          </View>
          <View>
            <Text style={styles.gpsHeroTitle}>Record Outdoor Walk</Text>
            <Text style={styles.gpsHeroSub}>Strava-style GPS route, live speed & pace</Text>
          </View>
        </View>
        <View style={styles.gpsStartPill}>
          <Text style={styles.gpsStartPillText}>START</Text>
        </View>
      </TouchableOpacity>

      {/* Central Progress Ring */}
      <View style={styles.ringCard}>
        <ProgressRing
          currentSteps={todayRecord.steps}
          goalSteps={profile.dailyGoal}
          streak={overallStats.currentStreak}
        />

        <View style={styles.remainingBanner}>
          <Text style={styles.remainingText}>
            {isGoalAchieved
              ? '🎉 Fantastic! You hit your daily step goal!'
              : `${formatNumber(remainingSteps)} steps left to reach your goal`}
          </Text>
        </View>
      </View>

      {/* GPS Workout Modal */}
      <WorkoutTrackerModal
        visible={workoutModalVisible}
        onClose={() => setWorkoutModalVisible(false)}
      />

      {/* Metric Stat Cards Grid */}
      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <StatCard
            icon={<MapPin size={20} color="#0284C7" />}
            title="Distance"
            value={todayRecord.distanceKm}
            unit="km"
            iconBgColor="#E0F2FE"
          />
          <StatCard
            icon={<Flame size={20} color="#EA580C" />}
            title="Calories"
            value={formatNumber(todayRecord.calories)}
            unit="kcal"
            iconBgColor="#FFEDD5"
          />
        </View>

        <View style={styles.gridRow}>
          <StatCard
            icon={<Clock size={20} color="#7C3AED" />}
            title="Active Time"
            value={todayRecord.activeMinutes}
            unit="mins"
            iconBgColor="#EDE9FE"
          />
          <StatCard
            icon={<Trophy size={20} color="#059669" />}
            title="Current Streak"
            value={overallStats.currentStreak}
            unit="days"
            badge={overallStats.longestStreak > 0 ? `Best: ${overallStats.longestStreak}d` : undefined}
            iconBgColor="#D1FAE5"
          />
        </View>
      </View>

      {/* 7-Day Weekly Chart */}
      <WeeklyBarChart data={weeklyData} goal={profile.dailyGoal} />

      {/* Developer & Test Simulation Drawer */}
      <SimulateStepControls />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  greetingText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  sensorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  sensorBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  gpsHeroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 16,
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  gpsHeroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  gpsIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsHeroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  gpsHeroSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  gpsStartPill: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  gpsStartPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  ringCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  remainingBanner: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  remainingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
  grid: {
    marginVertical: 6,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
