// App shell with role-based sidebar nav and mobile drawer.
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  FileText,
  FolderClosed,
  Coins,
  CalendarDays,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  Briefcase,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../lib/constants";
import { AUDIT, logAction, labelForPath } from "../lib/audit";
import Avatar from "./Avatar";

const NAV = {
  [ROLES.ADMIN]: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/users", label: "User Management", icon: Users },
    { to: "/admin/contracts", label: "Contracts", icon: Briefcase },
    { to: "/admin/documents", label: "Documents", icon: FolderClosed },
    { to: "/admin/salary-advances", label: "Salary Advances", icon: Coins },
    {
      to: "/admin/public-holidays",
      label: "Public Holidays",
      icon: CalendarDays,
    },
    { to: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
    { to: "/admin/profile", label: "My Profile", icon: Settings },
  ],
  [ROLES.EMPLOYER]: [
    { to: "/employer/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/employer/employees", label: "My Employees", icon: Users },
    { to: "/employer/leave-requests", label: "Leave Requests", icon: FileText },
    { to: "/employer/timesheets", label: "Timesheets", icon: ScrollText },
    { to: "/employer/documents", label: "Documents", icon: FolderClosed },
    { to: "/my-activity", label: "My Activity", icon: ScrollText },
    { to: "/employer/profile", label: "My Profile", icon: Settings },
  ],
  [ROLES.EMPLOYEE]: [
    { to: "/employee/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/employee/leave", label: "Leave Request", icon: FileText },
    { to: "/employee/holiday", label: "Holiday Work", icon: CalendarDays },
    { to: "/employee/overtime", label: "Overtime", icon: ScrollText },
    { to: "/employee/documents", label: "My Documents", icon: FolderClosed },
    { to: "/my-activity", label: "My Activity", icon: ScrollText },
    { to: "/employee/profile", label: "My Profile", icon: Settings },
  ],
};

// Single nav link.
const NavLink = ({ to, label, icon: Icon, active, onClick }) => (
  <Link href={to} onClick={onClick}>
    <span
      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm cursor-pointer transition ${
        active
          ? "bg-accent text-white font-semibold"
          : "text-white/80 hover:bg-white/10"
      }`}
    >
      <Icon className="w-5 h-5" /> {label}
    </span>
  </Link>
);

export default function Layout({ children }) {
  const { profile, signOut } = useAuth();
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const links = NAV[profile?.role] || [];
  const profilePath =
    profile?.role === ROLES.ADMIN
      ? "/admin/profile"
      : profile?.role === ROLES.EMPLOYER
        ? "/employer/profile"
        : profile?.role === ROLES.EMPLOYEE
          ? "/employee/profile"
          : "/profile";

  // Close drawer on route change.
  useEffect(() => setOpen(false), [location]);

  // Audit page views for the signed-in user (admin, employer, employee).
  // Tracks "what tasks/pages users open" so the admin audit shows app usage.
  useEffect(() => {
    if (!profile?.id || !location) return;
    // Strip query/hash and ignore noisy auth-only paths.
    const path = location.split("?")[0].split("#")[0];
    if (path === "/login" || path === "/unauthorized") return;
    const t = setTimeout(() => {
      logAction(AUDIT.PAGE_VIEW, profile.id, profile.role, {
        path,
        page: labelForPath(path),
      });
    }, 250);
    return () => clearTimeout(t);
  }, [location, profile?.id, profile?.role]);

  const onSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // Sidebar inner.
  const Sidebar = ({ onNav } = {}) => (
    <div className="flex flex-col h-full bg-primary text-white">
      <div className="p-5 flex items-center gap-3 border-b border-white/10">
        <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center font-bold text-primary">
          SH
        </div>
        <div>
          <div className="font-bold leading-tight">SafiHub HRIS</div>
          <div className="text-xs text-white/60 capitalize">
            {profile?.role}
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            {...l}
            active={location === l.to || location.startsWith(l.to + "/")}
            onClick={onNav}
          />
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <Link href={profilePath} onClick={onNav}>
          <div
            className="flex items-center gap-3 px-2 py-2 mb-2 rounded-md hover:bg-white/10 cursor-pointer"
            title="View my profile"
          >
            <Avatar
              fullName={profile?.fullName}
              photoURL={profile?.photoURL}
              size={36}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">
                {profile?.fullName || "—"}
              </div>
              <div className="text-[11px] text-white/60 truncate">
                {profile?.email}
              </div>
            </div>
          </div>
        </Link>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-white/90 hover:bg-white/10"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:block fixed inset-y-0 left-0 w-64 z-30">
        <Sidebar />
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-20 bg-primary text-white flex items-center justify-between px-4 h-14 shadow">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center font-bold text-primary text-sm">
            SH
          </div>
          <span className="font-semibold">SafiHub HRIS</span>
        </div>
        <button onClick={() => setOpen(true)} className="p-2">
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="w-72 max-w-[85%] relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 z-10 text-white/80 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar onNav={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main className="md:ml-64 p-4 sm:p-6 lg:p-8 max-w-7xl">{children}</main>
    </div>
  );
}
