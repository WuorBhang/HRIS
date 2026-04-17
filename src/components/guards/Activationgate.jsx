import { useAuth } from "../../context/AuthContext";

export default function ActivationGate({ children }) {
  const { activated } = useAuth();

  if (activated === false) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Account Pending Activation
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Your account is being set up. An administrator will activate it once
            your contract details are configured.
            <br />
            <br />
            <strong>Please contact SafiHub support</strong> if you believe this
            is an error.
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
            This message appears because your account has not yet been activated
            by an admin.
          </div>
        </div>
      </div>
    );
  }

  return children;
}
