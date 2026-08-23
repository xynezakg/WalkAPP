import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Trophy,
  Plus,
  QrCode,
  Coins,
  Users,
  Eye,
  Lock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Footprints,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/apiClient';
import { CreateChallengeModal } from '../components/CreateChallengeModal';
import { QRScannerModal } from '../components/QRScannerModal';
import { ChallengeLobbyModal } from '../components/ChallengeLobbyModal';
import { LiveRaceModal } from '../components/LiveRaceModal';
import { PostRaceCeremonyModal } from '../components/PostRaceCeremonyModal';

interface ChallengesScreenProps {
  onOpenAdmin?: () => void;
}

export const ChallengesScreen: React.FC<ChallengesScreenProps> = ({ onOpenAdmin }) => {
  const { user, isAdmin, refreshUserProfile } = useAuth();

  const [publicChallenges, setPublicChallenges] = useState<any[]>([]);
  const [userChallenges, setUserChallenges] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Modals state
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [scannerModalVisible, setScannerModalVisible] = useState<boolean>(false);
  const [activeLobbyChallengeId, setActiveLobbyChallengeId] = useState<string | null>(null);
  const [activeRaceData, setActiveRaceData] = useState<{ challenge: any; participants: any[] } | null>(null);
  const [ceremonyData, setCeremonyData] = useState<{ challenge: any; participants: any[]; myRank?: number } | null>(null);

  const loadChallenges = useCallback(async () => {
    try {
      const [pubRes, userRes] = await Promise.all([
        api.getPublicChallenges(),
        api.getUserActiveChallenges(),
      ]);
      setPublicChallenges(pubRes.challenges);
      setUserChallenges(userRes.challenges);
    } catch (e) {
      console.log('Error loading challenges:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadChallenges(), refreshUserProfile()]);
  };

  const handleOpenLobby = (challengeId: string) => {
    setActiveLobbyChallengeId(challengeId);
  };

  const handleJoinPublic = async (challengeId: string) => {
    try {
      const res = await api.joinChallenge(challengeId);
      setActiveLobbyChallengeId(res.challengeId);
      loadChallenges();
    } catch (error: any) {
      Alert.alert('Could Not Join', error.message || 'Lobby is full or completed.');
    }
  };

  const handleRaceStart = (challenge: any, participants: any[]) => {
    setActiveLobbyChallengeId(null);
    setActiveRaceData({ challenge, participants });
  };

  const handleRaceFinished = (data: { challenge: any; participants: any[]; myRank?: number }) => {
    setActiveRaceData(null);
    setCeremonyData(data);
    loadChallenges();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#2563EB']} />}
      >
        {/* User Header & Coin Wallet */}
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.greetingText}>Hello, {user?.username} 👋</Text>
            <Text style={styles.subGreeting}>Step Challenges & Live Races</Text>
          </View>

          <View style={styles.coinWalletPill}>
            <Coins size={18} color="#D97706" />
            <Text style={styles.coinWalletText}>🪙 {user?.coinsBalance || 0}</Text>
          </View>
        </View>

        {/* Admin Dashboard Quick Access Banner if Admin */}
        {isAdmin && (
          <TouchableOpacity style={styles.adminBanner} onPress={onOpenAdmin} activeOpacity={0.85}>
            <View style={styles.adminBannerLeft}>
              <ShieldCheck size={20} color="#7C3AED" />
              <View>
                <Text style={styles.adminBannerTitle}>Administrator Portal</Text>
                <Text style={styles.adminBannerSub}>Manage users, moderation & platform analytics</Text>
              </View>
            </View>
            <ArrowRight size={18} color="#7C3AED" />
          </TouchableOpacity>
        )}

        {/* Action Controls */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.85}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Create Challenge</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => setScannerModalVisible(true)}
            activeOpacity={0.8}
          >
            <QrCode size={18} color="#2563EB" />
            <Text style={styles.secondaryActionText}>Scan QR / Code</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 1: MY ACTIVE CHALLENGES & LIVE RACES */}
        {userChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Challenges ({userChallenges.length})</Text>
            <View style={styles.challengeGrid}>
              {userChallenges.map((ch) => {
                const isActiveRace = ch.status === 'active';
                const progressPct = Math.min(
                  100,
                  Math.round(((ch.userCurrentSteps || 0) / ch.targetSteps) * 100)
                );

                return (
                  <TouchableOpacity
                    key={ch.id}
                    style={[
                      styles.myChallengeCard,
                      isActiveRace && styles.activeLiveRaceCard,
                    ]}
                    onPress={async () => {
                      if (isActiveRace) {
                        try {
                          const res = await api.getChallengeDetails(ch.id);
                          setActiveRaceData({ challenge: res.challenge, participants: res.participants });
                        } catch (_) {
                          handleOpenLobby(ch.id);
                        }
                      } else {
                        handleOpenLobby(ch.id);
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.cardTop}>
                      <View style={styles.statusPill}>
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: isActiveRace ? '#EF4444' : '#10B981' },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusPillText,
                            isActiveRace && { color: '#DC2626' },
                          ]}
                        >
                          {isActiveRace ? '⚡ RACING LIVE IN PROGRESS' : 'WAITING IN LOBBY'}
                        </Text>
                      </View>
                      <Text style={styles.codeText}>#{ch.inviteCode}</Text>
                    </View>

                    <Text style={styles.cardTitle}>{ch.title}</Text>

                    {/* Live Progress Bar for Active Races */}
                    {isActiveRace && (
                      <View style={styles.activeRaceProgressSection}>
                        <View style={styles.activeRaceBarBg}>
                          <View
                            style={[
                              styles.activeRaceBarFill,
                              { width: `${progressPct}%` },
                            ]}
                          />
                        </View>
                        <View style={styles.activeRaceProgressRow}>
                          <Text style={styles.activeRaceProgressText}>
                            Your Steps: {(ch.userCurrentSteps || 0).toLocaleString()} / {ch.targetSteps.toLocaleString()}
                          </Text>
                          <Text style={styles.activeRacePercent}>{progressPct}%</Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.metaRow}>
                      <View style={styles.metaBadge}>
                        <Footprints size={12} color="#0284C7" />
                        <Text style={styles.metaBadgeText}>
                          {ch.targetSteps.toLocaleString()} Steps
                        </Text>
                      </View>
                      <View style={[styles.metaBadge, { backgroundColor: '#FEF3C7' }]}>
                        <Coins size={12} color="#D97706" />
                        <Text style={[styles.metaBadgeText, { color: '#92400E' }]}>
                          🪙 {ch.rewardPoolCoins} Prize
                        </Text>
                      </View>
                    </View>

                    {isActiveRace && (
                      <View style={styles.resumeRaceBtn}>
                        <Text style={styles.resumeRaceBtnText}>⚡ Enter / Resume Live Race</Text>
                        <ArrowRight size={14} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* SECTION 2: PUBLIC CHALLENGES FEED */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Public Challenges</Text>

          {isLoading ? (
            <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 30 }} />
          ) : publicChallenges.length === 0 ? (
            <View style={styles.emptyFeed}>
              <Trophy size={40} color="#94A3B8" />
              <Text style={styles.emptyFeedTitle}>No Public Challenges Yet</Text>
              <Text style={styles.emptyFeedSub}>Tap 'Create Challenge' above to start the first room!</Text>
            </View>
          ) : (
            <View style={styles.challengeGrid}>
              {publicChallenges.map((ch) => (
                <View key={ch.id} style={styles.publicCard}>
                  <View style={styles.cardTop}>
                    <View style={styles.publicBadge}>
                      <Eye size={12} color="#2563EB" />
                      <Text style={styles.publicBadgeText}>Public</Text>
                    </View>
                    <Text style={styles.hostText}>Host: {ch.creatorUsername}</Text>
                  </View>

                  <Text style={styles.cardTitle}>{ch.title}</Text>
                  {ch.description ? <Text style={styles.cardSub}>{ch.description}</Text> : null}

                  <View style={styles.metaRow}>
                    <View style={styles.metaBadge}>
                      <Footprints size={12} color="#0284C7" />
                      <Text style={styles.metaBadgeText}>{ch.targetSteps.toLocaleString()} Steps</Text>
                    </View>
                    <View style={[styles.metaBadge, { backgroundColor: '#FEF3C7' }]}>
                      <Coins size={12} color="#D97706" />
                      <Text style={[styles.metaBadgeText, { color: '#92400E' }]}>🪙 {ch.rewardPoolCoins} Prize</Text>
                    </View>
                    <View style={[styles.metaBadge, { backgroundColor: '#F1F5F9' }]}>
                      <Users size={12} color="#475569" />
                      <Text style={[styles.metaBadgeText, { color: '#475569' }]}>
                        {ch.joinedPlayersCount}/{ch.maxPlayers}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.joinBtn}
                    onPress={() => handleJoinPublic(ch.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.joinBtnText}>Join Lobby</Text>
                    <ArrowRight size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* CREATE MODAL */}
      <CreateChallengeModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onChallengeCreated={(newChallenge) => {
          setActiveLobbyChallengeId(newChallenge.id);
          loadChallenges();
        }}
      />

      {/* QR SCANNER / CODE INPUT MODAL */}
      <QRScannerModal
        visible={scannerModalVisible}
        onClose={() => setScannerModalVisible(false)}
        onJoined={(challengeId) => {
          setActiveLobbyChallengeId(challengeId);
          loadChallenges();
        }}
      />

      {/* LOBBY MODAL */}
      <ChallengeLobbyModal
        visible={!!activeLobbyChallengeId}
        challengeId={activeLobbyChallengeId}
        onClose={() => setActiveLobbyChallengeId(null)}
        onRaceStart={handleRaceStart}
      />

      {/* LIVE RACE MODAL */}
      {activeRaceData && (
        <LiveRaceModal
          visible={!!activeRaceData}
          challenge={activeRaceData.challenge}
          initialParticipants={activeRaceData.participants}
          onClose={() => setActiveRaceData(null)}
          onRaceFinished={handleRaceFinished}
        />
      )}

      {/* POST-RACE CEREMONY MODAL */}
      {ceremonyData && (
        <PostRaceCeremonyModal
          visible={!!ceremonyData}
          challenge={ceremonyData.challenge}
          participants={ceremonyData.participants}
          myRank={ceremonyData.myRank}
          onClose={() => setCeremonyData(null)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  subGreeting: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  coinWalletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  coinWalletText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#92400E',
  },
  adminBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  adminBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  adminBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6D28D9',
  },
  adminBannerSub: {
    fontSize: 11,
    color: '#7C3AED',
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  primaryActionBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 6,
  },
  secondaryActionText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '800',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  challengeGrid: {
    gap: 12,
  },
  myChallengeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  publicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#2563EB',
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  publicBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  hostText: {
    fontSize: 11,
    color: '#64748B',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 12,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  joinBtn: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyFeed: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyFeedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 12,
  },
  emptyFeedSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  activeLiveRaceCard: {
    borderColor: '#F87171',
    backgroundColor: '#FFF1F2',
    borderWidth: 2,
    shadowColor: '#EF4444',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  activeRaceProgressSection: {
    marginVertical: 8,
  },
  activeRaceBarBg: {
    height: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    overflow: 'hidden',
  },
  activeRaceBarFill: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 4,
  },
  activeRaceProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  activeRaceProgressText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },
  activeRacePercent: {
    fontSize: 11,
    fontWeight: '900',
    color: '#EF4444',
  },
  resumeRaceBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
    gap: 6,
  },
  resumeRaceBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
