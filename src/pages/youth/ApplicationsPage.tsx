import React from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import ApplicationsSection from '@/pages/dashboard/sections/ApplicationsSection';

const ApplicationsPage = () => {
  return (
    <DashboardShell heading="Applications" subheading="Track your job applications">
      <div className="space-y-6">
        {/* Applications Content */}
        <ApplicationsSection />
      </div>
    </DashboardShell>
  );
};

export default ApplicationsPage;
