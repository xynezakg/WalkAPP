import { io, Socket } from 'socket.io-client';
import { SOCKET_SERVER_URL } from './apiClient';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      console.log(`[Client Socket] Connected: ${socketInstance?.id}`);
    });

    socketInstance.on('disconnect', () => {
      console.log('[Client Socket] Disconnected');
    });

    socketInstance.on('connect_error', (err) => {
      console.log('[Client Socket] Connect error:', err.message);
    });
  }

  return socketInstance;
}

export const socketService = {
  joinChallengeRoom: (challengeId: string, userId: string, username: string) => {
    const socket = getSocket();
    socket.emit('join_challenge', { challengeId, userId, username });
  },

  startChallengeRace: (challengeId: string, userId: string) => {
    const socket = getSocket();
    socket.emit('start_challenge', { challengeId, userId });
  },

  broadcastStepUpdate: (challengeId: string, userId: string, currentSteps: number) => {
    const socket = getSocket();
    socket.emit('step_update', { challengeId, userId, currentSteps });
  },

  onParticipantsUpdate: (callback: (data: { challenge: any; participants: any[] }) => void) => {
    const socket = getSocket();
    socket.on('participants_update', callback);
    return () => socket.off('participants_update', callback);
  },

  onChallengeStarting: (callback: (data: { startTime: number; countdownSeconds: number }) => void) => {
    const socket = getSocket();
    socket.on('challenge_starting', callback);
    return () => socket.off('challenge_starting', callback);
  },

  onLeaderboardUpdate: (callback: (data: { challengeId: string; participants: any[] }) => void) => {
    const socket = getSocket();
    socket.on('leaderboard_update', callback);
    return () => socket.off('leaderboard_update', callback);
  },

  onParticipantFinished: (callback: (data: { userId: string; username: string; rank: number; coinsEarned: number }) => void) => {
    const socket = getSocket();
    socket.on('participant_finished', callback);
    return () => socket.off('participant_finished', callback);
  },

  onChallengeCompleted: (callback: (data: { challengeId: string; endTime: number }) => void) => {
    const socket = getSocket();
    socket.on('challenge_completed', callback);
    return () => socket.off('challenge_completed', callback);
  },

  cancelChallenge: (challengeId: string, userId: string) => {
    const socket = getSocket();
    socket.emit('cancel_challenge', { challengeId, userId });
  },

  onChallengeCancelled: (callback: (data: { challengeId: string; message: string }) => void) => {
    const socket = getSocket();
    socket.on('challenge_cancelled', callback);
    return () => socket.off('challenge_cancelled', callback);
  },
};
