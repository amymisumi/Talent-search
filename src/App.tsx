import { useState, Suspense } from "react";
import Toaster, { ToastProvider } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import PortfolioPage from "@/pages/youth/PortfolioPage";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
// Import other pages
import CertificatesPage from "@/pages/youth/CertificatesPage";
import SkillsPage from "@/pages/youth/SkillsPage";
import AnalyticsPage from "@/pages/youth/AnalyticsPage";
import ConnectionsPage from "@/pages/youth/ConnectionsPage";
import JobMatchesPage from "@/pages/youth/JobMatchesPage";
import ApplicationsPage from "@/pages/youth/ApplicationsPage";
import MessagingPage from "@/pages/youth/MessagingPage";
import AIAssistantPage from "@/pages/youth/AIAssistantPage";
import LearningPage from "@/pages/youth/LearningPage";
import NetworkPage from "@/pages/youth/NetworkPage";
import SettingsPage from "@/pages/youth/SettingsPage";
import ReviewsAndRatingsPage from "@/pages/youth/ReviewsAndRatingsPage";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Login from "@/pages/Login";
import YouthSignup from "@/pages/YouthSignup";
import RecruiterSignup from "@/pages/RecruiterSignup";
import YouthDashboard from "@/pages/dashboard/YouthDashboard";
import ProfileEditor from "@/pages/youth/ProfileEditor";
import ProfileBuilder from "@/pages/dashboard/ProfileBuilder";
import DigitalCVBuilder from "@/pages/youth/DigitalCVBuilder";
import { RecruiterRouter } from "@/routes/recruiter";
import AdminDashboard from "@/pages/AdminDashboardNew";
import NotFound from "@/pages/NotFound";
import About from "./components/NewAbout";

// Add a loading spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
  </div>
);

// Protected route wrapper
const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'youth' | 'recruiter' | 'admin' }) => {
  const { currentUser, userData, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wait for userData to be loaded before checking role
  // This prevents redirects when userData is temporarily null
  if (!userData || !userData.role) {
    return <LoadingSpinner />;
  }

  // Check role if required
  if (requiredRole && userData.role !== requiredRole) {
    // Redirect based on actual role
    if (userData.role === 'recruiter') {
      return <Navigate to="/recruiter-dashboard" replace />;
    } else if (userData.role === 'youth') {
      return <Navigate to="/youth-dashboard" replace />;
    } else if (userData.role === 'admin') {
      return <Navigate to="/admin-dashboard" replace />;
    }
    // If no role, redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const App = () => {
  // Create QueryClient instance inside component to prevent React context issues
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <ErrorBoundary fallback={
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
        <p className="mb-4">We're sorry, but an unexpected error occurred. The error has been logged.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Reload Page
        </button>
      </div>
    }>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <ThemeProvider>
              <LanguageProvider>
                <AuthProvider>
                  <ToastProvider>
                    <Toaster />
                    <Suspense fallback={<LoadingSpinner />}>
                      <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/youth-signup" element={<YouthSignup />} />
                      <Route path="/recruiter-signup" element={<RecruiterSignup />} />
                      
                      {/* Protected Routes */}
                      <Route path="/youth-dashboard" element={
                        <ProtectedRoute requiredRole="youth">
                          <YouthDashboard />
                        </ProtectedRoute>
                      } />

                      <Route path="/youth/dashboard" element={
                        <ProtectedRoute requiredRole="youth">
                          <YouthDashboard />
                        </ProtectedRoute>
                      } />

                      <Route path="/recruiter/*" element={
                        <ProtectedRoute requiredRole="recruiter">
                          <RecruiterRouter />
                        </ProtectedRoute>
                      } />

                      <Route path="/recruiter-dashboard" element={
                        <ProtectedRoute requiredRole="recruiter">
                          <Navigate to="/recruiter/dashboard" replace />
                        </ProtectedRoute>
                      } />

                      <Route path="/admin-dashboard" element={
                        <ProtectedRoute>
                          <AdminDashboard />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/youth/profile/edit" element={
                        <ProtectedRoute requiredRole="youth">
                          <ProfileEditor />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/youth/profile" element={
                        <ProtectedRoute requiredRole="youth">
                          <ProfileBuilder />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/youth/cv-builder" element={
                        <ProtectedRoute requiredRole="youth">
                          <DigitalCVBuilder />
                        </ProtectedRoute>
                      } />

                      <Route path="/youth/portfolio" element={
                        <ProtectedRoute requiredRole="youth">
                          <PortfolioPage />
                        </ProtectedRoute>
                      } />

                      <Route path="/youth/certificates" element={
                        <ProtectedRoute requiredRole="youth">
                          <CertificatesPage />
                        </ProtectedRoute>
                      } />

                      <Route path="/youth/skills" element={
                        <ProtectedRoute requiredRole="youth">
                          <SkillsPage />
                        </ProtectedRoute>
                      } />

                      <Route path="/youth/analytics" element={
                        <ProtectedRoute requiredRole="youth">
                          <AnalyticsPage />
                        </ProtectedRoute>
                      } />

                      <Route path="/youth/connections" element={
                        <ProtectedRoute requiredRole="youth">
                          <ConnectionsPage />
                        </ProtectedRoute>
                      } />

                      <Route path="/youth/jobs" element={
                        <ProtectedRoute requiredRole="youth">
                          <JobMatchesPage />
                        </ProtectedRoute>
                      } />

                      <Route path="/youth/applications" element={
                        <ProtectedRoute requiredRole="youth">
                          <ApplicationsPage />
                        </ProtectedRoute>
                      } />

                      <Route path="/youth/messages" element={
                        <ProtectedRoute requiredRole="youth">
                          <MessagingPage />
                        </ProtectedRoute>
                      } />

                      <Route path="/youth/ai-assistant" element={
                        <ProtectedRoute requiredRole="youth">
                          <AIAssistantPage />
                        </ProtectedRoute>
                      } />

                      <Route path="/youth/network" element={
                        <ProtectedRoute requiredRole="youth">
                          <NetworkPage />
                        </ProtectedRoute>
                      } />

                      <Route path="/youth/settings" element={
                        <ProtectedRoute requiredRole="youth">
                          <SettingsPage />
                        </ProtectedRoute>
                      } />

                      <Route path="/youth/reviews" element={
                        <ProtectedRoute requiredRole="youth">
                          <ReviewsAndRatingsPage />
                        </ProtectedRoute>
                      } />

                      {/* Public Routes */}
                      <Route path="/about" element={<About />} />
                      <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </ToastProvider>
                </AuthProvider>
              </LanguageProvider>
            </ThemeProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
