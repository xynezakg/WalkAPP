import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Trophy,
  Footprints,
  Flame,
  CheckCircle2,
  Sparkles,
  Plus,
  Crown,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socketService';
import { startHybridStepTracking } from '../services/pedometerService';

interface LiveRaceModalProps {
  visible: boolean;
  challenge: any;
  initialParticipants: any[];
  onClose: () => void;
  onRaceFinished: (data: { challenge: any; participants: any[]; myRank?: number }) => void;
}

export const LiveRaceModal: React.FC<LiveRaceModalProps> = ({
  visible,
  challenge,
  initialParticipants,
  onClose,
  onRaceFinished,
}) => {
  const { user } = useAuth();
  const [countdown, setCountdown] = useState<number | null>(3);
  const [participants, setParticipants] = useState<any[]>(initialParticipants);
  const [mySteps, setMySteps] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [myRank, setMyRank] = useState<number | null>(null);

  const myStepsRef = useRef<number>(0);
  const isFinishedRef = useRef<boolean>(false);

  // Synchronized countdown on start
  useEffect(() => {
    if (!visible) return;

    setCountdown(3);
    setIsFinished(false);
    setMyRank(null);
    setMySteps(0);
    myStepsRef.current = 0;
    isFinishedRef.current = false;

    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (_) {}
      } else if (count === 0) {
        setCountdown(0);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (_) {}
      } else {
        setCountdown(null);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  // Live motion sensor tracking & Socket broadcasts
  useEffect(() => {
    if (!visible || countdown !== null || !challenge || !user) return;

    let stepBatch = 0;
    const unsubscribeMotion = startHybridStepTracking((delta) => {
      if (isFinishedRef.current) return;

      myStepsRef.current += delta;
      stepBatch += delta;
      setMySteps(myStepsRef.current);

      // Throttle live socket broadcasts (emit every 2 steps)
      if (stepBatch >= 2 || myStepsRef.current >= challenge.targetSteps) {
        socketService.broadcastStepUpdate(challenge.id, user.id, myStepsRef.current);
        stepBatch = 0;
      }
    });

    // Socket Listeners
    const unsubLeaderboard = socketService.onLeaderboardUpdate((data) => {
      if (data.challengeId === challenge.id) {
        setParticipants(data.participants);
      }
    });

    const unsubFinished = socketService.onParticipantFinished((data) => {
      if (data.userId === user.id) {
        setIsFinished(true);
        isFinishedRef.current = true;
        setMyRank(data.rank);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (_) {}
      }
    });

    const unsubCompleted = socketService.onChallengeCompleted((data) => {
      // Race finished for all!
      onRaceFinished({
        challenge,
        participants,
        myRank: myRank || undefined,
      });
    });

    return () => {
      unsubscribeMotion();
      unsubLeaderboard();
      unsubFinished();
      unsubCompleted();
    };
  }, [visible, countdown, challenge, user, myRank, participants]);

  // Manual step simulator button for fast testing on phone / emulator
  const handleAddSimulatedSteps = (amount: number) => {
    if (isFinishedRef.current || !challenge || !user) return;

    myStepsRef.current += amount;
    setMySteps(myStepsRef.current);
    socketService.broadcastStepUpdate(challenge.id, user.id, myStepsRef.current);
  };

  const targetSteps = challenge?.targetSteps || 3000;
  const myProgress = Math.min(100, Math.round((mySteps / targetSteps) * 100));

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* COUNTDOWN OVERLAY */}
        {countdown !== null ? (
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownTitle}>GET READY!</Text>
            <Text style={styles.countdownNumber}>
              {countdown === 0 ? 'GO! 🏃' : countdown}
            </Text>
            <Text style={styles.countdownSub}>First to {targetSteps.toLocaleString()} steps wins!</Text>
          </View>
        ) : (
          /* LIVE MULTIPLAYER RACE ARENA */
          <View style={styles.arenaContainer}>
            {/* Top Bar */}
            <View style={styles.arenaHeader}>
              <View>
                <Text style={styles.arenaTitle}>{challenge?.title}</Text>
                <Text style={styles.arenaTarget}>
                  🎯 Target: {targetSteps.toLocaleString()} Steps
                </Text>
              </View>

              {isFinished ? (
                <View style={styles.finishedBadge}>
                  <Crown size={14} color="#D97706" />
                  <Text style={styles.finishedBadgeText}>Finished #{myRank}!</Text>
                </View>
              ) : (
                <View style={styles.racingBadge}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.racingBadgeText}>LIVE RACE</Text>
                </View>
              )}
            </View>

            {/* My Live Step Card */}
            <View style={styles.myStepCard}>
              <Text style={styles.myStepLabel}>YOUR CURRENT STEPS</Text>
              <Text style={styles.myStepValue}>{mySteps.toLocaleString()}</Text>

              {/* Progress Bar */}
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${myProgress}%`,
                      backgroundColor: isFinished ? '#10B981' : '#2563EB',
                    },
                  ]}
                />
              </View>

              <View style={styles.myStepFooter}>
                <Text style={styles.progressText}>{myProgress}% Completed</Text>
                <Text style={styles.remainingText}>
                  {Math.max(0, targetSteps - mySteps).toLocaleString()} steps left
                </Text>
              </View>

              {/* Dev Simulation Buttons */}
              <View style={styles.simControlsRow}>
                <TouchableOpacity
                  style={styles.simBtn}
                  onPress={() => handleAddSimulatedSteps(100)}
                  activeOpacity={0.7}
                >
                  <Plus size={12} color="#475569" />
                  <Text style={styles.simBtnText}>+100</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.simBtn}
                  onPress={() => handleAddSimulatedSteps(500)}
                  activeOpacity={0.7}
                >
                  <Plus size={12} color="#475569" />
                  <Text style={styles.simBtnText}>+500</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.simBtn, styles.simFinishBtn]}
                  onPress={() => handleAddSimulatedSteps(targetSteps)}
                  activeOpacity={0.7}
                >
                  <Trophy size={12} color="#059669" />
                  <Text style={[styles.simBtnText, { color: '#059669' }]}>Finish</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Real-time Multi-Participant Leaderboard */}
            <View style={styles.leaderboardSection}>
              <Text style={styles.leaderboardHeader}>Live Leaderboard</Text>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.leaderboardList}>
                {participants.map((p, index) => {
                  const isCurrent = p.userId === user?.id;
                  const participantProgress = Math.min(
                    100,
                    Math.round((p.currentSteps / targetSteps) * 100)
                  );
                  const isPlayerFinished = p.status === 'finished';

                  let rankEmoji = `#${index + 1}`;
                  if (p.finalRank === 1 || (!p.finalRank && index === 0)) rankEmoji = '🥇';
                  else if (p.finalRank === 2 || (!p.finalRank && index === 1)) rankEmoji = '🥈';
                  else if (p.finalRank === 3 || (!p.finalRank && index === 2)) rankEmoji = '🥉';

                  return (
                    <View
                      key={p.id}
                      style={[styles.playerCard, isCurrent && styles.currentPlayerCard]}
                    >
                      <View style={styles.playerTopRow}>
                        <View style={styles.playerLeft}>
                          <Text style={styles.rankText}>{rankEmoji}</Text>
                          <View style={styles.playerAvatar}>
                            <Text style={styles.playerAvatarText}>
                              {p.username.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.playerName}>
                            {p.username} {isCurrent && '(You)'}
                          </Text>
                        </View>

                        <View style={styles.playerRight}>
                          <Text style={styles.playerSteps}>
                            {p.currentSteps.toLocaleString()}{' '}
                            <Text style={styles.playerStepsGoal}>/ {targetSteps.toLocaleString()}</Text>
                          </Text>
                        </View>
                      </View>

                      {/* Participant Progress Bar */}
                      <View style={styles.playerBarBg}>
                        <View
                          style={[
                            styles.playerBarFill,
                            {
                              width: `${participantProgress}%`,
                              backgroundColor: isPlayerFinished
                                ? '#10B981'
                                : isCurrent
                                ? '#2563EB'
                                : '#38BDF8',
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            {/* Finish Ceremony Trigger Button */}
            {isFinished && (
              <TouchableOpacity
                style={styles.ceremonyBtn}
                onPress={() =>
                  onRaceFinished({
                    challenge,
                    participants,
                    myRank: myRank || 1,
                  })
                }
                activeOpacity={0.85}
              >
                <Sparkles size={18} color="#FFFFFF" />
                <Text style={styles.ceremonyBtnText}>Proceed to Victory Ceremony 🎉</Text>
              </TouchableOpacity>
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
    backgroundColor: '#0F172A',
  },
  countdownContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  countdownTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 2,
    marginBottom: 10,
  },
  countdownNumber: {
    fontSize: 110,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 10,
  },
  countdownSub: {
    fontSize: 16,
    color: '#38BDF8',
    fontWeight: '700',
    textAlign: 'center',
  },
  arenaContainer: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  arenaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  arenaTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  arenaTarget: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
    marginTop: 2,
  },
  racingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  racingBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  finishedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 6,
  },
  finishedBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#92400E',
  },
  myStepCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  myStepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 2,
  },
  myStepValue: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#334155',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  myStepFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  remainingText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  simControlsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  simBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  simFinishBtn: {
    backgroundColor: '#ECFDF5',
  },
  simBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  leaderboardSection: {
    flex: 1,
  },
  leaderboardHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  leaderboardList: {
    gap: 10,
    paddingBottom: 20,
  },
  playerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  currentPlayerCard: {
    borderColor: '#2563EB',
    backgroundColor: '#1E293B',
  },
  playerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  playerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankText: {
    fontSize: 16,
    fontWeight: '900',
    width: 24,
  },
  playerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  playerRight: {
    alignItems: 'flex-end',
  },
  playerSteps: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  playerStepsGoal: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  playerBarBg: {
    height: 6,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  playerBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  ceremonyBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    marginTop: 10,
  },
  ceremonyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
