import { useState } from "react";
import { Group, Panel } from "react-resizable-panels";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { SidePanel } from "@/components/layout/SidePanel";
import { SystemTreeNav } from "./components/SystemTreeNav";
import { HealthTable } from "./components/adapters/HealthTable";
import { ConfigurationPanel } from "./components/adapters/ConfigurationPanel";
import { SectionsPanel } from "./components/adapters/SectionsPanel";
import { TablesPanel } from "./components/adapters/TablesPanel";
import { ErrorsTable } from "./components/errors/ErrorsTable";
import { PermissionsPanel } from "./components/permissions/PermissionsPanel";
import { RolesPanel } from "./components/roles/RolesPanel";
import type { SystemView } from "./types";
import { viewToErrorType } from "./types";

export function SystemPage() {
  const [activeView, setActiveView] = useState<SystemView>("status");

  const errorType = viewToErrorType(activeView);

  return (
    <Group direction="horizontal" id="system-main">
      <Panel
        defaultSize="280px"
        minSize="170px"
        maxSize="50%"
        groupResizeBehavior="preserve-pixel-size"
      >
        <SidePanel title="SYSTEM">
          <SystemTreeNav activeView={activeView} onSelect={setActiveView} />
        </SidePanel>
      </Panel>
      <ResizeHandle />
      <Panel minSize="30%">
        <div className="flex flex-col h-full overflow-hidden">
          {activeView === "status" && <HealthTable />}
          {activeView === "configuration" && <ConfigurationPanel />}
          {activeView === "base-sections" && <SectionsPanel />}
          {activeView === "table-data" && <TablesPanel />}
          {errorType && <ErrorsTable errorType={errorType} />}
          {activeView === "permissions" && <PermissionsPanel />}
          {activeView === "roles" && <RolesPanel />}
        </div>
      </Panel>
    </Group>
  );
}
