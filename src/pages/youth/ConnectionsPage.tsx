import React from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import ConnectionsSection from '@/pages/dashboard/sections/ConnectionsSection';

const ConnectionsPage = () => {
  return (
    <DashboardShell heading="Connections" subheading="Manage your professional network">
      <div className="space-y-6">
        {/* Connections Content */}
        <ConnectionsSection />
      </div>
    </DashboardShell>
  );
};

export default ConnectionsPage;
