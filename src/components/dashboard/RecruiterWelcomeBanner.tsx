import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface RecruiterWelcomeBannerProps {
  name: string;
  onComplete: () => void;
}

export const RecruiterWelcomeBanner: React.FC<RecruiterWelcomeBannerProps> = ({ name, onComplete }) => {
  const { t } = useLanguage();

  return (
    <Card className="mb-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-2">{t('welcomeToTalentSearch')}, {name}!</h2>
        <p className="mb-4">
          {t('recruiterWelcomeMessage') || 'Start building your talent pool and find the perfect candidates for your team.'}
        </p>
        <Button
          onClick={onComplete}
          className="bg-white text-blue-600 hover:bg-gray-100"
        >
          {t('getStarted')}
        </Button>
      </div>
    </Card>
  );
};
