import { Construction } from "lucide-react";
import Layout from "../components/Layout";

export default function ComingSoon({ title = "Coming soon", description }) {
  return (
    <Layout>
      <h1 className="text-xl sm:text-2xl font-bold text-primary mb-1">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        SafiHub feature in development
      </p>

      <div className="bg-card rounded-lg shadow p-8 sm:p-12 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
          <Construction className="w-8 h-8 text-accent" />
        </div>
        <h2 className="text-lg font-semibold text-primary mb-2">Coming soon</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {description ||
            "This area is being built. It will be available in an upcoming update."}
        </p>
      </div>
    </Layout>
  );
}
