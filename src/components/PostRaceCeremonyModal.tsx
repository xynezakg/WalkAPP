import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Trophy,
  Camera,
  Upload,
  Coins,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Crown,
  Images,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/apiClient';

interface PostRaceCeremonyModalProps {
  visible: boolean;
  challenge: any;
  participants: any[];
  myRank?: number;
  onClose: () => void;
}

type CeremonyStep = 'camera_prompt' | 'rankings' | 'slideshow';

export const PostRaceCeremonyModal: React.FC<PostRaceCeremonyModalProps> = ({
  visible,
  challenge,
  participants,
  myRank = 1,
  onClose,
}) => {
  const { user, refreshUserProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState<CeremonyStep>('camera_prompt');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photosList, setPhotosList] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Take photo with camera
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to capture your victory pose.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        const base64Data = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setCapturedPhoto(base64Data);
        await uploadPhoto(base64Data);
      }
    } catch (e) {
      console.log('Camera error:', e);
    }
  };

  // Pick from gallery
  const handlePickGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        const base64Data = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setCapturedPhoto(base64Data);
        await uploadPhoto(base64Data);
      }
    } catch (e) {
      console.log('Gallery error:', e);
    }
  };

  const uploadPhoto = async (base64: string) => {
    if (!challenge) return;
    setIsUploading(true);
    try {
      const res = await api.uploadCelebrationPhoto(challenge.id, base64, 'Victory Pose! 🎉');
      setPhotosList(res.photos);
    } catch (e) {
      console.log('Upload error:', e);
    } finally {
      setIsUploading(false);
      setCurrentStep('rankings');
    }
  };

  const handleSkipPhoto = async () => {
    if (challenge) {
      try {
        const res = await api.getChallengeDetails(challenge.id);
        setPhotosList(res.photos);
      } catch (_) {}
    }
    setCurrentStep('rankings');
  };

  const handleFinishCeremony = async () => {
    await refreshUserProfile();
    onClose();
  };

  // Calculate coins for this user
  let coinsWon = 10;
  if (myRank === 1) coinsWon = Math.round((challenge?.rewardPoolCoins || 100) * 0.5);
  else if (myRank === 2) coinsWon = Math.round((challenge?.rewardPoolCoins || 100) * 0.3);
  else if (myRank === 3) coinsWon = Math.round((challenge?.rewardPoolCoins || 100) * 0.2);

  // Sorted participants by rank
  const sortedParticipants = [...participants].sort(
    (a, b) => (a.finalRank || 999) - (b.finalRank || 999)
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* STEP 1: VICTORY POSE CAMERA POPUP */}
        {currentStep === 'camera_prompt' && (
          <View style={styles.stepContainer}>
            <View style={styles.poseHeader}>
              <View style={styles.trophyCircle}>
                <Trophy size={42} color="#D97706" />
              </View>
              <Text style={styles.poseTitle}>Challenge Completed!</Text>
              <Text style={styles.poseSubtitle}>
                Capture your final victory pose or workout memory to share with all participants!
              </Text>
            </View>

            {/* Photo Action Buttons */}
            <View style={styles.photoActionsCard}>
              <TouchableOpacity
                style={styles.cameraBtn}
                onPress={handleTakePhoto}
                activeOpacity={0.85}
              >
                <Camera size={24} color="#FFFFFF" />
                <Text style={styles.cameraBtnText}>Take Victory Photo 📸</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.galleryBtn}
                onPress={handlePickGallery}
                activeOpacity={0.8}
              >
                <Upload size={20} color="#2563EB" />
                <Text style={styles.galleryBtnText}>Upload from Gallery</Text>
              </TouchableOpacity>

              {isUploading && (
                <View style={styles.uploadingIndicator}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.uploadingText}>Saving victory photo...</Text>
                </View>
              )}
            </View>

            {/* Skip Button */}
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkipPhoto}
              activeOpacity={0.7}
            >
              <Text style={styles.skipBtnText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: PODIUM & RANKINGS MODAL */}
        {currentStep === 'rankings' && (
          <View style={styles.stepContainer}>
            {/* Header */}
            <View style={styles.rankingsHeader}>
              <Crown size={32} color="#F59E0B" />
              <Text style={styles.rankingsTitle}>Final Rankings & Podium</Text>
              <Text style={styles.rankingsSub}>{challenge?.title}</Text>
            </View>

            {/* Coin Reward Banner */}
            <View style={styles.coinsAwardedBanner}>
              <Sparkles size={20} color="#D97706" />
              <View>
                <Text style={styles.coinsAwardedTitle}>You Earned 🪙 {coinsWon} Coins!</Text>
                <Text style={styles.coinsAwardedSub}>Rank #{myRank} Reward credited to your wallet</Text>
              </View>
            </View>

            {/* Podium Visual (Top 3) */}
            <View style={styles.podiumContainer}>
              {/* 2nd Place */}
              <View style={[styles.podiumColumn, styles.podiumSecond]}>
                <Text style={styles.podiumPlaceText}>🥈 2nd</Text>
                <Text style={styles.podiumPlayerName} numberOfLines={1}>
                  {sortedParticipants[1]?.username || '---'}
                </Text>
                <View style={[styles.podiumBlock, { height: 75, backgroundColor: '#94A3B8' }]}>
                  <Text style={styles.podiumBlockNum}>2</Text>
                </View>
              </View>

              {/* 1st Place */}
              <View style={[styles.podiumColumn, styles.podiumFirst]}>
                <Crown size={22} color="#F59E0B" style={{ marginBottom: 4 }} />
                <Text style={styles.podiumPlaceText}>🥇 1st</Text>
                <Text style={[styles.podiumPlayerName, { fontWeight: '900', color: '#FFFFFF' }]} numberOfLines={1}>
                  {sortedParticipants[0]?.username || '---'}
                </Text>
                <View style={[styles.podiumBlock, { height: 105, backgroundColor: '#F59E0B' }]}>
                  <Text style={styles.podiumBlockNum}>1</Text>
                </View>
              </View>

              {/* 3rd Place */}
              <View style={[styles.podiumColumn, styles.podiumThird]}>
                <Text style={styles.podiumPlaceText}>🥉 3rd</Text>
                <Text style={styles.podiumPlayerName} numberOfLines={1}>
                  {sortedParticipants[2]?.username || '---'}
                </Text>
                <View style={[styles.podiumBlock, { height: 55, backgroundColor: '#B45309' }]}>
                  <Text style={styles.podiumBlockNum}>3</Text>
                </View>
              </View>
            </View>

            {/* Action to Slideshow */}
            <TouchableOpacity
              style={styles.nextStepBtn}
              onPress={() => setCurrentStep('slideshow')}
              activeOpacity={0.85}
            >
              <Images size={18} color="#FFFFFF" />
              <Text style={styles.nextStepBtnText}>View Participant Memory Gallery</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: PARTICIPANT MEMORIES SLIDESHOW / CAROUSEL */}
        {currentStep === 'slideshow' && (
          <View style={styles.stepContainer}>
            <View style={styles.slideshowHeader}>
              <Images size={28} color="#38BDF8" />
              <Text style={styles.slideshowTitle}>Participant Memories</Text>
              <Text style={styles.slideshowSub}>Celebration moments from this challenge</Text>
            </View>

            {photosList.length === 0 ? (
              <View style={styles.emptyGallery}>
                <Camera size={48} color="#64748B" />
                <Text style={styles.emptyGalleryText}>No victory photos shared for this race yet.</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContainer}
              >
                {photosList.map((item, idx) => (
                  <View key={item.id || idx} style={styles.slideCard}>
                    <Image source={{ uri: item.photoBase64 }} style={styles.slideImage} />
                    <View style={styles.slideInfo}>
                      <Text style={styles.slideUsername}>📸 {item.username}</Text>
                      {item.caption ? (
                        <Text style={styles.slideCaption}>{item.caption}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Complete & Exit Button */}
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={handleFinishCeremony}
              activeOpacity={0.85}
            >
              <CheckCircle2 size={20} color="#FFFFFF" />
              <Text style={styles.completeBtnText}>Finish & Return to Dashboard</Text>
            </TouchableOpacity>
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
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  poseHeader: {
    alignItems: 'center',
    marginTop: 20,
  },
  trophyCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  poseTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  poseSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  photoActionsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cameraBtn: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  cameraBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  galleryBtn: {
    backgroundColor: '#EFF6FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  galleryBtnText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '800',
  },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  uploadingText: {
    fontSize: 13,
    color: '#38BDF8',
    fontWeight: '600',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  skipBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
  rankingsHeader: {
    alignItems: 'center',
    marginTop: 10,
  },
  rankingsTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 6,
  },
  rankingsSub: {
    fontSize: 13,
    color: '#38BDF8',
    marginTop: 2,
  },
  coinsAwardedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  coinsAwardedTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#92400E',
  },
  coinsAwardedSub: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 1,
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 20,
    height: 180,
  },
  podiumColumn: {
    alignItems: 'center',
    flex: 1,
  },
  podiumFirst: {
    zIndex: 2,
  },
  podiumSecond: {},
  podiumThird: {},
  podiumPlaceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 4,
  },
  podiumPlayerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 6,
  },
  podiumBlock: {
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumBlockNum: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  nextStepBtn: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  nextStepBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  slideshowHeader: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  slideshowTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 6,
  },
  slideshowSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  carouselContainer: {
    gap: 16,
    paddingVertical: 10,
  },
  slideCard: {
    width: 280,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  slideImage: {
    width: '100%',
    height: 280,
    resizeMode: 'cover',
  },
  slideInfo: {
    padding: 12,
  },
  slideUsername: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  slideCaption: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptyGallery: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGalleryText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 10,
  },
  completeBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    marginTop: 12,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
