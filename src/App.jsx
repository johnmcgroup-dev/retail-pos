import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { setupIframeMessaging } from './lib/iframe-messaging';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import TenantSetup from '@/pages/TenantSetup';
import RoleGuard from '@/components/shared/RoleGuard';
import Landing from '@/pages/Landing';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

setupIframeMessaging();

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ["companies_check"],
    queryFn: () => base44.entities.Company.list(),
    enabled: isAuthenticated,
    staleTime: 60000,
  });

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth || (isAuthenticated && isLoadingCompanies)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Show landing page instead of immediately redirecting
      return (
        <Routes>
          <Route path="*" element={<Landing />} />
        </Routes>
      );
    }
  }

  // Invited users carry a tenant_id on their profile — skip onboarding if set
  const hasTenantId = !!user?.tenant_id;

  // New tenant: authenticated user with no company and no tenant_id → show onboarding
  // (invited users always have tenant_id set, so they skip this)
  if (isAuthenticated && companies.length === 0 && !hasTenantId && user?.role !== 'user') {
    return (
      <TenantSetup onComplete={() => queryClient.invalidateQueries({ queryKey: ["companies_check"] })} />
    );
  }

  // Render the main app, wrapped with role guard
  return (
    <RoleGuard user={user}>
      <Routes>
        {/* Landing page — unauthenticated entry point, no layout */}
        <Route path="/" element={<Landing />} />
        {/* All named app pages with layout */}
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={<LayoutWrapper currentPageName={path}><Page /></LayoutWrapper>}
          />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </RoleGuard>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App