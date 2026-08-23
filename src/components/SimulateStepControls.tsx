import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Play, Plus, RefreshCw, Sparkles, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useSteps } from '../context/StepContext';

export const SimulateStepControls: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const { addManualSteps, seedDemoData, resetAllAppData, profile } = useSteps();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.titleRow}>
          <Sparkles size={16} color="#4F46E5" />
          <Text style={styles.title}>Developer & Testing Tools</Text>
        </View>
        {expanded ? (
          <ChevronUp size={18} color="#64748B" />
        ) : (
          <ChevronDown size={18} color="#64748B" />
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          <Text style={styles.helperText}>
            Use these controls to test step milestones, streak calculations, and charts without walking.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.pillButton}
              onPress={() => addManualSteps(500)}
              activeOpacity={0.7}
            >
              <Plus size={14} color="#4F46E5" />
              <Text style={styles.pillText}>+500 Steps</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pillButton}
              onPress={() => addManualSteps(2000)}
              activeOpacity={0.7}
            >
              <Plus size={14} color="#4F46E5" />
              <Text style={styles.pillText}>+2,000 Steps</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pillButton, styles.goalPill]}
              onPress={() => addManualSteps(profile.dailyGoal)}
              activeOpacity={0.7}
            >
              <Play size={14} color="#059669" />
              <Text style={[styles.pillText, { color: '#059669' }]}>Complete Goal</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={seedDemoData}
              activeOpacity={0.7}
            >
              <Sparkles size={14} color="#2563EB" />
              <Text style={styles.actionBtnText}>Seed 14-Day Sample History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.resetBtn]}
              onPress={resetAllAppData}
              activeOpacity={0.7}
            >
              <RefreshCw size={14} color="#DC2626" />
              <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Reset All Data</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3730A3',
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  helperText: {
    fontSize: 12,
    color: '#4338CA',
    marginBottom: 10,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    gap: 4,
  },
  goalPill: {
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 6,
  },
  resetBtn: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
});
