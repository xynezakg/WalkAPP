import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Trophy,
  Users,
  Eye,
  Lock,
  Coins,
  Sparkles,
  Check,
  Footprints,
} from 'lucide-react-native';
import { api } from '../services/apiClient';

interface CreateChallengeModalProps {
  visible: boolean;
  onClose: () => void;
  onChallengeCreated: (challenge: any) => void;
}

const STEP_PRESETS = [1000, 3000, 5000, 10000];
const PLAYER_PRESETS = [2, 4, 8, 16];
const REWARD_PRESETS = [50, 100, 200, 500];

export const CreateChallengeModal: React.FC<CreateChallengeModalProps> = ({
  visible,
  onClose,
  onChallengeCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetSteps, setTargetSteps] = useState<number>(3000);
  const [customStepsInput, setCustomStepsInput] = useState('3000');
  const [maxPlayers, setMaxPlayers] = useState<number>(8);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [rewardPoolCoins, setRewardPoolCoins] = useState<number>(100);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectSteps = (steps: number) => {
    setTargetSteps(steps);
    setCustomStepsInput(String(steps));
  };

  const handleCustomStepsChange = (val: string) => {
    setCustomStepsInput(val);
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      setTargetSteps(num);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a catchy title for your challenge.');
      return;
    }

    if (targetSteps <= 0) {
      Alert.alert('Invalid Target', 'Please enter a valid step target.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.createChallenge({
        title: title.trim(),
        description: description.trim() || undefined,
        targetSteps,
        maxPlayers,
        visibility,
        rewardPoolCoins,
      });

      onChallengeCreated(res.challenge);
      onClose();
    } catch (error: any) {
      Alert.alert('Creation Failed', error.message || 'Could not create challenge.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Trophy size={22} color="#2563EB" />
              <Text style={styles.headerTitle}>Create Step Challenge</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Title & Description */}
            <View style={styles.section}>
              <Text style={styles.label}>Challenge Title</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Weekend 5K Sprint 🏆"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Tell friends what this challenge is about..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Target Steps */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Footprints size={16} color="#0284C7" />
                <Text style={styles.label}>Step Goal Target</Text>
              </View>
              <View style={styles.presetRow}>
                {STEP_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetBtn, targetSteps === preset && styles.presetBtnActive]}
                    onPress={() => handleSelectSteps(preset)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.presetText, targetSteps === preset && styles.presetTextActive]}
                    >
                      {preset >= 1000 ? `${preset / 1000}k` : preset}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={customStepsInput}
                  onChangeText={handleCustomStepsChange}
                  placeholder="Custom step target"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Max Players */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Users size={16} color="#7C3AED" />
                <Text style={styles.label}>Player Capacity</Text>
              </View>
              <View style={styles.presetRow}>
                {PLAYER_PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.presetBtn, maxPlayers === p && styles.presetBtnActive]}
                    onPress={() => setMaxPlayers(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.presetText, maxPlayers === p && styles.presetTextActive]}>
                      {p} players
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Visibility Toggle */}
            <View style={styles.section}>
              <Text style={styles.label}>Lobby Visibility</Text>
              <View style={styles.visibilityRow}>
                <TouchableOpacity
                  style={[styles.visibilityBtn, visibility === 'public' && styles.visibilityBtnActive]}
                  onPress={() => setVisibility('public')}
                  activeOpacity={0.7}
                >
                  <Eye size={18} color={visibility === 'public' ? '#2563EB' : '#64748B'} />
                  <View>
                    <Text
                      style={[
                        styles.visibilityTitle,
                        visibility === 'public' && styles.visibilityTitleActive,
                      ]}
                    >
                      Public
                    </Text>
                    <Text style={styles.visibilitySub}>Visible in challenge feed</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.visibilityBtn, visibility === 'private' && styles.visibilityBtnActive]}
                  onPress={() => setVisibility('private')}
                  activeOpacity={0.7}
                >
                  <Lock size={18} color={visibility === 'private' ? '#2563EB' : '#64748B'} />
                  <View>
                    <Text
                      style={[
                        styles.visibilityTitle,
                        visibility === 'private' && styles.visibilityTitleActive,
                      ]}
                    >
                      Private
                    </Text>
                    <Text style={styles.visibilitySub}>Invite code or QR only</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Reward Pool Coins */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Coins size={16} color="#D97706" />
                <Text style={styles.label}>Prize Pool (Coins)</Text>
              </View>
              <View style={styles.presetRow}>
                {REWARD_PRESETS.map((coins) => (
                  <TouchableOpacity
                    key={coins}
                    style={[styles.presetBtn, rewardPoolCoins === coins && styles.presetBtnActive]}
                    onPress={() => setRewardPoolCoins(coins)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        rewardPoolCoins === coins && styles.presetTextActive,
                      ]}
                    >
                      🪙 {coins}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.createBtn, isLoading && { opacity: 0.7 }]}
            onPress={handleCreate}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Sparkles size={18} color="#FFFFFF" />
                <Text style={styles.createBtnText}>Create & Open Lobby</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  textArea: {
    height: 70,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  presetBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
  },
  presetBtnActive: {
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
  inputWrapper: {
    marginTop: 4,
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  visibilityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  visibilityBtnActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  visibilityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  visibilityTitleActive: {
    color: '#2563EB',
  },
  visibilitySub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  createBtn: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    marginTop: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
