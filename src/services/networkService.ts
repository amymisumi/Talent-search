import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
  addDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';

export interface Connection {
  id: string;
  userId: string;
  connectedUserId: string;
  connectedUserName: string;
  connectedUserRole: 'youth' | 'recruiter' | 'admin';
  connectedUserPhoto?: string;
  connectedUserSkills?: string[];
  status: 'pending' | 'accepted' | 'declined';
  initiatedBy: string;
  createdAt: Date | Timestamp;
  acceptedAt?: Date | Timestamp;
}

export interface ConnectionRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhoto?: string;
  fromUserRole: 'youth' | 'recruiter' | 'admin';
  toUserId: string;
  timestamp: Date | Timestamp;
  status: 'pending' | 'accepted' | 'declined';
}

/**
 * Send a connection request
 */
export const sendConnectionRequest = async (
  fromUserId: string,
  toUserId: string
): Promise<string> => {
  try {
    // Get user details
    const fromUserDoc = await getDoc(doc(db, 'users', fromUserId));
    const toUserDoc = await getDoc(doc(db, 'users', toUserId));

    if (!fromUserDoc.exists() || !toUserDoc.exists()) {
      throw new Error('User not found');
    }

    const fromUserData = fromUserDoc.data();
    const toUserData = toUserDoc.data();

    // Check if connection already exists
    const existingConnection = await checkConnectionExists(fromUserId, toUserId);
    if (existingConnection) {
      throw new Error('Connection already exists');
    }

    // Create connection request in outgoing requests
    const outgoingRef = doc(db, 'connection_requests', fromUserId, 'outgoing', toUserId);
    await setDoc(outgoingRef, {
      toUserId,
      timestamp: Timestamp.now(),
      status: 'pending',
    });

    // Create connection request in incoming requests
    const incomingRef = doc(db, 'connection_requests', toUserId, 'incoming', fromUserId);
    await setDoc(incomingRef, {
      fromUserId,
      fromUserName: fromUserData.displayName || fromUserData.firstName || 'Unknown',
      fromUserPhoto: fromUserData.profilePicture || fromUserData.photoURL,
      fromUserRole: fromUserData.role || 'youth',
      timestamp: Timestamp.now(),
      status: 'pending',
    });

    return incomingRef.id;
  } catch (error) {
    console.error('Error sending connection request:', error);
    throw error;
  }
};

/**
 * Accept a connection request
 */
export const acceptConnectionRequest = async (
  userId: string,
  fromUserId: string
): Promise<void> => {
  try {
    const batch = writeBatch(db);

    // Get user details
    const fromUserDoc = await getDoc(doc(db, 'users', fromUserId));
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!fromUserDoc.exists() || !userDoc.exists()) {
      throw new Error('User not found');
    }

    const fromUserData = fromUserDoc.data();
    const userData = userDoc.data();

    // Update incoming request status
    const incomingRef = doc(db, 'connection_requests', userId, 'incoming', fromUserId);
    batch.update(incomingRef, {
      status: 'accepted',
      acceptedAt: Timestamp.now(),
    });

    // Update outgoing request status
    const outgoingRef = doc(db, 'connection_requests', fromUserId, 'outgoing', userId);
    batch.update(outgoingRef, {
      status: 'accepted',
      acceptedAt: Timestamp.now(),
    });

    // Create connection for user
    const userConnectionRef = doc(db, 'connections', userId, 'connections', fromUserId);
    batch.set(userConnectionRef, {
      connectedUserId: fromUserId,
      connectedUserName: fromUserData.displayName || fromUserData.firstName || 'Unknown',
      connectedUserPhoto: fromUserData.profilePicture || fromUserData.photoURL,
      connectedUserRole: fromUserData.role || 'youth',
      connectedUserSkills: fromUserData.skills || [],
      status: 'accepted',
      initiatedBy: fromUserId,
      createdAt: Timestamp.now(),
      acceptedAt: Timestamp.now(),
    });

    // Create connection for the other user
    const otherConnectionRef = doc(db, 'connections', fromUserId, 'connections', userId);
    batch.set(otherConnectionRef, {
      connectedUserId: userId,
      connectedUserName: userData.displayName || userData.firstName || 'Unknown',
      connectedUserPhoto: userData.profilePicture || userData.photoURL,
      connectedUserRole: userData.role || 'youth',
      connectedUserSkills: userData.skills || [],
      status: 'accepted',
      initiatedBy: fromUserId,
      createdAt: Timestamp.now(),
      acceptedAt: Timestamp.now(),
    });

    await batch.commit();
  } catch (error) {
    console.error('Error accepting connection request:', error);
    throw error;
  }
};

/**
 * Decline a connection request
 */
export const declineConnectionRequest = async (
  userId: string,
  fromUserId: string
): Promise<void> => {
  try {
    const batch = writeBatch(db);

    // Update incoming request status
    const incomingRef = doc(db, 'connection_requests', userId, 'incoming', fromUserId);
    batch.update(incomingRef, {
      status: 'declined',
    });

    // Update outgoing request status
    const outgoingRef = doc(db, 'connection_requests', fromUserId, 'outgoing', userId);
    batch.update(outgoingRef, {
      status: 'declined',
    });

    await batch.commit();
  } catch (error) {
    console.error('Error declining connection request:', error);
    throw error;
  }
};

/**
 * Get user connections
 */
