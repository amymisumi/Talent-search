import React from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import ReviewsAndRatingsSection from '@/pages/dashboard/sections/ReviewsAndRatingsSection';
import { useLanguage } from '@/contexts/LanguageContext';

const ReviewsAndRatingsPage = () => {
  const { t } = useLanguage();
  
  return (
    <DashboardShell 
      heading={t('reviewsAndRatingsTitle')} 
      subheading={t('reviewsAndRatingsSubtitle')}
    >
      <div className="space-y-6">
        {/* Reviews & Ratings Content */}
        <ReviewsAndRatingsSection />
      </div>
    </DashboardShell>
  );
};

export default ReviewsAndRatingsPage;
