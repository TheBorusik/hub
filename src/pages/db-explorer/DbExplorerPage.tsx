import { HardDrive } from "lucide-react";
import { StubPage } from "@/components/layout/StubPage";

export function DbExplorerPage() {
  return (
    <StubPage
      icon={HardDrive}
      title="DB Explorer"
      description="Database browser for direct table inspection and queries."
      phase="Phase 5"
    />
  );
}
