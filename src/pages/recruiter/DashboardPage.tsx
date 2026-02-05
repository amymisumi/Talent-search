import { useNavigate } from 'react-router-dom';
import { RecruiterDashboardOverview } from '@/components/dashboard/RecruiterDashboardOverview';

export function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <RecruiterDashboardOverview onNavigate={(path) => navigate(path)} />
    </div>
  );
}
