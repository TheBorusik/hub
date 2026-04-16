import { Workflow } from "lucide-react";
import { StubPage } from "@/components/layout/StubPage";

export function ConfiguratorPage() {
  return (
    <StubPage
      icon={Workflow}
      title="Configurator"
      description="Process editor with branch management, code editing, and WebData diagram."
      phase="Phase 4"
    />
  );
}
