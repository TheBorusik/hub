import { useState } from "react";
import { TabBar } from "./TabBar";
import { ActivityBar, type SectionId } from "./ActivityBar";
import { StatusBar } from "./StatusBar";
import { ContourWebSocketProvider } from "@/providers/ContourWebSocketProvider";
import { useContours, type ContourConfig } from "@/providers/ContourProvider";
import { AuthGate } from "@/components/layout/AuthGate";
import { ConfiguratorPage } from "@/pages/configurator/ConfiguratorPage";
import { ViewerPage } from "@/pages/viewer/ViewerPage";
import { CommandTesterPage } from "@/pages/command-tester/CommandTesterPage";
import { CrudEditorPage } from "@/pages/crud-editor/CrudEditorPage";
import { SystemPage } from "@/pages/system/SystemPage";
import { ProjectsPage } from "@/pages/projects/ProjectsPage";
import { DbExplorerPage } from "@/pages/db-explorer/DbExplorerPage";

const sectionConfig: Record<SectionId, { component: React.ComponentType }> = {
  configurator: { component: ConfiguratorPage },
  viewer: { component: ViewerPage },
  "command-tester": { component: CommandTesterPage },
  "crud-editor": { component: CrudEditorPage },
  system: { component: SystemPage },
  projects: { component: ProjectsPage },
  "db-explorer": { component: DbExplorerPage },
};

export function Shell() {
  const { contours, activeContourId } = useContours();
  const [sectionByContour, setSectionByContour] = useState<
    Record<string, SectionId>
  >({ system: "projects" });

  const onSectionChange = (contourId: string, section: SectionId) => {
    setSectionByContour((prev) => ({ ...prev, [contourId]: section }));
  };

  return (
    <div className="grid h-screen w-screen overflow-hidden" style={{ gridTemplateRows: "35px 1fr 22px" }}>
      <TabBar />
      {contours.map((contour) => (
        <ContourPanel
          key={contour.id}
          contour={contour}
          isActive={contour.id === activeContourId}
          activeSection={sectionByContour[contour.id] ?? (contour.isSystem ? "projects" : "configurator")}
          onSectionChange={(s) => onSectionChange(contour.id, s)}
        />
      ))}
    </div>
  );
}

interface ContourPanelProps {
  contour: ContourConfig;
  isActive: boolean;
  activeSection: SectionId;
  onSectionChange: (section: SectionId) => void;
}

function ContourPanel({ contour, isActive, activeSection, onSectionChange }: ContourPanelProps) {
  const { component: PageComponent } = sectionConfig[activeSection];

  return (
    <ContourWebSocketProvider contour={contour}>
      <div
        className="flex overflow-hidden"
        style={{ display: isActive ? "flex" : "none" }}
      >
        <AuthGate>
          <ActivityBar activeSection={activeSection} onSectionChange={onSectionChange} />
          <div className="flex-1 overflow-hidden bg-editor">
            <PageComponent />
          </div>
        </AuthGate>
      </div>
      <div style={{ display: isActive ? "flex" : "none" }}>
        <StatusBar />
      </div>
    </ContourWebSocketProvider>
  );
}

