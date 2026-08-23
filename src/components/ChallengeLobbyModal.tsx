import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  X,
  Share2,
  Users,
  Trophy,
  Coins,
  Play,
  UserPlus,
  Copy,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/apiClient';
import { socketService } from '../services/socketService';

interface ChallengeLobbyModalProps {
  visible: boolean;
  challengeId: string | null;
  onClose: () => void;
  onRaceStart: (challenge: any, participants: any[]) => void;
}

export const ChallengeLobbyModal: React.FC<ChallengeLobbyModalProps> = ({
  visible,
  challengeId,
  onClose,
  onRaceStart,
}) => {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [targetUsername, setTargetUsername] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  // Fetch challenge details & join Socket room
  useEffect(() => {
    if (!visible || !challengeId || !user) return;

    let isMounted = true;
    setIsLoading(true);

    const loadLobby = async () => {
      try {
        const res = await api.getChallengeDetails(challengeId);
        if (isMounted) {
          setChallenge(res.challenge);
          setParticipants(res.participants);
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Could not load challenge lobby.');
        onClose();
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadLobby();

    // Connect to Socket.io room for live lobby updates
    socketService.joinChallengeRoom(challengeId, user.id, user.username);

    const unsubParticipants = socketService.onParticipantsUpdate((data) => {
      if (isMounted) {
        setChallenge(data.challenge);
        setParticipants(data.participants);
      }
    });

    const unsubStarting = socketService.onChallengeStarting((data) => {
      // Race starting!
      onRaceStart(challenge, participants);
    });

    return () => {
      isMounted = false;
      unsubParticipants();
      unsubStarting();
    };
  }, [visible, challengeId, user]);

  const handleShareInvite = async () => {
    if (!challenge) return;
    try {
      await Share.share({
        message: `🏃 Join my Step Challenge "${challenge.title}" on WalkAPP! Goal: ${challenge.targetSteps.toLocaleString()} steps. Use Invite Code: ${challenge.inviteCode}`,
        title: challenge.title,
      });
    } catch (e) {}
  };

  const handleInviteUser = async () => {
    if (!targetUsername.trim() || !challenge) return;

    try {
      const res = await api.inviteUser(challenge.id, targetUsername.trim());
      Alert.alert('Success', res.message);
      setTargetUsername('');
      const updated = await api.getChallengeDetails(challenge.id);
      setParticipants(updated.participants);
    } catch (error: any) {
      Alert.alert('Invitation Failed', error.message || 'User could not be invited.');
    }
  };

  const handleStartChallenge = () => {
    if (!challenge || !user) return;
    if (challenge.creatorId !== user.id) {
      Alert.alert('Host Only', 'Only the challenge creator can start the race.');
      return;
    }

    setIsStarting(true);
    socketService.startChallengeRace(challenge.id, user.id);
  };

  const isHost = challenge?.creatorId === user?.id;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Trophy size={22} color="#2563EB" />
            <Text style={styles.headerTitle}>Challenge Lobby</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {isLoading || !challenge ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading Lobby...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Challenge Hero Header Card */}
            <View style={styles.heroCard}>
              <Text style={styles.challengeTitle}>{challenge.title}</Text>
              {challenge.description && (
                <Text style={styles.challengeDesc}>{challenge.description}</Text>
              )}

              <View style={styles.statsRow}>
                <View style={styles.statBadge}>
                  <Trophy size={14} color="#0284C7" />
                  <Text style={styles.statBadgeText}>
                    {challenge.targetSteps.toLocaleString()} Steps
                  </Text>
                </View>

                <View style={[styles.statBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                  <Coins size={14} color="#D97706" />
                  <Text style={[styles.statBadgeText, { color: '#92400E' }]}>
                    🪙 {challenge.rewardPoolCoins} Prize
                  </Text>
                </View>

                <View style={[styles.statBadge, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
                  <Users size={14} color="#475569" />
                  <Text style={[styles.statBadgeText, { color: '#334155' }]}>
                    {participants.length}/{challenge.maxPlayers} Players
                  </Text>
                </View>
              </View>
            </View>

            {/* QR Code & Invite Share Section */}
            <View style={styles.qrSection}>
              <Text style={styles.sectionTitle}>Scan QR Code to Join</Text>
              <View style={styles.qrWrapper}>
                <QRCode
                  value={`walkapp://challenge/${challenge.inviteCode}`}
                  size={150}
                  color="#0F172A"
                  backgroundColor="#FFFFFF"
                />
              </View>

              <View style={styles.codeRow}>
                <Text style={styles.codeLabel}>INVITE CODE:</Text>
                <Text style={styles.codeValue}>{challenge.inviteCode}</Text>
              </View>

              <TouchableOpacity style={styles.shareBtn} onPress={handleShareInvite} activeOpacity={0.8}>
                <Share2 size={16} color="#FFFFFF" />
                <Text style={styles.shareBtnText}>Share Invite Link</Text>
              </TouchableOpacity>
            </View>

            {/* Direct User Invitation Input */}
            <View style={styles.inviteUserSection}>
              <Text style={styles.sectionTitle}>Invite Friend by Username</Text>
              <View style={styles.inviteInputRow}>
                <TextInput
                  style={styles.inviteInput}
                  value={targetUsername}
                  onChangeText={setTargetUsername}
                  placeholder="e.g. sarah_runner"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.inviteSendBtn} onPress={handleInviteUser} activeOpacity={0.8}>
                  <UserPlus size={16} color="#FFFFFF" />
                  <Text style={styles.inviteSendBtnText}>Invite</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Joined Participants List */}
            <View style={styles.participantsSection}>
              <Text style={styles.sectionTitle}>
                Joined Runners ({participants.length}/{challenge.maxPlayers})
              </Text>

              <View style={styles.participantsList}>
                {participants.map((p, idx) => {
                  const isPlayerHost = p.userId === challenge.creatorId;
                  const isCurrent = p.userId === user?.id;

                  return (
                    <View key={p.id} style={styles.participantItem}>
                      <View style={styles.participantLeft}>
                        <View style={styles.avatarCircle}>
                          <Text style={styles.avatarText}>
                            {p.username.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.participantName}>
                            {p.username} {isCurrent && '(You)'}
                          </Text>
                          <Text style={styles.participantSub}>
                            {isPlayerHost ? '👑 Lobby Host' : '🏃 Ready to Race'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.readyBadge}>
                        <Sparkles size={12} color="#059669" />
                        <Text style={styles.readyText}>Ready</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        )}

        {/* Host Start Button / Waiting Banner */}
        {challenge && (
          <View style={styles.bottomBar}>
            {isHost ? (
              <TouchableOpacity
                style={[styles.startRaceBtn, isStarting && { opacity: 0.7 }]}
                onPress={handleStartChallenge}
                disabled={isStarting}
                activeOpacity={0.85}
              >
                {isStarting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                    <Text style={styles.startRaceBtnText}>START CHALLENGE RACE</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.waitingBanner}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.waitingText}>Waiting for host to start the race...</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 12,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  challengeTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  challengeDesc: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 5,
  },
  statBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  qrSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  qrWrapper: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
    marginBottom: 14,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  codeValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2563EB',
    letterSpacing: 2,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 8,
    width: '100%',
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  inviteUserSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  inviteInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inviteInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  inviteSendBtn: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  inviteSendBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  participantsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  participantsList: {
    gap: 10,
  },
  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  participantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  participantName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  participantSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  readyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  startRaceBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  startRaceBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  waitingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
  },
  waitingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8',
  },
});
