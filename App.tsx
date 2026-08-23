import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Footprints, BarChart3, History, User, Trophy, ShieldCheck } from 'lucide-react-native';
import { StepProvider, useSteps } from './src/context/StepContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { ChallengesScreen } from './src/screens/ChallengesScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { AdminDashboardScreen } from './src/screens/AdminDashboardScreen';
import { TabType } from './src/types';

const MainNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');
  const [adminModalVisible, setAdminModalVisible] = useState<boolean>(false);

  const { isLoading: stepsLoading } = useSteps();
  const { user, isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();

  if (stepsLoading || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Initializing WalkAPP...</Text>
      </View>
    );
  }

  // If user is not logged in, present Login/Register view
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        {authScreen === 'login' ? (
          <LoginScreen onNavigateToRegister={() => setAuthScreen('register')} />
        ) : (
          <RegisterScreen onNavigateToLogin={() => setAuthScreen('login')} />
        )}
      </SafeAreaView>
    );
  }

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'today':
        return <HomeScreen />;
      case 'challenges':
        return <ChallengesScreen onOpenAdmin={() => setAdminModalVisible(true)} />;
      case 'analytics':
        return <AnalyticsScreen />;
      case 'history':
        return <HistoryScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={styles.screenContainer}>{renderActiveScreen()}</View>

      {/* Modern 5-Tab Bottom Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'today' && styles.tabItemActive]}
          onPress={() => setActiveTab('today')}
          activeOpacity={0.7}
        >
          <Footprints size={22} color={activeTab === 'today' ? '#2563EB' : '#94A3B8'} />
          <Text style={[styles.tabLabel, activeTab === 'today' && styles.tabLabelActive]}>
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'challenges' && styles.tabItemActive]}
          onPress={() => setActiveTab('challenges')}
          activeOpacity={0.7}
        >
          <Trophy size={22} color={activeTab === 'challenges' ? '#2563EB' : '#94A3B8'} />
          <Text style={[styles.tabLabel, activeTab === 'challenges' && styles.tabLabelActive]}>
            Challenges
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'analytics' && styles.tabItemActive]}
          onPress={() => setActiveTab('analytics')}
          activeOpacity={0.7}
        >
          <BarChart3 size={22} color={activeTab === 'analytics' ? '#2563EB' : '#94A3B8'} />
          <Text style={[styles.tabLabel, activeTab === 'analytics' && styles.tabLabelActive]}>
            Analytics
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.7}
        >
          <History size={22} color={activeTab === 'history' ? '#2563EB' : '#94A3B8'} />
          <Text style={[styles.tabLabel, activeTab === 'history' && styles.tabLabelActive]}>
            History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'profile' && styles.tabItemActive]}
          onPress={() => setActiveTab('profile')}
          activeOpacity={0.7}
        >
          <User size={22} color={activeTab === 'profile' ? '#2563EB' : '#94A3B8'} />
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Admin Dashboard Modal */}
      <Modal
        visible={adminModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setAdminModalVisible(false)}
      >
        <AdminDashboardScreen onClose={() => setAdminModalVisible(false)} />
      </Modal>
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StepProvider>
          <MainNavigator />
        </StepProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  screenContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 12,
  },
  tabItemActive: {
    backgroundColor: '#EFF6FF',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 3,
  },
  tabLabelActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
});
