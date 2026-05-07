// Role-based redirect to the proper dashboard.
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../lib/constants";
import Spinner from "../components/Spinner";

export default function Dashboard() {
  const { profile, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading || !profile) return;
    const map = {
      [ROLES.ADMIN]: "/admin/dashboard",
      [ROLES.EMPLOYER]: "/employer/dashboard",
      [ROLES.EMPLOYEE]: "/employee/dashboard",
    };
    navigate(map[profile.role] || "/unauthorized");
  }, [profile, loading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner />
    </div>
  );
}
