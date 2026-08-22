import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { setupIframeMessaging } from './lib/iframe-messaging';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import TenantSetup from '@/pages/TenantSetup';
import TrialExpired from '@/components/shared/TrialExpired';
import { useEffect } from 'react';
import RoleGuard from '@/components/shared/RoleGuard';
import PageTransition from "@/components/shared/PageTransition";
import Landing from '@/pages/Landing';
import Storefront from '@/pages/Storefront';
import VendorDashboard from '@/pages/VendorDashboard';
import TenantManagement from '@/pages/TenantManagement';
import StaffSales from '@/pages/StaffSales';
import Returns from '@/pages/Returns';
import Warehouses from '@/pages/Warehouses';
import Categories from '@/pages/Categories';
import ActivityLog from '@/pages/ActivityLog';
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
  const location = useLocation();

  // On first login, if ?tid= is in the URL, claim that tenant for this user
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const params = new URLSearchParams(window.location.search);
    const tid = params.get('tid');
    if (!tid) return;
    if (user.tenant_id) {
      // Already has a tenant — just clean the URL
      const url = new URL(window.location.href);
      url.searchParams.delete('tid');
      window.history.replaceState({}, '', url.toString());
      return;
    }
    // Claim the tenant via backend
    base44.functions.invoke('claimTenant', { tenantId: tid })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['companies_check'] });
        // Clean the URL
        const url = new URL(window.location.href);
        url.searchParams.delete('tid');
        window.history.replaceState({}, '', url.toString());
      })
      .catch(console.error);
  }, [isAuthenticated, user]);

  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ["companies_check", user?.id],
    queryFn: async () => {
      // Invited users have tenant_id set — load that specific company
      if (user?.tenant_id) {
        try {
          const tenantCompanies = await base44.entities.Company.filter({ id: user.tenant_id });
          if (tenantCompanies.length > 0) return tenantCompanies;
        } catch (_) {}
      }
      // Owners/admins see only the company they created
      return base44.entities.Company.filter({ created_by_id: user?.id });
    },
    enabled: isAuthenticated && !!user,
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
  // Also skip if ?tid= is in the URL (claim hook will handle it after redirect)
  const hasTenantId = !!user?.tenant_id;
  const tidInUrl = new URLSearchParams(window.location.search).has('tid');

  // Subscription / trial gate — restricts the app (incl. checkout) once trial or subscription expires
  if (isAuthenticated && companies.length > 0 && !tidInUrl) {
    const company = companies[0];
    const now = new Date();
    const bypassPayment = user?.email === 'onyironkeoma@gmail.com';
    let expired = false;
    const isTrial = company.status === 'trial' || !company.status;
    if (isTrial) {
      const createdDate = new Date(company.created_date);
      const trialDuration = 14 * 24 * 60 * 60 * 1000;
      const fallbackEnd = new Date(createdDate.getTime() + trialDuration);
      const trialEnd = company.trial_ends_at
        ? new Date(Math.max(new Date(company.trial_ends_at).getTime(), fallbackEnd.getTime()))
        : fallbackEnd;
      if (now > trialEnd) expired = true;
    } else if (company.status === 'active' && company.subscription_end_date) {
      if (now > new Date(company.subscription_end_date)) expired = true;
    } else if (company.status === 'expired' || company.status === 'suspended') {
      expired = true;
    }
    if (!bypassPayment && expired) {
      return <TrialExpired company={company} />;
    }
  }

  // New tenant: authenticated user with no company and no tenant_id → show onboarding.
  // Only users who carry a tenant_id (invited staff) are added to existing tenants.
  if (isAuthenticated && companies.length === 0 && !hasTenantId && !tidInUrl) {
    return (
      <TenantSetup onComplete={() => queryClient.invalidateQueries({ queryKey: ["companies_check"] })} />
    );
  }

  // Render the main app, wrapped with role guard
  return (
    <RoleGuard user={user}>
      <PageTransition location={location}>
      <Routes location={location}>
        {/* Public storefront — no auth required, no layout */}
        <Route path="/store/:slug" element={<Storefront />} />
        {/* Landing page — unauthenticated entry point, no layout */}
        <Route path="/" element={<Landing />} />
        <Route path="/StaffSales" element={<LayoutWrapper currentPageName="StaffSales"><StaffSales /></LayoutWrapper>} />
        <Route path="/TenantManagement" element={<LayoutWrapper currentPageName="TenantManagement"><TenantManagement /></LayoutWrapper>} />
        <Route path="/VendorDashboard" element={<LayoutWrapper currentPageName="VendorDashboard"><VendorDashboard /></LayoutWrapper>} />
        <Route path="/Returns" element={<LayoutWrapper currentPageName="Returns"><Returns /></LayoutWrapper>} />
        <Route path="/Warehouses" element={<LayoutWrapper currentPageName="Warehouses"><Warehouses /></LayoutWrapper>} />
        <Route path="/Categories" element={<LayoutWrapper currentPageName="Categories"><Categories /></LayoutWrapper>} />
        <Route path="/ActivityLog" element={<LayoutWrapper currentPageName="ActivityLog"><ActivityLog /></LayoutWrapper>} />
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
      </PageTransition>
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