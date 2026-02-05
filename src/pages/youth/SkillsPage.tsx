import React from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import EnhancedSkillsSection from '@/pages/dashboard/sections/EnhancedSkillsSection';

const SkillsPage = () => {
  return (
    <DashboardShell heading="Skills" subheading="Manage and showcase your skills">
      <div className="space-y-6">
        {/* Skills Content */}
        <EnhancedSkillsSection />
      </div>
    </DashboardShell>
  );
};

export default SkillsPage;
