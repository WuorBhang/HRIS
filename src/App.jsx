// App router: AuthProvider + lazy-loaded pages with role guards.
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import { AuthProvider } from "./context/AuthContext";
import { ROLES } from "./lib/constants";
import ProtectedRoute from "./components/ProtectedRoute";
import Spinner from "./components/Spinner";
import Login from "./pages/Login";

const lazyPage = (path) => lazy(() => import(/* @vite-ignore */ path));

const Dashboard = lazy(() => import("./pages/Dashboard"));
const SetNewPassword = lazy(() => import("./pages/SetNewPassword"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const MyActivity = lazy(() => import("./pages/MyActivity"));
const Profile = lazy(() => import("./pages/Profile"));

const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminContracts = lazy(() => import("./pages/admin/Contracts"));
const AdminDocuments = lazy(() => import("./pages/admin/Documents"));
const AdminHolidays = lazy(() => import("./pages/admin/PublicHolidays"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AuditLogs"));

const EmployerDashboard = lazy(() => import("./pages/employer/Dashboard"));
const EmployerEmployees = lazy(() => import("./pages/employer/MyEmployees"));
const EmployerEmployeeDetail = lazy(
  () => import("./pages/employer/EmployeeDetail"),
);
const EmployerLeave = lazy(() => import("./pages/employer/LeaveRequests"));
const EmployerTimesheets = lazy(() => import("./pages/employer/Timesheets"));
const EmployerDocs = lazy(() => import("./pages/employer/Documents"));
const EmployerPayslips = lazy(() => import("./pages/employer/Payslips"));

const EmployeeDashboard = lazy(() => import("./pages/employee/Dashboard"));
const EmployeeLeave = lazy(() => import("./pages/employee/Leave"));
const EmployeeOvertime = lazy(() => import("./pages/employee/Overtime"));
const EmployeeHoliday = lazy(() => import("./pages/employee/Holiday"));
const EmployeeDocs = lazy(() => import("./pages/employee/Documents"));
const EmployeePayslips = lazy(() => import("./pages/employee/Payslips"));

// Protected wrapper.
const Guarded = ({ roles, children }) => (
  <ProtectedRoute allowedRoles={roles}>{children}</ProtectedRoute>
);

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Spinner />
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<Loader />}>
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/unauthorized" component={Unauthorized} />
          <Route path="/set-password">
            <Guarded>
              <SetNewPassword />
            </Guarded>
          </Route>

          <Route path="/dashboard">
            <Guarded>
              <Dashboard />
            </Guarded>
          </Route>
          <Route path="/profile">
            <Guarded>
              <Profile />
            </Guarded>
          </Route>
          <Route path="/change-password">
            <Guarded>
              <ChangePassword />
            </Guarded>
          </Route>
          <Route path="/my-activity">
            <Guarded>
              <MyActivity />
            </Guarded>
          </Route>

          {/* Admin */}
          <Route path="/admin/dashboard">
            <Guarded roles={[ROLES.ADMIN]}>
              <AdminDashboard />
            </Guarded>
          </Route>
          <Route path="/admin/profile">
            <Guarded roles={[ROLES.ADMIN]}>
              <Profile />
            </Guarded>
          </Route>
          <Route path="/admin/users">
            <Guarded roles={[ROLES.ADMIN]}>
              <AdminUsers />
            </Guarded>
          </Route>
          <Route path="/admin/contracts">
            <Guarded roles={[ROLES.ADMIN]}>
              <AdminContracts />
            </Guarded>
          </Route>
          <Route path="/admin/documents">
            <Guarded roles={[ROLES.ADMIN]}>
              <AdminDocuments />
            </Guarded>
          </Route>
          <Route path="/admin/public-holidays">
            <Guarded roles={[ROLES.ADMIN]}>
              <AdminHolidays />
            </Guarded>
          </Route>
          <Route path="/admin/audit-logs">
            <Guarded roles={[ROLES.ADMIN]}>
              <AdminAuditLogs />
            </Guarded>
          </Route>
          <Route path="/admin/salary-advances">
            <Guarded roles={[ROLES.ADMIN]}>
              <ComingSoon
                title="Salary advances"
                description="Approve and track salary advances."
              />
            </Guarded>
          </Route>

          {/* Employer */}
          <Route path="/employer/dashboard">
            <Guarded roles={[ROLES.EMPLOYER]}>
              <EmployerDashboard />
            </Guarded>
          </Route>
          <Route path="/employer/profile">
            <Guarded roles={[ROLES.EMPLOYER]}>
              <Profile />
            </Guarded>
          </Route>
          <Route path="/employer/employees">
            <Guarded roles={[ROLES.EMPLOYER]}>
              <EmployerEmployees />
            </Guarded>
          </Route>
          <Route path="/employer/employees/:contractId">
            <Guarded roles={[ROLES.EMPLOYER]}>
              <EmployerEmployeeDetail />
            </Guarded>
          </Route>
          <Route path="/employer/leave-requests">
            <Guarded roles={[ROLES.EMPLOYER]}>
              <EmployerLeave />
            </Guarded>
          </Route>
          <Route path="/employer/timesheets">
            <Guarded roles={[ROLES.EMPLOYER]}>
              <EmployerTimesheets />
            </Guarded>
          </Route>
          <Route path="/employer/documents">
            <Guarded roles={[ROLES.EMPLOYER]}>
              <EmployerDocs />
            </Guarded>
          </Route>
          <Route path="/employer/payslips">
            <Guarded roles={[ROLES.EMPLOYER]}>
              <EmployerPayslips />
            </Guarded>
          </Route>

          {/* Employee */}
          <Route path="/employee/dashboard">
            <Guarded roles={[ROLES.EMPLOYEE]}>
              <EmployeeDashboard />
            </Guarded>
          </Route>
          <Route path="/employee/profile">
            <Guarded roles={[ROLES.EMPLOYEE]}>
              <Profile />
            </Guarded>
          </Route>
          <Route path="/employee/leave">
            <Guarded roles={[ROLES.EMPLOYEE]}>
              <EmployeeLeave />
            </Guarded>
          </Route>
          <Route path="/employee/overtime">
            <Guarded roles={[ROLES.EMPLOYEE]}>
              <EmployeeOvertime />
            </Guarded>
          </Route>
          <Route path="/employee/holiday">
            <Guarded roles={[ROLES.EMPLOYEE]}>
              <EmployeeHoliday />
            </Guarded>
          </Route>
          <Route path="/employee/documents">
            <Guarded roles={[ROLES.EMPLOYEE]}>
              <EmployeeDocs />
            </Guarded>
          </Route>
          <Route path="/employee/payslips">
            <Guarded roles={[ROLES.EMPLOYEE]}>
              <EmployeePayslips />
            </Guarded>
          </Route>

          <Route path="/">
            <Guarded>
              <Dashboard />
            </Guarded>
          </Route>
          <Route>
            <Guarded>
              <Dashboard />
            </Guarded>
          </Route>
        </Switch>
      </Suspense>
    </AuthProvider>
  );
}
