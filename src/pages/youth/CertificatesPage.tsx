import React from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import EnhancedCertificatesSection from '@/pages/dashboard/sections/EnhancedCertificatesSection';

const CertificatesPage = () => {
  return (
    <DashboardShell heading="Certificates" subheading="Manage your certifications and achievements">
      <div className="space-y-6">
        {/* Certificates Content */}
        <EnhancedCertificatesSection />
      </div>
    </DashboardShell>
  );
};

export default CertificatesPage;
