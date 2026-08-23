import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, QrCode, ArrowRight, Sparkles } from 'lucide-react-native';
import { api } from '../services/apiClient';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onJoined: (challengeId: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  visible,
  onClose,
  onJoined,
}) => {
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Required', 'Please enter a 6-digit challenge code or challenge ID.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.joinChallenge(inviteCode.trim());
      Alert.alert('Lobby Joined! 🏃‍♂️', res.message);
      onJoined(res.challengeId);
      onClose();
    } catch (error: any) {
      Alert.alert('Could Not Join', error.message || 'Check the code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoCode = () => {
    setInviteCode('WALK3K');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <QrCode size={22} color="#2563EB" />
              <Text style={styles.headerTitle}>Join Step Challenge</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            Enter the 6-character invite code from your friend's challenge QR code or invite link:
          </Text>

          {/* Code Input */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              placeholder="e.g. WALK3K"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              maxLength={20}
            />
          </View>

          {/* Quick Demo Fill */}
          <TouchableOpacity
            style={styles.demoFillBtn}
            onPress={handleQuickDemoCode}
            activeOpacity={0.7}
          >
            <Sparkles size={14} color="#2563EB" />
            <Text style={styles.demoFillText}>Quick Demo Code: WALK3K</Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && { opacity: 0.7 }]}
            onPress={handleJoin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Join Challenge Lobby</Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
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
  description: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  inputWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#BFDBFE',
    marginBottom: 12,
  },
  textInput: {
    height: 56,
    fontSize: 20,
    fontWeight: '900',
    color: '#1E40AF',
    textAlign: 'center',
    letterSpacing: 3,
  },
  demoFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    marginBottom: 16,
  },
  demoFillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
