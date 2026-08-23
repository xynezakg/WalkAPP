import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { ShieldAlert, ArrowRight, Settings } from 'lucide-react-native';

interface PermissionBannerProps {
  onGrantPress: () => void;
  isAvailable: boolean;
}

export const PermissionBanner: React.FC<PermissionBannerProps> = ({
  onGrantPress,
  isAvailable,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <ShieldAlert size={24} color="#D97706" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>
          {isAvailable ? 'Physical Activity Permission Needed' : 'Sensor Not Detected'}
        </Text>
        <Text style={styles.description}>
          {isAvailable
            ? 'Android requires Physical Activity permission for WalkAPP to count your steps in real time.'
            : 'Hardware step counter was not detected on this device/emulator. You can use the testing tools below.'}
        </Text>
        {isAvailable && (
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.button} onPress={onGrantPress} activeOpacity={0.8}>
              <Text style={styles.buttonText}>Allow Permission</Text>
              <ArrowRight size={16} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => Linking.openSettings()}
              activeOpacity={0.8}
            >
              <Settings size={14} color="#B45309" />
              <Text style={styles.settingsButtonText}>Open App Settings</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 18,
    marginBottom: 10,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  settingsButton: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  settingsButtonText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '600',
  },
});
