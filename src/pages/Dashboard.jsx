import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../lib/constants";
import Spinner from "../components/Spinner";

export default function DashboardRedirect() {
  const { profile, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading || !profile) return;
    if (profile.role === ROLES.ADMIN)
      navigate("/admin/dashboard", { replace: true });
    else if (profile.role === ROLES.EMPLOYER)
      navigate("/employer/dashboard", { replace: true });
    else if (profile.role === ROLES.EMPLOYEE)
      navigate("/employee/dashboard", { replace: true });
    else navigate("/unauthorized", { replace: true });
  }, [profile, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Spinner />
    </div>
  );
}
