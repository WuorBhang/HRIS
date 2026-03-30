import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Documents from "./pages/Documents";
import UserManagement from "./pages/UserManagement";
import Unauthorized from "./pages/Unauthorized";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/unauthorized" component={Unauthorized} />
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/employees">
        <ProtectedRoute allowedRoles={["admin", "it-expert", "employer"]}>
          <Employees />
        </ProtectedRoute>
      </Route>
      <Route path="/documents">
        <ProtectedRoute allowedRoles={["admin", "it-expert", "employer"]}>
          <Documents />
        </ProtectedRoute>
      </Route>
      <Route path="/users">
        <ProtectedRoute allowedRoles={["admin"]}>
          <UserManagement />
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
