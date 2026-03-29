import { useAuth } from "../context/AuthContext";
import { Redirect } from "wouter";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#1B4F72] font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Redirect to="/unauthorized" />;
  }

  return children;
}
