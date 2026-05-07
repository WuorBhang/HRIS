// 403 page for wrong-role access.
import { Link } from "wouter";
import { ShieldAlert } from "lucide-react";

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-card rounded-lg shadow p-8 max-w-md w-full text-center">
        <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-primary mb-2">Not authorized</h1>
        <p className="text-sm text-muted-foreground mb-6">
          You don't have access to that page.
        </p>
        <Link href="/dashboard">
          <span className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md cursor-pointer">
            Back to dashboard
          </span>
        </Link>
      </div>
    </div>
  );
}
