import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../context/AuthContext";
import Spinner from "./Spinner";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) {
      navigate("/login", { replace: true });
      return;
    }
    if (profile.mustChangePassword && location !== "/set-password") {
      navigate("/set-password", { replace: true });
      return;
    }
    if (allowedRoles && !allowedRoles.includes(profile.role)) {
      navigate("/unauthorized", { replace: true });
    }
  }, [user, profile, loading, location, allowedRoles, navigate]);

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }
  if (allowedRoles && !allowedRoles.includes(profile.role)) return null;
  return children;
}
