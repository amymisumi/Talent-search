import { getDatabase, ref, set, onDisconnect, serverTimestamp, onValue, off } from 'firebase/database';
import app from './client';

const db = getDatabase(app);

/**
 * Set user online status when they log in
 */
export const setUserOnline = async (userId: string): Promise<void> => {
  try {
    const userStatusRef = ref(db, `presence/${userId}`);
    const isOfflineForDatabase = {
      status: 'offline',
      lastSeen: serverTimestamp(),
    };

    const isOnlineForDatabase = {
      status: 'online',
      lastSeen: serverTimestamp(),
    };

    // Set user as online
    await set(userStatusRef, isOnlineForDatabase);

    // Set user as offline when they disconnect
    await onDisconnect(userStatusRef).set(isOfflineForDatabase);
  } catch (error) {
    console.error('Error setting user online:', error);
    throw error;
  }
};

/**
 * Set user offline status
 */
export const setUserOffline = async (userId: string): Promise<void> => {
  try {
    const userStatusRef = ref(db, `presence/${userId}`);
    await set(userStatusRef, {
      status: 'offline',
      lastSeen: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error setting user offline:', error);
    throw error;
  }
};

/**
 * Subscribe to user presence status
 * @param userId - The user ID to track
 * @param callback - Callback function that receives presence data
 * @returns Unsubscribe function
 */
export const subscribeToUserPresence = (
  userId: string,
  callback: (presence: { status: 'online' | 'offline'; lastSeen: number | null }) => void
): (() => void) => {
  const userStatusRef = ref(db, `presence/${userId}`);

  const unsubscribe = onValue(userStatusRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback({
        status: data.status || 'offline',
        lastSeen: data.lastSeen ? (data.lastSeen as number) : null,
      });
    } else {
      callback({
        status: 'offline',
        lastSeen: null,
      });
    }
  });

  return () => {
    off(userStatusRef);
  };
};

/**
 * Subscribe to multiple users' presence status
 * @param userIds - Array of user IDs to track
 * @param callback - Callback function that receives a map of userId -> presence data
 * @returns Unsubscribe function
 */
export const subscribeToMultipleUsersPresence = (
  userIds: string[],
  callback: (presenceMap: Record<string, { status: 'online' | 'offline'; lastSeen: number | null }>) => void
): (() => void) => {
  const unsubscribes: (() => void)[] = [];
  const presenceMap: Record<string, { status: 'online' | 'offline'; lastSeen: number | null }> = {};

  userIds.forEach((userId) => {
    const userStatusRef = ref(db, `presence/${userId}`);
    const unsubscribe = onValue(userStatusRef, (snapshot) => {
      const data = snapshot.val();
      presenceMap[userId] = {
        status: data?.status || 'offline',
        lastSeen: data?.lastSeen ? (data.lastSeen as number) : null,
      };
      callback({ ...presenceMap });
    });
    unsubscribes.push(() => off(userStatusRef));
  });

  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
};

/**
 * Get formatted "last seen" text
 */
export const getLastSeenText = (lastSeen: number | null): string => {
  if (!lastSeen) return 'Never';

  const now = Date.now();
  const diff = now - lastSeen;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

