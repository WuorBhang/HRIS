// Generic placeholder for unbuilt features.
import { Construction } from "lucide-react";
import Layout from "../components/Layout";

export default function ComingSoon({
  title = "Coming soon",
  description = "This feature is under construction.",
}) {
  return (
    <Layout>
      <div className="bg-card rounded-lg shadow p-10 text-center max-w-2xl">
        <Construction className="w-12 h-12 text-accent mx-auto mb-3" />
        <h1 className="text-xl font-bold text-primary mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Layout>
  );
}
