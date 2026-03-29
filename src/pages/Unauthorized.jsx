import { useLocation } from "wouter";
import { useAuth } from "../context/AuthContext";

export default function Unauthorized() {
  const [, navigate] = useLocation();
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#1B4F72] mb-2">
          Access Denied
        </h1>
        <p className="text-gray-500 mb-6">
          You don't have permission to access this page.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-[#1B4F72] text-white rounded-lg hover:bg-[#154360] transition-colors"
          >
            Go to Dashboard
          </button>
          <button
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
