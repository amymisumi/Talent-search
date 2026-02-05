import React from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import RealTimeMessaging from '@/components/messaging/RealTimeMessaging';

const MessagingPage = () => {
  return (
    <DashboardShell heading="Messages" subheading="Communicate with recruiters and connections">
      <div className="space-y-6">
        {/* Real-Time Messaging Component */}
        <RealTimeMessaging />
      </div>
    </DashboardShell>
  );
};

export default MessagingPage;
