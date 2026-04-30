import { Link } from "wouter";

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">Access denied</h1>
        <p className="text-muted-foreground mb-6">
          You don't have permission to view this page.
        </p>
        <Link href="/login">
          <span className="text-primary underline cursor-pointer">
            Back to sign in
          </span>
        </Link>
      </div>
    </div>
  );
}
