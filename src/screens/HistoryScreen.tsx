import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { CheckCircle2, CircleDashed, Calendar, Sparkles, MapPin, Flame, Clock } from 'lucide-react-native';
import { useSteps } from '../context/StepContext';
import { DailyStepRecord } from '../types';
import { formatFriendlyDate, formatNumber } from '../services/metricsCalculator';

export const HistoryScreen: React.FC = () => {
  const { historyRecords, profile, seedDemoData } = useSteps();

  const renderItem = ({ item }: { item: DailyStepRecord }) => {
    const isGoalMet = item.steps >= item.goal;
    const progressPercent = Math.min(100, Math.round((item.steps / (item.goal || 1)) * 100));

    return (
      <View style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <View style={styles.dateBlock}>
            <Calendar size={16} color="#64748B" />
            <Text style={styles.dateText}>{formatFriendlyDate(item.date)}</Text>
            <Text style={styles.rawDateText}>({item.date})</Text>
          </View>

          {isGoalMet ? (
            <View style={styles.achievedBadge}>
              <CheckCircle2 size={14} color="#059669" />
              <Text style={styles.achievedText}>Goal Met</Text>
            </View>
          ) : (
            <View style={styles.incompleteBadge}>
              <CircleDashed size={14} color="#94A3B8" />
              <Text style={styles.incompleteText}>{progressPercent}%</Text>
            </View>
          )}
        </View>

        <View style={styles.stepCountRow}>
          <Text style={styles.stepCountText}>{formatNumber(item.steps)}</Text>
          <Text style={styles.stepCountSub}> / {formatNumber(item.goal)} steps</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: isGoalMet ? '#10B981' : '#38BDF8',
              },
            ]}
          />
        </View>

        {/* Detailed Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MapPin size={13} color="#0284C7" />
            <Text style={styles.statText}>{item.distanceKm} km</Text>
          </View>
          <View style={styles.statItem}>
            <Flame size={13} color="#EA580C" />
            <Text style={styles.statText}>{formatNumber(item.calories)} kcal</Text>
          </View>
          <View style={styles.statItem}>
            <Clock size={13} color="#7C3AED" />
            <Text style={styles.statText}>{item.activeMinutes} mins</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History Log</Text>
        <Text style={styles.subtitle}>
          {historyRecords.length} recorded {historyRecords.length === 1 ? 'day' : 'days'}
        </Text>
      </View>

      {historyRecords.length === 0 ? (
        <View style={styles.emptyState}>
          <Calendar size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No Recorded History Yet</Text>
          <Text style={styles.emptySubtitle}>
            Your daily step logs will automatically be cataloged here.
          </Text>
          <TouchableOpacity style={styles.seedButton} onPress={seedDemoData} activeOpacity={0.8}>
            <Sparkles size={16} color="#FFFFFF" />
            <Text style={styles.seedButtonText}>Load Demo History</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={historyRecords}
          keyExtractor={(item) => item.date}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 40,
    gap: 12,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  rawDateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  achievedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  achievedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  incompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  incompleteText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  stepCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  stepCountText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  stepCountSub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  seedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  seedButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
