import { useAuth } from "../context/AuthContext";
import { useLocation } from "wouter";
import { useState } from "react";

const NAV_BY_ROLE = {
  admin: [
    { label: "Dashboard", path: "/dashboard", icon: "🏠" },
    { label: "User Management", path: "/admin/users", icon: "👤" },
    { label: "Contracts", path: "/admin/contracts", icon: "📋" },
    { label: "Documents", path: "/admin/documents", icon: "📄" },
    { label: "Salary Advances", path: "/admin/salary-advances", icon: "💰" },
    { label: "Public Holidays", path: "/admin/holidays", icon: "🗓️" },
    { label: "Audit Logs", path: "/admin/audit", icon: "🔍" },
    { label: "My Profile", path: "/profile", icon: "⚙️" },
  ],
  "it-expert": [
    { label: "Dashboard", path: "/dashboard", icon: "🏠" },
    { label: "User Management", path: "/admin/users", icon: "👤" },
    { label: "Contracts", path: "/admin/contracts", icon: "📋" },
    { label: "Documents", path: "/admin/documents", icon: "📄" },
    { label: "Salary Advances", path: "/admin/salary-advances", icon: "💰" },
    { label: "Public Holidays", path: "/admin/holidays", icon: "🗓️" },
    { label: "Audit Logs", path: "/admin/audit", icon: "🔍" },
    { label: "My Profile", path: "/profile", icon: "⚙️" },
  ],
  employer: [
    { label: "Dashboard", path: "/dashboard", icon: "🏠" },
    { label: "My Employees", path: "/employer/employees", icon: "👷" },
    { label: "Leave Requests", path: "/employer/leave", icon: "📅" },
    { label: "Timesheets", path: "/employer/timesheets", icon: "📊" },
    { label: "Documents", path: "/employer/documents", icon: "📄" },
    { label: "My Profile", path: "/profile", icon: "⚙️" },
  ],
  employee: [
    { label: "Dashboard", path: "/dashboard", icon: "🏠" },
    { label: "Leave Request", path: "/employee/leave", icon: "📅" },
    { label: "Overtime / Holiday", path: "/employee/overtime", icon: "⏱️" },
    { label: "My Documents", path: "/employee/documents", icon: "📄" },
    { label: "My Profile", path: "/profile", icon: "⚙️" },
  ],
  user: [
    { label: "Dashboard", path: "/dashboard", icon: "🏠" },
    { label: "My Profile", path: "/profile", icon: "⚙️" },
  ],
};

const ROLE_LABELS = {
  admin: { label: "Admin", color: "bg-red-100 text-red-700" },
  "it-expert": { label: "IT Expert", color: "bg-purple-100 text-purple-700" },
  employer: { label: "Employer", color: "bg-blue-100 text-blue-700" },
  employee: { label: "Employee", color: "bg-green-100 text-green-700" },
  user: { label: "User", color: "bg-gray-100 text-gray-600" },
};

export default function Layout({ children }) {
  const { user, role, logout } = useAuth();
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = NAV_BY_ROLE[role] || NAV_BY_ROLE.user;
  const roleInfo = ROLE_LABELS[role] || ROLE_LABELS.user;

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#1B4F72] flex flex-col z-30 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:flex`}
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#F39C12] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">SH</span>
            </div>
            <div>
              <p className="font-bold text-white text-sm">SafiHub HRIS</p>
              <p className="text-blue-300 text-xs">HR Management System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              item={item}
              onNavigate={() => setSidebarOpen(false)}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {user?.email?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">
                {user?.displayName || user?.email}
              </p>
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleInfo.color}`}
              >
                {roleInfo.label}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-blue-200 hover:bg-white/10 rounded-lg text-sm transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-[#1B4F72]"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <span className="font-bold text-[#1B4F72]">SafiHub HRIS</span>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function NavItem({ item, onNavigate }) {
  const [location, navigate] = useLocation();
  const isActive =
    location === item.path || location.startsWith(item.path + "/");

  return (
    <button
      onClick={() => {
        navigate(item.path);
        onNavigate();
      }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${isActive ? "bg-white/20 text-white" : "text-blue-200 hover:bg-white/10 hover:text-white"}`}
    >
      <span className="text-base">{item.icon}</span>
      {item.label}
    </button>
  );
}
