import { useCallback } from "react";
import { TabBar } from "./TabBar";
import { ActivityBar, type SectionId } from "./ActivityBar";
import { StatusBar } from "./StatusBar";
import { CommandPalette } from "./CommandPalette";
import { CommandSeed } from "./CommandSeed";
import { ContourWebSocketProvider } from "@/providers/ContourWebSocketProvider";
import { useContours, type ContourConfig } from "@/providers/ContourProvider";
import { AuthGate } from "@/components/layout/AuthGate";
import { NavigationProvider, useNavigation } from "@/providers/NavigationProvider";
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

  return (
    <div className="grid h-screen w-screen overflow-hidden" style={{ gridTemplateRows: "35px 1fr 22px" }}>
      <TabBar />
      {contours.map((contour) => (
        <ContourPanel
          key={contour.id}
          contour={contour}
          isActive={contour.id === activeContourId}
        />
      ))}
    </div>
  );
}

interface ContourPanelProps {
  contour: ContourConfig;
  isActive: boolean;
}

function ContourPanel({ contour, isActive }: ContourPanelProps) {
  const initialSection: SectionId = contour.isSystem ? "projects" : "configurator";

  return (
    <ContourWebSocketProvider contour={contour}>
      <NavigationProvider initialSection={initialSection}>
        <div
          className="flex overflow-hidden"
          style={{ display: isActive ? "flex" : "none" }}
        >
          <AuthGate>
            <ContourBody />
          </AuthGate>
        </div>
        <div style={{ display: isActive ? "flex" : "none" }}>
          <StatusBar />
        </div>
        {/* CommandPalette слушает глобальный хоткей (Ctrl/Cmd+Shift+P) и
            рендерится только когда открыт — лёгкий по стоимости. */}
        {isActive && <CommandPalette />}
      </NavigationProvider>
    </ContourWebSocketProvider>
  );
}

/**
 * Внутренний рендер контура — должен быть внутри `NavigationProvider`,
 * чтобы иметь доступ к `useNavigation` для сохранения состояния секций.
 *
 * Ключевая идея: секции, которые пользователь уже посещал, остаются
 * смонтированными в DOM и просто прячутся через `display: none`. Это
 * сохраняет их React-state: открытые вкладки процессов, позицию
 * скролла, содержимое редакторов и т.д. Непосещённые секции вообще
 * не маунтятся — экономим WebSocket-шум и ресурсы.
 */
function ContourBody() {
  const { currentSection, visitedSections, navigateTo } = useNavigation();

  // ActivityBar клик теперь идёт через navigation-шину, чтобы сработал
  // dirty-guard текущей секции (если он зарегистрирован).
  const onSectionChange = useCallback((section: SectionId) => {
    navigateTo(section);
  }, [navigateTo]);

  // `visitedSections` монотонно растёт (NavigationProvider только добавляет),
  // поэтому его можно использовать напрямую — никаких размонтов не
  // произойдёт.
  return (
    <>
      <CommandSeed />
      <ActivityBar activeSection={currentSection} onSectionChange={onSectionChange} />
      <div className="flex-1 overflow-hidden bg-editor relative">
        {Array.from(visitedSections).map((sectionId) => {
          const PageComponent = sectionConfig[sectionId].component;
          const active = sectionId === currentSection;
          return (
            <div
              key={sectionId}
              style={{
                position: "absolute", inset: 0,
                display: active ? "flex" : "none",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <PageComponent />
            </div>
          );
        })}
      </div>
    </>
  );
}
