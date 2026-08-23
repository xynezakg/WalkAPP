import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import {
  Target,
  User,
  Ruler,
  Weight,
  Flame,
  Check,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Activity,
  LogOut,
  Coins,
} from 'lucide-react-native';
import { useSteps } from '../context/StepContext';
import { useAuth } from '../context/AuthContext';
import {
  getEstimatedStrideLengthCm,
  calculateCalories,
  formatNumber,
} from '../services/metricsCalculator';

const GOAL_PRESETS = [5000, 8000, 10000, 12000, 15000];

export const ProfileScreen: React.FC = () => {
  const {
    profile,
    updateProfile,
    resetAllAppData,
    seedDemoData,
    healthConnectStatus,
    syncWithHealthConnect,
    connectHealthConnect,
    lastSyncTime,
    isSyncing,
  } = useSteps();

  const [heightInput, setHeightInput] = useState(String(profile.heightCm));
  const [weightInput, setWeightInput] = useState(String(profile.weightKg));
  const [customGoalInput, setCustomGoalInput] = useState(String(profile.dailyGoal));
  const [strideInput, setStrideInput] = useState(String(profile.strideLengthCm || 72));
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(profile.gender);
  const [stepLengthAuto, setStepLengthAuto] = useState<boolean>(profile.stepLengthAuto);

  const estimatedStride = getEstimatedStrideLengthCm(
    Number(heightInput) || 175,
    gender
  );
  const sample10kCalories = calculateCalories(10000, {
    ...profile,
    weightKg: Number(weightInput) || 70,
  });

  const handleSaveBiometrics = () => {
    const h = Math.max(50, Math.min(250, Number(heightInput) || 175));
    const w = Math.max(20, Math.min(300, Number(weightInput) || 70));
    const g = Math.max(1000, Math.min(100000, Number(customGoalInput) || 10000));
    const s = Math.max(30, Math.min(150, Number(strideInput) || 72));

    updateProfile({
      heightCm: h,
      weightKg: w,
      dailyGoal: g,
      gender,
      stepLengthAuto,
      strideLengthCm: s,
    });

    Alert.alert('Saved', 'Your profile and daily goal have been updated.');
  };

  const handleSelectGoal = (goal: number) => {
    setCustomGoalInput(String(goal));
    updateProfile({ dailyGoal: goal });
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Activity Data',
      'Are you sure you want to delete all historical step records? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: () => {
            resetAllAppData();
            Alert.alert('Reset Complete', 'All step history has been cleared.');
          },
        },
      ]
    );
  };

  const { user, logout } = useAuth();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Settings & Profile</Text>
        <Text style={styles.subtitle}>Calibrate your metrics & account</Text>
      </View>

      {/* User Account Card */}
      {user && (
        <View style={styles.card}>
          <View style={styles.accountCardRow}>
            <View style={styles.accountLeft}>
              <View style={styles.avatarCircleBig}>
                <Text style={styles.avatarBigText}>{user.username.charAt(0).toUpperCase()}</Text>
              </View>
              <View>
                <View style={styles.nameRow}>
                  <Text style={styles.accountUsername}>{user.username}</Text>
                  {user.role === 'admin' && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>ADMIN</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.accountEmail}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.walletBox}>
              <Coins size={16} color="#D97706" />
              <Text style={styles.walletText}>🪙 {user.coinsBalance}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
            <LogOut size={16} color="#DC2626" />
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Daily Goal Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Target size={20} color="#2563EB" />
          <Text style={styles.cardTitle}>Daily Step Goal</Text>
        </View>

        <Text style={styles.helperText}>Select a target or enter a custom step goal:</Text>
        <View style={styles.presetRow}>
          {GOAL_PRESETS.map((preset) => {
            const isSelected = profile.dailyGoal === preset;
            return (
              <TouchableOpacity
                key={preset}
                style={[styles.presetButton, isSelected && styles.presetButtonActive]}
                onPress={() => handleSelectGoal(preset)}
                activeOpacity={0.7}
              >
                <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>
                  {preset >= 1000 ? `${preset / 1000}k` : preset}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Custom Target (steps)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={customGoalInput}
              onChangeText={setCustomGoalInput}
              onBlur={handleSaveBiometrics}
              placeholder="e.g. 10000"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>
      </View>

      {/* Biometrics for Accurate Calculations */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <User size={20} color="#7C3AED" />
          <Text style={styles.cardTitle}>Body Metrics & Calibration</Text>
        </View>
        <Text style={styles.helperText}>
          Accurate height and weight ensure precise distance and calorie burn formulas.
        </Text>

        {/* Gender selector */}
        <Text style={styles.inputLabel}>Gender</Text>
        <View style={styles.genderRow}>
          {(['male', 'female', 'other'] as const).map((g) => {
            const isSelected = gender === g;
            return (
              <TouchableOpacity
                key={g}
                style={[styles.genderBtn, isSelected && styles.genderBtnActive]}
                onPress={() => setGender(g)}
                activeOpacity={0.7}
              >
                <Text style={[styles.genderBtnText, isSelected && styles.genderBtnTextActive]}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.twoColumn}>
          <View style={styles.columnItem}>
            <Text style={styles.inputLabel}>Height (cm)</Text>
            <View style={styles.inputWrapper}>
              <Ruler size={16} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInputWithIcon}
                keyboardType="numeric"
                value={heightInput}
                onChangeText={setHeightInput}
                placeholder="175"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <View style={styles.columnItem}>
            <Text style={styles.inputLabel}>Weight (kg)</Text>
            <View style={styles.inputWrapper}>
              <Weight size={16} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInputWithIcon}
                keyboardType="numeric"
                value={weightInput}
                onChangeText={setWeightInput}
                placeholder="70"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>
        </View>

        {/* Auto Stride Toggle */}
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchTitle}>Auto Calculate Stride Length</Text>
            <Text style={styles.switchSubtitle}>
              Estimated: {estimatedStride} cm based on your height
            </Text>
          </View>
          <Switch
            value={stepLengthAuto}
            onValueChange={setStepLengthAuto}
            trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
            thumbColor={stepLengthAuto ? '#2563EB' : '#F1F5F9'}
          />
        </View>

        {!stepLengthAuto && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Custom Stride Length (cm)</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={strideInput}
                onChangeText={setStrideInput}
                placeholder="72"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>
        )}

        {/* Calibration Preview Info */}
        <View style={styles.previewBox}>
          <Flame size={16} color="#EA580C" />
          <Text style={styles.previewText}>
            At your weight, 10,000 steps burns approx{' '}
            <Text style={styles.previewBold}>{formatNumber(sample10kCalories)} kcal</Text>.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveBiometrics}
          activeOpacity={0.8}
        >
          <Check size={18} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Save Biometrics</Text>
        </TouchableOpacity>
      </View>

      {/* Privacy & System */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ShieldCheck size={20} color="#059669" />
          <Text style={styles.cardTitle}>Privacy & Offline Storage</Text>
        </View>
        <Text style={styles.helperText}>
          WalkAPP is completely offline and privacy-first. All your step data, calorie calculations,
          and history are stored locally on your device in SQLite. No tracking or telemetry is sent.
        </Text>
      </View>

      {/* Samsung Health & Google Health Connect */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Activity size={20} color="#2563EB" />
          <Text style={styles.cardTitle}>Samsung Health & Health Connect</Text>
        </View>
        <Text style={styles.helperText}>
          Synchronize 24/7 background steps directly from Samsung Health, Google Fit, and your phone's
          hardware coprocessor without draining battery.
        </Text>

        <View style={styles.syncStatusBox}>
          <View style={styles.syncStatusRow}>
            <View
              style={[
                styles.syncStatusDot,
                {
                  backgroundColor:
                    healthConnectStatus.isAvailable && healthConnectStatus.hasPermissions
                      ? '#10B981'
                      : '#94A3B8',
                },
              ]}
            />
            <Text style={styles.syncStatusTitle}>
              {healthConnectStatus.isAvailable && healthConnectStatus.hasPermissions
                ? 'Connected & Syncing'
                : 'Not Connected'}
            </Text>
          </View>
          {lastSyncTime && (
            <Text style={styles.lastSyncText}>
              Last synced: {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>

        <View style={styles.syncActionRow}>
          {healthConnectStatus.isAvailable && healthConnectStatus.hasPermissions ? (
            <TouchableOpacity
              style={[styles.syncButton, isSyncing && { opacity: 0.7 }]}
              onPress={() => syncWithHealthConnect()}
              disabled={isSyncing}
              activeOpacity={0.8}
            >
              <RotateCcw size={16} color="#FFFFFF" />
              <Text style={styles.syncButtonText}>
                {isSyncing ? 'Syncing Steps...' : 'Sync Now'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.connectButton}
              onPress={() => connectHealthConnect()}
              activeOpacity={0.8}
            >
              <Text style={styles.connectButtonText}>Connect Samsung Health</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsTitle}>💡 How Samsung Health syncs:</Text>
          <Text style={styles.instructionsText}>
            1. Open Samsung Health app on your phone.{'\n'}
            2. Go to Settings → Health Connect → App permissions.{'\n'}
            3. Tap 'Allow all' so Samsung Health shares steps with Health Connect.
          </Text>
        </View>
      </View>

      {/* Danger Zone */}
      <View style={[styles.card, styles.dangerCard]}>
        <View style={styles.cardHeader}>
          <AlertTriangle size={20} color="#DC2626" />
          <Text style={[styles.cardTitle, { color: '#DC2626' }]}>Data Management</Text>
        </View>
        <Text style={styles.helperText}>Clear all historical records or load mock sample data.</Text>

        <View style={styles.dangerRow}>
          <TouchableOpacity
            style={styles.seedDemoBtn}
            onPress={seedDemoData}
            activeOpacity={0.7}
          >
            <Text style={styles.seedDemoText}>Load 14-Day Demo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetBtn}
            onPress={handleResetData}
            activeOpacity={0.7}
          >
            <RotateCcw size={16} color="#DC2626" />
            <Text style={styles.resetBtnText}>Clear History</Text>
          </TouchableOpacity>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  dangerCard: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  helperText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 14,
  },
  presetButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  presetText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  presetTextActive: {
    color: '#FFFFFF',
  },
  inputGroup: {
    marginTop: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    height: 46,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  textInputWithIcon: {
    height: 46,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 10,
  },
  columnItem: {
    flex: 1,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  genderBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  genderBtnActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  genderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  genderBtnTextActive: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 6,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  switchSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    gap: 8,
    marginTop: 10,
    marginBottom: 14,
  },
  previewText: {
    fontSize: 12,
    color: '#9A3412',
    flex: 1,
  },
  previewBold: {
    fontWeight: '700',
    color: '#C2410C',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  dangerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  seedDemoBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  seedDemoText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  resetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 6,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  syncStatusBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  syncStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  lastSyncText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    marginLeft: 18,
  },
  syncActionRow: {
    marginBottom: 12,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  connectButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 12,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  instructionsBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  instructionsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 11,
    color: '#1E3A8A',
    lineHeight: 16,
  },
  accountCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarCircleBig: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBigText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E40AF',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountUsername: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  adminBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#7C3AED',
  },
  accountEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  walletBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  walletText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#92400E',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
});
