import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Trophy, TrendingUp, Award, Zap, Activity, CalendarCheck } from 'lucide-react-native';
import { useSteps } from '../context/StepContext';
import { WeeklyBarChart } from '../components/WeeklyBarChart';
import { formatNumber, formatFriendlyDate } from '../services/metricsCalculator';

export const AnalyticsScreen: React.FC = () => {
  const { overallStats, weeklyData, profile, historyRecords } = useSteps();

  // Calculate 7-day average
  const total7DaySteps = weeklyData.reduce((acc, curr) => acc + curr.steps, 0);
  const average7DaySteps = Math.round(total7DaySteps / (weeklyData.length || 1));
  const daysGoalHitInWeek = weeklyData.filter((d) => d.steps >= d.goal && d.steps > 0).length;
  const weeklyCompletionRate = Math.round((daysGoalHitInWeek / (weeklyData.length || 7)) * 100);

  // Active hours total
  const totalActiveHours = (overallStats.totalActiveMinutes / 60).toFixed(1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics & Trends</Text>
        <Text style={styles.headerSubtitle}>Your walking habits and milestones</Text>
      </View>

      {/* Highlights Banner */}
      <View style={styles.highlightCard}>
        <View style={styles.highlightHeader}>
          <TrendingUp size={20} color="#2563EB" />
          <Text style={styles.highlightTitle}>7-Day Performance</Text>
        </View>

        <View style={styles.highlightMetrics}>
          <View style={styles.highlightItem}>
            <Text style={styles.highlightValue}>{formatNumber(average7DaySteps)}</Text>
            <Text style={styles.highlightLabel}>Daily Avg Steps</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.highlightItem}>
            <Text style={styles.highlightValue}>{weeklyCompletionRate}%</Text>
            <Text style={styles.highlightLabel}>Goal Success Rate</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.highlightItem}>
            <Text style={styles.highlightValue}>{daysGoalHitInWeek}/7</Text>
            <Text style={styles.highlightLabel}>Goals Met</Text>
          </View>
        </View>
      </View>

      {/* Weekly Breakdown Chart */}
      <WeeklyBarChart data={weeklyData} goal={profile.dailyGoal} />

      {/* Lifetime Achievements & Records */}
      <Text style={styles.sectionTitle}>Lifetime Milestones</Text>
      <View style={styles.recordsList}>
        <View style={styles.recordItem}>
          <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
            <Trophy size={20} color="#D97706" />
          </View>
          <View style={styles.recordContent}>
            <Text style={styles.recordLabel}>Best Single Day</Text>
            <Text style={styles.recordValue}>
              {overallStats.bestDay
                ? `${formatNumber(overallStats.bestDay.steps)} steps`
                : 'No data yet'}
            </Text>
            {overallStats.bestDay && (
              <Text style={styles.recordSub}>
                {formatFriendlyDate(overallStats.bestDay.date)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.recordItem}>
          <View style={[styles.iconBox, { backgroundColor: '#FFEDD5' }]}>
            <Zap size={20} color="#EA580C" />
          </View>
          <View style={styles.recordContent}>
            <Text style={styles.recordLabel}>Longest Streak</Text>
            <Text style={styles.recordValue}>
              {overallStats.longestStreak} consecutive days
            </Text>
            <Text style={styles.recordSub}>
              Current streak: {overallStats.currentStreak} days
            </Text>
          </View>
        </View>

        <View style={styles.recordItem}>
          <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
            <Award size={20} color="#0284C7" />
          </View>
          <View style={styles.recordContent}>
            <Text style={styles.recordLabel}>Total Lifetime Steps</Text>
            <Text style={styles.recordValue}>
              {formatNumber(overallStats.totalSteps)} steps
            </Text>
            <Text style={styles.recordSub}>
              {overallStats.totalDistanceKm} km total distance covered
            </Text>
          </View>
        </View>

        <View style={styles.recordItem}>
          <View style={[styles.iconBox, { backgroundColor: '#EDE9FE' }]}>
            <Activity size={20} color="#7C3AED" />
          </View>
          <View style={styles.recordContent}>
            <Text style={styles.recordLabel}>Total Calories Burned</Text>
            <Text style={styles.recordValue}>
              {formatNumber(overallStats.totalCalories)} kcal
            </Text>
            <Text style={styles.recordSub}>{totalActiveHours} hours of active walking</Text>
          </View>
        </View>
      </View>
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
    marginBottom: 16,
    marginTop: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  highlightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  highlightMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  highlightItem: {
    alignItems: 'center',
    flex: 1,
  },
  highlightValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  highlightLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 18,
    marginBottom: 12,
  },
  recordsList: {
    gap: 10,
  },
  recordItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  recordContent: {
    flex: 1,
  },
  recordLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  recordValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  recordSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
});
