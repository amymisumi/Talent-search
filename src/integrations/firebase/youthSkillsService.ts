import { db, storage } from './client';
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
  onSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';

// Enhanced Skill interface matching requirements
export interface YouthSkill {
  id: string;
  userId: string;
  skillName: string;
  proficiencyLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  description?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// Get all skills for a user
export const getYouthSkills = async (userId: string): Promise<YouthSkill[]> => {
  try {
    const skillsRef = collection(db, 'users', userId, 'skills');
    const q = query(skillsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as YouthSkill[];
  } catch (error) {
    console.error('Error getting youth skills:', error);
    throw error;
  }
};

// Get a single skill
export const getYouthSkill = async (userId: string, skillId: string): Promise<YouthSkill | null> => {
  try {
    const skillRef = doc(db, 'users', userId, 'skills', skillId);
    const skillSnap = await getDoc(skillRef);
    
    if (!skillSnap.exists()) {
      return null;
    }
    
    return {
      id: skillSnap.id,
      ...skillSnap.data(),
      createdAt: skillSnap.data().createdAt?.toDate() || new Date(),
      updatedAt: skillSnap.data().updatedAt?.toDate() || new Date(),
    } as YouthSkill;
  } catch (error) {
    console.error('Error getting youth skill:', error);
    throw error;
  }
};

// Add a new skill
export const addYouthSkill = async (
  userId: string,
  skill: Omit<YouthSkill, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const skillsRef = collection(db, 'users', userId, 'skills');
    const skillRef = doc(skillsRef);
    
    const skillData = {
      userId,
      ...skill,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(skillRef, skillData);
    return skillRef.id;
  } catch (error) {
    console.error('Error adding youth skill:', error);
    throw error;
  }
};

// Update a skill
export const updateYouthSkill = async (
  userId: string,
  skillId: string,
  updates: Partial<Omit<YouthSkill, 'id' | 'userId' | 'createdAt'>>
): Promise<void> => {
  try {
    const skillRef = doc(db, 'users', userId, 'skills', skillId);
    await updateDoc(skillRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating youth skill:', error);
    throw error;
  }
};

// Delete a skill
export const deleteYouthSkill = async (userId: string, skillId: string): Promise<void> => {
  try {
    const skillRef = doc(db, 'users', userId, 'skills', skillId);
    await deleteDoc(skillRef);
  } catch (error) {
    console.error('Error deleting youth skill:', error);
    throw error;
  }
};

// Real-time listener for skills
export const subscribeToYouthSkills = (
  userId: string,
  callback: (skills: YouthSkill[]) => void
): (() => void) => {
  try {
    const skillsRef = collection(db, 'users', userId, 'skills');
    const q = query(skillsRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(
      q,
      (querySnapshot) => {
        const skills = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as YouthSkill[];
        callback(skills);
      },
      (error) => {
        console.error('Error in skills subscription:', error);
        callback([]);
      }
    );
  } catch (error) {
    console.error('Error setting up skills subscription:', error);
    return () => {};
  }
};
