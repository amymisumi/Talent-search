import React from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import ChatbotSection from '@/pages/dashboard/sections/ChatbotSection';

const AIAssistantPage = () => {
  return (
    <DashboardShell heading="AI Assistant" subheading="Get personalized career guidance">
      <div className="space-y-6">
        {/* AI Assistant Content */}
        <ChatbotSection />
      </div>
    </DashboardShell>
  );
};

export default AIAssistantPage;
