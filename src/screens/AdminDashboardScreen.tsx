import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  ShieldCheck,
  Users,
  Trophy,
  Coins,
  Camera,
  Search,
  UserX,
  UserCheck,
  Trash2,
  X,
  Plus,
} from 'lucide-react-native';
import { api } from '../services/apiClient';

interface AdminDashboardScreenProps {
  onClose: () => void;
}

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({ onClose }) => {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'challenges'>('users');

  const loadAdminData = async () => {
    try {
      const [statsRes, usersRes, chRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminChallenges(),
      ]);
      setStats(statsRes.stats);
      setUsers(usersRes.users);
      setChallenges(chRes.challenges);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load administrator data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleBan = async (userId: string, currentUsername: string) => {
    try {
      const res = await api.toggleAdminBan(userId);
      Alert.alert('User Status Updated', res.message);
      loadAdminData();
    } catch (e: any) {
      Alert.alert('Action Failed', e.message);
    }
  };

  const handleGrantBonus = async (userId: string, currentUsername: string) => {
    try {
      const res = await api.adjustAdminCoins(userId, 50, 'Admin Gift');
      Alert.alert('Coins Granted', `Added 50 coins to ${currentUsername}. New balance: 🪙 ${res.newBalance}`);
      loadAdminData();
    } catch (e: any) {
      Alert.alert('Failed', e.message);
    }
  };

  const handleDeleteChallenge = (challengeId: string, title: string) => {
    Alert.alert(
      'Terminate Challenge',
      `Are you sure you want to delete "${title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAdminChallenge(challengeId);
              Alert.alert('Deleted', 'Challenge was removed.');
              loadAdminData();
            } catch (e: any) {
              Alert.alert('Failed', e.message);
            }
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <ShieldCheck size={22} color="#7C3AED" />
          <Text style={styles.headerTitle}>Administrator Portal</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
          <X size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadAdminData(); }} colors={['#7C3AED']} />}
      >
        {/* KPI Stats Grid */}
        {stats && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Users size={18} color="#2563EB" />
              <Text style={styles.statVal}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>

            <View style={styles.statCard}>
              <Trophy size={18} color="#10B981" />
              <Text style={styles.statVal}>{stats.activeChallenges}</Text>
              <Text style={styles.statLabel}>Active Races</Text>
            </View>

            <View style={styles.statCard}>
              <Coins size={18} color="#D97706" />
              <Text style={styles.statVal}>🪙 {stats.totalCoinsInCirculation}</Text>
              <Text style={styles.statLabel}>Coins Issued</Text>
            </View>

            <View style={styles.statCard}>
              <Camera size={18} color="#7C3AED" />
              <Text style={styles.statVal}>{stats.totalPhotosUploaded}</Text>
              <Text style={styles.statLabel}>Photos Shared</Text>
            </View>
          </View>
        )}

        {/* Tab Selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'users' && styles.tabBtnActive]}
            onPress={() => setActiveTab('users')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
              User Management ({users.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'challenges' && styles.tabBtnActive]}
            onPress={() => setActiveTab('challenges')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'challenges' && styles.tabTextActive]}>
              Challenges ({challenges.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <View style={styles.tabContent}>
            {/* Search Input */}
            <View style={styles.searchWrapper}>
              <Search size={16} color="#64748B" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by username or email..."
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Users List */}
            {isLoading ? (
              <ActivityIndicator size="large" color="#7C3AED" style={{ marginVertical: 20 }} />
            ) : (
              <View style={styles.itemsList}>
                {filteredUsers.map((u) => (
                  <View key={u.id} style={[styles.userCard, u.isBanned && styles.bannedUserCard]}>
                    <View style={styles.userCardTop}>
                      <View style={styles.userLeft}>
                        <View style={[styles.avatarCircle, u.role === 'admin' && styles.adminAvatar]}>
                          <Text style={styles.avatarText}>{u.username.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View>
                          <View style={styles.nameBadgeRow}>
                            <Text style={styles.usernameText}>{u.username}</Text>
                            {u.role === 'admin' && (
                              <View style={styles.roleBadge}>
                                <Text style={styles.roleBadgeText}>ADMIN</Text>
                              </View>
                            )}
                            {u.isBanned ? (
                              <View style={styles.bannedBadge}>
                                <Text style={styles.bannedBadgeText}>BANNED</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.emailText}>{u.email}</Text>
                        </View>
                      </View>

                      <View style={styles.coinsBadge}>
                        <Text style={styles.coinsBadgeText}>🪙 {u.coinsBalance}</Text>
                      </View>
                    </View>

                    {/* Admin Actions */}
                    {u.role !== 'admin' && (
                      <View style={styles.userActionsRow}>
                        <TouchableOpacity
                          style={styles.bonusBtn}
                          onPress={() => handleGrantBonus(u.id, u.username)}
                          activeOpacity={0.7}
                        >
                          <Plus size={14} color="#047857" />
                          <Text style={styles.bonusBtnText}>+50 Coins</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.banBtn, u.isBanned ? styles.unbanBtn : null]}
                          onPress={() => handleToggleBan(u.id, u.username)}
                          activeOpacity={0.7}
                        >
                          {u.isBanned ? (
                            <>
                              <UserCheck size={14} color="#047857" />
                              <Text style={styles.unbanBtnText}>Unban User</Text>
                            </>
                          ) : (
                            <>
                              <UserX size={14} color="#B91C1C" />
                              <Text style={styles.banBtnText}>Ban User</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* CHALLENGES TAB */}
        {activeTab === 'challenges' && (
          <View style={styles.tabContent}>
            <View style={styles.itemsList}>
              {challenges.map((ch) => (
                <View key={ch.id} style={styles.challengeAdminCard}>
                  <View style={styles.chCardHeader}>
                    <Text style={styles.chTitle}>{ch.title}</Text>
                    <TouchableOpacity
                      style={styles.deleteChBtn}
                      onPress={() => handleDeleteChallenge(ch.id, ch.title)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.chHost}>Created by: {ch.creatorUsername} | Code: #{ch.inviteCode}</Text>

                  <View style={styles.chMetaRow}>
                    <Text style={styles.chMetaText}>🎯 {ch.targetSteps.toLocaleString()} Steps</Text>
                    <Text style={styles.chMetaText}>👥 {ch.participantCount}/{ch.maxPlayers} Players</Text>
                    <Text style={styles.chMetaText}>🪙 {ch.rewardPoolCoins} Pool</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  statVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F172A',
  },
  tabContent: {},
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    height: 44,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  itemsList: {
    gap: 12,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bannedUserCard: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  userCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminAvatar: {
    backgroundColor: '#EDE9FE',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E40AF',
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  usernameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  roleBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#7C3AED',
  },
  bannedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bannedBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#DC2626',
  },
  emailText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  coinsBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  coinsBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  userActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  bonusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  bonusBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  banBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  banBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  unbanBtn: {
    backgroundColor: '#ECFDF5',
  },
  unbanBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  challengeAdminCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  deleteChBtn: {
    padding: 6,
  },
  chHost: {
    fontSize: 12,
    color: '#64748B',
    marginVertical: 4,
  },
  chMetaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  chMetaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
});
