import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent, AnalyticsEventType } from '@/services/analyticsService';

/**
 * Hook for tracking analytics events
 * Usage: const { track } = useAnalytics();
 * track('profile_viewed', { recruiterId: '...' });
 */
export const useAnalytics = () => {
  const { currentUser } = useAuth();

  const track = useCallback(
    async (type: AnalyticsEventType, metadata?: { [key: string]: any }) => {
      if (!currentUser?.uid) return;

      try {
        await trackEvent(currentUser.uid, type, metadata);
      } catch (error) {
        console.error('Error tracking event:', error);
        // Don't throw - analytics failures shouldn't break the app
      }
    },
    [currentUser]
  );

  return { track };
};

