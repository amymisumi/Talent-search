import { Outlet } from 'react-router-dom';
import { YouthLayout } from '@/components/youth/YouthLayout';
import { DashboardHome } from './dashboard/DashboardHome';

const Dashboard = () => {
  return (
    <YouthLayout>
      <DashboardHome />
      <Outlet />
    </YouthLayout>
  );
};

export default Dashboard;
