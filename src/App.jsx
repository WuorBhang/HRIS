import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUserManagement from "./pages/admin/UserManagement";
import ContractManagement from "./pages/admin/ContractManagement";
import AdminDocumentManagement from "./pages/admin/DocumentManagement";
import AuditLogs from "./pages/admin/AuditLogs";
import SalaryAdvances from "./pages/admin/SalaryAdvances";
import PublicHolidays from "./pages/admin/PublicHolidays";

// Employer pages
import EmployerDashboard from "./pages/employer/Dashboard";
import ManageEmployee from "./pages/employer/ManageEmployee";
import TimesheetApproval from "./pages/employer/TimesheetApproval";
import Documents from "./pages/Documents";

// Employee pages
import EmployeeDashboard from "./pages/employee/Dashboard";
import LeaveRequest from "./pages/employee/LeaveRequest";
import OvertimeReport from "./pages/employee/OvertimeReport";
import MyDocuments from "./pages/employee/MyDocuments";

// Shared pages
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

// Redirect /dashboard to the role-appropriate dashboard
function DashboardRedirect() {
  const { role, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (role === "admin" || role === "it-expert") {
      navigate("/admin/dashboard", { replace: true });
    } else if (role === "employer") {
      navigate("/employer/dashboard", { replace: true });
    } else if (role === "employee") {
      navigate("/employee/dashboard", { replace: true });
    }
  }, [role, loading]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/unauthorized" component={Unauthorized} />

      {/* Role-based dashboard hub */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <DashboardRedirect />
        </ProtectedRoute>
      </Route>

      {/* ── Admin routes ───────────────────────────────── */}
      <Route path="/admin/dashboard">
        <ProtectedRoute allowedRoles={["admin", "it-expert"]}>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute allowedRoles={["admin", "it-expert"]}>
          <AdminUserManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/contracts">
        <ProtectedRoute allowedRoles={["admin", "it-expert"]}>
          <ContractManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/documents">
        <ProtectedRoute allowedRoles={["admin", "it-expert"]}>
          <AdminDocumentManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/audit">
        <ProtectedRoute allowedRoles={["admin", "it-expert"]}>
          <AuditLogs />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/salary-advances">
        <ProtectedRoute allowedRoles={["admin", "it-expert"]}>
          <SalaryAdvances />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/holidays">
        <ProtectedRoute allowedRoles={["admin", "it-expert"]}>
          <PublicHolidays />
        </ProtectedRoute>
      </Route>

      {/* ── Employer routes ────────────────────────────── */}
      <Route path="/employer/dashboard">
        <ProtectedRoute allowedRoles={["employer"]}>
          <EmployerDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/employer/employees">
        <ProtectedRoute allowedRoles={["employer"]}>
          <ManageEmployee />
        </ProtectedRoute>
      </Route>
      <Route path="/employer/leave">
        <ProtectedRoute allowedRoles={["employer"]}>
          <ManageEmployee />
        </ProtectedRoute>
      </Route>
      <Route path="/employer/timesheets">
        <ProtectedRoute allowedRoles={["employer"]}>
          <TimesheetApproval />
        </ProtectedRoute>
      </Route>
      <Route path="/employer/documents">
        <ProtectedRoute allowedRoles={["employer"]}>
          <Documents />
        </ProtectedRoute>
      </Route>

      {/* ── Employee routes ────────────────────────────── */}
      <Route path="/employee/dashboard">
        <ProtectedRoute allowedRoles={["employee"]}>
          <EmployeeDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/leave">
        <ProtectedRoute allowedRoles={["employee"]}>
          <LeaveRequest />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/overtime">
        <ProtectedRoute allowedRoles={["employee"]}>
          <OvertimeReport />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/documents">
        <ProtectedRoute allowedRoles={["employee"]}>
          <MyDocuments />
        </ProtectedRoute>
      </Route>

      {/* ── Shared routes ──────────────────────────────── */}
      <Route path="/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>

      {/* ── Legacy routes (backward compat) ───────────── */}
      <Route path="/employees">
        <ProtectedRoute allowedRoles={["admin", "it-expert", "employer"]}>
          <ManageEmployee />
        </ProtectedRoute>
      </Route>
      <Route path="/documents">
        <ProtectedRoute allowedRoles={["admin", "it-expert", "employer"]}>
          <Documents />
        </ProtectedRoute>
      </Route>
      <Route path="/users">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminUserManagement />
        </ProtectedRoute>
      </Route>

      <Route>
        <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#1B4F72] mb-2">
              404 — Page Not Found
            </h1>
            <a href="/login" className="text-[#1B4F72] underline">
              Go to login
            </a>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
