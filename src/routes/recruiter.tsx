import { Outlet, Route, Routes } from "react-router-dom";
import { RecruiterLayout } from "@/components/dashboard/RecruiterLayout";
import { DashboardPage } from "@/pages/recruiter/DashboardPage";
import { DashboardOverviewEnhanced } from "@/components/dashboard/DashboardOverviewEnhanced";
import { EnhancedTalentSearch } from "@/components/dashboard/EnhancedTalentSearch";
import { ATSKanbanBoard } from "@/components/dashboard/ATSKanbanBoard";
import { MessagingCenter } from "@/components/dashboard/MessagingCenter";
import { RecruiterProfileManagement } from "@/components/dashboard/RecruiterProfileManagement";
import { EnhancedJobPostingModule } from "@/components/dashboard/EnhancedJobPostingModule";
import { EnhancedShortlistManagement } from "@/components/dashboard/EnhancedShortlistManagement";
import { EnhancedInterviewManagement } from "@/components/dashboard/EnhancedInterviewManagement";
import { EnhancedAnalyticsDashboard } from "@/components/dashboard/EnhancedAnalyticsDashboard";
import { EnhancedRecruiterSettings } from "@/components/dashboard/EnhancedRecruiterSettings";
import { CandidateProfileView } from "@/components/dashboard/CandidateProfileView";
import { NetworkingCenter } from "@/components/dashboard/NetworkingCenter";
import { RatingsAndReviews } from "@/components/dashboard/RatingsAndReviews";
import { JobTemplates } from "@/components/dashboard/JobTemplates";

export function RecruiterRouter() {
  return (
    <Routes>
      <Route
        element={
          <RecruiterLayout>
            <Outlet />
          </RecruiterLayout>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="find-talent" element={<EnhancedTalentSearch />} />
        <Route path="jobs" element={<EnhancedJobPostingModule />} />
        <Route path="jobs/new" element={<EnhancedJobPostingModule />} />
        <Route path="jobs/templates" element={<JobTemplates />} />
        <Route path="applications" element={<ATSKanbanBoard />} />
        <Route path="applications/list" element={<ATSKanbanBoard />} />
        <Route path="shortlist" element={<EnhancedShortlistManagement />} />
        <Route path="compare" element={<EnhancedShortlistManagement />} />
        <Route path="interviews" element={<EnhancedInterviewManagement />} />
        <Route path="interviews/new" element={<EnhancedInterviewManagement />} />
        <Route path="messages" element={<MessagingCenter />} />
        <Route path="analytics" element={<EnhancedAnalyticsDashboard />} />
        <Route path="profile" element={<RecruiterProfileManagement />} />
        <Route path="settings" element={<EnhancedRecruiterSettings />} />
        <Route path="notifications" element={<div>Notifications Page</div>} />
        <Route path="network" element={<NetworkingCenter />} />
        <Route path="ratings" element={<RatingsAndReviews />} />
        <Route path="candidates/:id" element={<CandidateProfileView />} />
      </Route>
    </Routes>
  );
}
