import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Spinner from "./components/Spinner";
import { ROLES } from "./lib/constants";

// Login is the first thing users see, so keep it eager — splitting it
// would only add a flash of spinner on the very first paint.
import Login from "./pages/Login";

// Everything else is loaded on demand. This keeps the initial JS bundle
// small (Firebase + login only) so the app boots fast, and the rest of
// the app (admin/employer/employee pages) loads in the background as
// the user navigates.
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const DashboardRedirect = lazy(() => import("./pages/Dashboard"));
const SetNewPassword = lazy(() => import("./pages/SetNewPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));

const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminContracts = lazy(() => import("./pages/admin/Contracts"));
const AdminPublicHolidays = lazy(() => import("./pages/admin/PublicHolidays"));
const AdminDocuments = lazy(() => import("./pages/admin/Documents"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const MyActivity = lazy(() => import("./pages/MyActivity"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));

const EmployerDashboard = lazy(() => import("./pages/employer/Dashboard"));
const EmployerMyEmployees = lazy(() => import("./pages/employer/MyEmployees"));
const EmployerLeaveRequests = lazy(
  () => import("./pages/employer/LeaveRequests"),
);
const EmployerTimesheets = lazy(() => import("./pages/employer/Timesheets"));
const EmployerDocuments = lazy(() => import("./pages/employer/Documents"));
const EmployerPayslips = lazy(() => import("./pages/employer/Payslips"));
const EmployerStatutory = lazy(() => import("./pages/employer/Statutory"));

const EmployeeDashboard = lazy(() => import("./pages/employee/Dashboard"));
const ReportHoliday = lazy(() => import("./pages/employee/Holiday"));
const ReportOvertime = lazy(() => import("./pages/employee/Overtime"));
const LeaveRequest = lazy(() => import("./pages/employee/Leave"));
const EmployeeDocuments = lazy(() => import("./pages/employee/Documents"));
const EmployeePayslips = lazy(() => import("./pages/employee/Payslips"));
const EmployeeStatutory = lazy(() => import("./pages/employee/Statutory"));

function PageFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <Spinner />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/login" component={Login} />
        <Route path="/unauthorized" component={Unauthorized} />

        <Route path="/set-password">
          <ProtectedRoute>
            <SetNewPassword />
          </ProtectedRoute>
        </Route>

        <Route path="/dashboard">
          <ProtectedRoute>
            <DashboardRedirect />
          </ProtectedRoute>
        </Route>

        <Route path="/profile">
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        </Route>

        <Route path="/change-password">
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        </Route>

        <Route path="/admin/dashboard">
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <AdminDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/users">
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <AdminUsers />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/contracts">
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <AdminContracts />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/documents">
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <AdminDocuments />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/salary-advances">
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <ComingSoon
              title="Salary Advances"
              description="Track and approve salary advance requests from employees."
            />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/public-holidays">
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <AdminPublicHolidays />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/audit-logs">
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <AdminAuditLogs />
          </ProtectedRoute>
        </Route>

        <Route path="/my-activity">
          <ProtectedRoute>
            <MyActivity />
          </ProtectedRoute>
        </Route>

        <Route path="/employer/dashboard">
          <ProtectedRoute allowedRoles={[ROLES.EMPLOYER]}>
            <EmployerDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/employer/employees">
          <ProtectedRoute allowedRoles={[ROLES.EMPLOYER]}>
            <EmployerMyEmployees />
          </ProtectedRoute>
        </Route>
        <Route path="/employer/leave-requests">
          <ProtectedRoute allowedRoles={[ROLES.EMPLOYER]}>
            <EmployerLeaveRequests />
          </ProtectedRoute>
        </Route>
        <Route path="/employer/timesheets">
          <ProtectedRoute allowedRoles={[ROLES.EMPLOYER]}>
            <EmployerTimesheets />
          </ProtectedRoute>
        </Route>
        <Route path="/employer/documents">
          <ProtectedRoute allowedRoles={[ROLES.EMPLOYER]}>
            <EmployerDocuments />
          </ProtectedRoute>
        </Route>
        <Route path="/employer/payslips">
          <ProtectedRoute allowedRoles={[ROLES.EMPLOYER]}>
            <EmployerPayslips />
          </ProtectedRoute>
        </Route>
        <Route path="/employer/statutory">
          <ProtectedRoute allowedRoles={[ROLES.EMPLOYER]}>
            <EmployerStatutory />
          </ProtectedRoute>
        </Route>

        <Route path="/employee/dashboard">
          <ProtectedRoute allowedRoles={[ROLES.EMPLOYEE]}>
            <EmployeeDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/employee/holiday">
          <ProtectedRoute allowedRoles={[ROLES.EMPLOYEE]}>
            <ReportHoliday />
          </ProtectedRoute>
        </Route>
        <Route path="/employee/overtime">
          <ProtectedRoute allowedRoles={[ROLES.EMPLOYEE]}>
            <ReportOvertime />
          </ProtectedRoute>
        </Route>
        <Route path="/employee/leave">
          <ProtectedRoute allowedRoles={[ROLES.EMPLOYEE]}>
            <LeaveRequest />
          </ProtectedRoute>
        </Route>
        <Route path="/employee/documents">
          <ProtectedRoute allowedRoles={[ROLES.EMPLOYEE]}>
            <EmployeeDocuments />
          </ProtectedRoute>
        </Route>
        <Route path="/employee/payslips">
          <ProtectedRoute allowedRoles={[ROLES.EMPLOYEE]}>
            <EmployeePayslips />
          </ProtectedRoute>
        </Route>
        <Route path="/employee/statutory">
          <ProtectedRoute allowedRoles={[ROLES.EMPLOYEE]}>
            <EmployeeStatutory />
          </ProtectedRoute>
        </Route>

        <Route>
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-primary mb-2">
                404 — Page not found
              </h1>
              <a href="/login" className="text-primary underline">
                Go to sign in
              </a>
            </div>
          </div>
        </Route>
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
