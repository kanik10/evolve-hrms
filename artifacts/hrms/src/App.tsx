import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';

import Dashboard from './pages/Dashboard';
import {
  CompanyProfile,
  Departments,
  Designations,
  Locations,
  BusinessUnits,
  CostCenters,
  Grades,
  EmploymentTypes,
  HolidayCalendar,
  ShiftManagement,
  LeavePolicies,
  SalaryStructures,
} from './features/organization';

import DesignationDetailPage from './features/organization/designations/pages/DesignationDetailPage';
import DepartmentDetailPage from './features/organization/departments/pages/DepartmentDetailPage';
import Employees from './pages/Employees';
import Import from './pages/Import';
import SkeletonPage from './pages/SkeletonPage';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      
      <Route path="/dashboard" component={Dashboard} />
      
      <Route path="/organization/company" component={CompanyProfile} />
      <Route path="/organization/departments/:id" component={DepartmentDetailPage} />
      <Route path="/organization/departments" component={Departments} />
      <Route path="/organization/designations/:id" component={DesignationDetailPage} />
      <Route path="/organization/designations" component={Designations} />
      <Route path="/organization/locations" component={Locations} />
      <Route path="/organization/business-units" component={BusinessUnits} />
      <Route path="/organization/cost-centers" component={CostCenters} />
      <Route path="/organization/grades" component={Grades} />
      <Route path="/organization/employment-types" component={EmploymentTypes} />
      <Route path="/organization/holiday-calendar" component={HolidayCalendar} />
      <Route path="/organization/shifts" component={ShiftManagement} />
      <Route path="/organization/leave-policies" component={LeavePolicies} />
      <Route path="/organization/salary-structures" component={SalaryStructures} />

      <Route path="/employees" component={Employees} />
      
      <Route path="/import" component={Import} />

      <Route path="/attendance">
        <SkeletonPage title="Attendance Dashboard" description="Overview of today's attendance." />
      </Route>
      <Route path="/leave">
        <SkeletonPage title="Leave Dashboard" description="Overview of pending and approved leaves." />
      </Route>
      <Route path="/payroll">
        <SkeletonPage title="Payroll Dashboard" description="Manage payroll cycles and processing." />
      </Route>
      <Route path="/performance">
        <SkeletonPage title="Performance Dashboard" description="Manage OKRs, KPIs, and reviews." />
      </Route>
      <Route path="/reports">
        <SkeletonPage title="Reports" description="Generate and view HR reports." />
      </Route>
      <Route path="/ai">
        <SkeletonPage title="AI Insights" description="Predictive attrition, hiring recommendations." />
      </Route>
      <Route path="/documents">
        <SkeletonPage title="Documents" description="Centralized document repository." />
      </Route>
      <Route path="/approvals">
        <SkeletonPage title="Approvals" description="Centralized approval inbox." />
      </Route>
      <Route path="/administration">
        <SkeletonPage title="Users" description="Manage system users and accounts." />
      </Route>
      <Route path="/administration/roles">
        <SkeletonPage title="Roles" description="Define and manage access roles." />
      </Route>
      <Route path="/administration/permissions">
        <SkeletonPage title="Permissions" description="Configure granular permission sets." />
      </Route>
      <Route path="/administration/audit-logs">
        <SkeletonPage title="Audit Logs" description="View all system activity and changes." />
      </Route>
      <Route path="/administration/settings">
        <SkeletonPage title="System Settings" description="Platform-wide configuration and preferences." />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