export const getUserConnections = async (userId: string): Promise<Connection[]> => {
  try {
    const connectionsRef = collection(db, 'connections', userId, 'connections');
    const q = query(connectionsRef, where('status', '==', 'accepted'), orderBy('acceptedAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      userId,
      connectedUserId: doc.data().connectedUserId,
      connectedUserName: doc.data().connectedUserName,
      connectedUserRole: doc.data().connectedUserRole,
      connectedUserPhoto: doc.data().connectedUserPhoto,
      connectedUserSkills: doc.data().connectedUserSkills || [],
      status: doc.data().status,
      initiatedBy: doc.data().initiatedBy,
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      acceptedAt: doc.data().acceptedAt?.toDate(),
    } as Connection));
  } catch (error) {
    console.error('Error getting user connections:', error);
    return [];
  }
};

/**
 * Get pending connection requests
 */
export const getPendingRequests = async (userId: string): Promise<ConnectionRequest[]> => {
  try {
    const incomingRef = collection(db, 'connection_requests', userId, 'incoming');
    const q = query(incomingRef, where('status', '==', 'pending'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      fromUserId: doc.data().fromUserId,
      fromUserName: doc.data().fromUserName,
      fromUserPhoto: doc.data().fromUserPhoto,
      fromUserRole: doc.data().fromUserRole,
      toUserId: userId,
      timestamp: doc.data().timestamp?.toDate() || new Date(),
      status: doc.data().status,
    } as ConnectionRequest));
  } catch (error) {
    console.error('Error getting pending requests:', error);
    return [];
  }
};

/**
 * Subscribe to connections
 */
export const subscribeToConnections = (
  userId: string,
  callback: (connections: Connection[]) => void
): (() => void) => {
  const connectionsRef = collection(db, 'connections', userId, 'connections');
  const q = query(connectionsRef, where('status', '==', 'accepted'), orderBy('acceptedAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const connections = snapshot.docs.map(doc => ({
      id: doc.id,
      userId,
      connectedUserId: doc.data().connectedUserId,
      connectedUserName: doc.data().connectedUserName,
      connectedUserRole: doc.data().connectedUserRole,
      connectedUserPhoto: doc.data().connectedUserPhoto,
      connectedUserSkills: doc.data().connectedUserSkills || [],
      status: doc.data().status,
      initiatedBy: doc.data().initiatedBy,
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      acceptedAt: doc.data().acceptedAt?.toDate(),
    } as Connection));
    callback(connections);
  });
};

/**
 * Subscribe to pending requests
 */
export const subscribeToPendingRequests = (
  userId: string,
  callback: (requests: ConnectionRequest[]) => void
): (() => void) => {
  const incomingRef = collection(db, 'connection_requests', userId, 'incoming');
  const q = query(incomingRef, where('status', '==', 'pending'), orderBy('timestamp', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      fromUserId: doc.data().fromUserId,
      fromUserName: doc.data().fromUserName,
      fromUserPhoto: doc.data().fromUserPhoto,
      fromUserRole: doc.data().fromUserRole,
      toUserId: userId,
      timestamp: doc.data().timestamp?.toDate() || new Date(),
      status: doc.data().status,
    } as ConnectionRequest));
    callback(requests);
  });
};

/**
 * Get people you may know (suggestions)
 */
export const getPeopleYouMayKnow = async (
  userId: string,
  limitCount: number = 10
): Promise<Array<{
  id: string;
  name: string;
  photo?: string;
  role: string;
  skills: string[];
  commonSkills: number;
}>> => {
  try {
    // Get current user's skills
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return [];

    const userData = userDoc.data();
    const userSkills = userData.skills || [];
    const userRole = userData.role || 'youth';

    // Get existing connections to exclude
    const connections = await getUserConnections(userId);
    const connectedUserIds = new Set(connections.map(c => c.connectedUserId));
    connectedUserIds.add(userId);

    // Get all users with similar skills
    const usersRef = collection(db, 'users');
    const allUsersSnapshot = await getDocs(usersRef);

    const suggestions = allUsersSnapshot.docs
      .filter(doc => {
        const data = doc.data();
        return (
          doc.id !== userId &&
          !connectedUserIds.has(doc.id) &&
          data.role !== 'admin' &&
          data.skills && Array.isArray(data.skills)
        );
      })
      .map(doc => {
        const data = doc.data();
        const skills = data.skills || [];
        const commonSkills = userSkills.filter((skill: string) =>
          skills.some((s: string) => s.toLowerCase() === skill.toLowerCase())
        ).length;

        return {
          id: doc.id,
          name: data.displayName || data.firstName || 'Unknown',
          photo: data.profilePicture || data.photoURL,
          role: data.role || 'youth',
          skills,
          commonSkills,
        };
      })
      .filter(s => s.commonSkills > 0 || userRole === 'recruiter') // Show recruiters to youth and vice versa
      .sort((a, b) => b.commonSkills - a.commonSkills)
      .slice(0, limitCount);

    return suggestions;
  } catch (error) {
    console.error('Error getting people you may know:', error);
    return [];
  }
};

/**
 * Check if connection exists
 */
export const checkConnectionExists = async (
  userId1: string,
  userId2: string
): Promise<boolean> => {
  try {
    const connectionRef = doc(db, 'connections', userId1, 'connections', userId2);
    const connectionDoc = await getDoc(connectionRef);
    return connectionDoc.exists();
  } catch (error) {
    return false;
  }
};

/**
 * Remove connection
 */
export const removeConnection = async (
  userId: string,
  connectedUserId: string
): Promise<void> => {
  try {
    const batch = writeBatch(db);

    // Remove from user's connections
    const userConnectionRef = doc(db, 'connections', userId, 'connections', connectedUserId);
    batch.delete(userConnectionRef);

    // Remove from other user's connections
    const otherConnectionRef = doc(db, 'connections', connectedUserId, 'connections', userId);
    batch.delete(otherConnectionRef);

    await batch.commit();
  } catch (error) {
    console.error('Error removing connection:', error);
    throw error;
  }
};

