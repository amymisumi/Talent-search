import React from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

const LearningPage = () => {
  return (
    <DashboardShell heading="Learning" subheading="Continue your professional development">
      <div className="space-y-6">
        {/* Learning Content */}
        <Card>
          <CardHeader>
            <CardTitle>Learning Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>Learning resources coming soon...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
};

export default LearningPage;
