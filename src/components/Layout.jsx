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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../lib/constants";

const navByRole = {
  [ROLES.ADMIN]: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/users", label: "User Management", icon: Users },
    { to: "/admin/contracts", label: "Contracts", icon: FileText },
    { to: "/admin/documents", label: "Documents", icon: FolderClosed },
    { to: "/admin/salary-advances", label: "Salary Advances", icon: Coins },
    {
      to: "/admin/public-holidays",
      label: "Public Holidays",
      icon: CalendarDays,
    },
    { to: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
    { to: "/profile", label: "My Profile", icon: Settings },
  ],
  [ROLES.EMPLOYER]: [
    { to: "/employer/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/employer/employees", label: "My Employees", icon: Users },
    { to: "/employer/leave-requests", label: "Leave Requests", icon: FileText },
    { to: "/employer/timesheets", label: "Timesheets", icon: ScrollText },
    { to: "/employer/documents", label: "Documents", icon: FolderClosed },
    { to: "/my-activity", label: "My Activity", icon: ScrollText },
    { to: "/profile", label: "My Profile", icon: Settings },
  ],
  [ROLES.EMPLOYEE]: [
    { to: "/employee/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/employee/leave", label: "Leave Request", icon: FileText },
    { to: "/employee/holiday", label: "Holiday Work", icon: CalendarDays },
    { to: "/employee/overtime", label: "Overtime", icon: ScrollText },
    { to: "/employee/documents", label: "My Documents", icon: FolderClosed },
    { to: "/my-activity", label: "My Activity", icon: ScrollText },
    { to: "/profile", label: "My Profile", icon: Settings },
  ],
};

export default function Layout({ children }) {
  const { profile, signOut } = useAuth();
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState(false);

  const links = navByRole[profile?.role] || [];

  // Close mobile drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [location]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const initial = (profile?.fullName || profile?.email || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  const roleLabel = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : "";

  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
        <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-white font-bold shrink-0">
          SH
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-white truncate">SafiHub HRIS</div>
          <div className="text-xs text-white/60 truncate">
            HR Management System
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {links.map((l) => {
            const Icon = l.icon;
            const active = location === l.to;
            return (
              <li key={l.to}>
                <Link href={l.to}>
                  <span
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm cursor-pointer transition ${
                      active
                        ? "bg-white/15 text-white font-medium"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="truncate">{l.label}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User card + sign out */}
      <div className="px-3 pt-3 pb-4 border-t border-white/10 mt-auto">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white font-semibold shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white truncate">
              {profile?.fullName || profile?.email}
            </div>
            {roleLabel && (
              <span className="inline-block mt-0.5 text-[10px] uppercase tracking-wide bg-accent/20 text-accent px-2 py-0.5 rounded">
                {roleLabel}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-2 w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-primary text-primary-foreground flex-col z-30">
        {SidebarContent}
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-20 bg-primary text-primary-foreground shadow">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
              SH
            </div>
            <span className="font-semibold truncate">SafiHub HRIS</span>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="p-2 -mr-2 rounded hover:bg-white/10"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-primary text-primary-foreground flex flex-col shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 p-2 rounded hover:bg-white/10 z-10"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
