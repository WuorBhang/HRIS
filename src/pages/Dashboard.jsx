import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import { useNavigate } from "../hooks/useNavigate";

const ROLE_CARDS = {
  admin: [
    {
      label: "Full system access",
      icon: "🔑",
      desc: "Manage users, roles, and all employee records",
    },
    {
      label: "User Management",
      icon: "👥",
      desc: "Create accounts and assign roles to staff",
    },
    {
      label: "System Oversight",
      icon: "📊",
      desc: "View all employer accounts and employees",
    },
  ],
  "it-expert": [
    {
      label: "Technical Access",
      icon: "💻",
      desc: "Access system configuration and logs",
    },
    {
      label: "Employee Records",
      icon: "📋",
      desc: "View and manage employee data",
    },
    {
      label: "Document Access",
      icon: "📄",
      desc: "Retrieve and manage HR documents",
    },
  ],
  employer: [
    {
      label: "Employee Management",
      icon: "👤",
      desc: "Create, edit, and manage your employees",
    },
    {
      label: "Documents",
      icon: "📁",
      desc: "Upload and manage employee documents",
    },
    {
      label: "Reports",
      icon: "📈",
      desc: "View workforce reports and statistics",
    },
  ],
  user: [
    {
      label: "My Profile",
      icon: "👤",
      desc: "View and update your personal information",
    },
    { label: "Documents", icon: "📄", desc: "Access your HR documents" },
  ],
};

export default function Dashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const cards = ROLE_CARDS[role] || ROLE_CARDS["user"];
  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";

  const ROLE_LABELS = {
    admin: "Administrator",
    "it-expert": "IT Expert",
    employer: "Employer",
    user: "Employee",
  };

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1B4F72]">
            Welcome back, {displayName}!
          </h1>
          <p className="text-gray-500 mt-1">
            You're signed in as{" "}
            <span className="font-medium text-[#1B4F72]">
              {ROLE_LABELS[role] || "User"}
            </span>
          </p>
        </div>

        {(role === "admin" || role === "it-expert" || role === "employer") && (
          <div className="bg-[#1B4F72] rounded-2xl p-6 text-white mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-1">
                Employee Management
              </h2>
              <p className="text-blue-200 text-sm">
                View, create, edit and manage employee records
              </p>
            </div>
            <button
              onClick={() => navigate("/employees")}
              className="bg-white text-[#1B4F72] font-semibold px-5 py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm"
            >
              Go to Employees →
            </button>
          </div>
        )}

        {role === "admin" && (
          <div className="bg-[#F39C12] rounded-2xl p-6 text-white mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-1">User Management</h2>
              <p className="text-yellow-100 text-sm">
                Create employer accounts and assign roles
              </p>
            </div>
            <button
              onClick={() => navigate("/users")}
              className="bg-white text-[#F39C12] font-semibold px-5 py-2 rounded-lg hover:bg-yellow-50 transition-colors text-sm"
            >
              Manage Users →
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((card, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm"
            >
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{card.label}</h3>
              <p className="text-gray-500 text-sm">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
