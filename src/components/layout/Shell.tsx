import { useCallback } from "react";
import { TabBar } from "./TabBar";
import { ActivityBar, type SectionId } from "./ActivityBar";
import { StatusBar } from "./StatusBar";
import { CommandPalette } from "./CommandPalette";
import { QuickOpen } from "./QuickOpen";
import { CommandSeed } from "./CommandSeed";
import { ProblemsPanel } from "./ProblemsPanel";
import { useProblems } from "@/providers/ProblemsProvider";
import { useHotkey } from "@/hooks/useHotkey";
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
  const { panelOpen: problemsOpen, togglePanel: toggleProblems, setPanelOpen: setProblemsOpen } = useProblems();

  // Ctrl+Shift+M — глобальный хоткей ProblemsPanel (как в VS Code).
  useHotkey(["mod+shift+m"], toggleProblems, { ignoreWhenTyping: false });

  // Структура grid'а:
  //   35px      — TabBar (контуры)
  //   1fr       — body (ActivityBar + страница)
  //   240px     — ProblemsPanel, только когда открыта
  //   22px      — StatusBar
  const gridRows = problemsOpen ? "35px 1fr 240px 22px" : "35px 1fr 22px";

  const statusBarRow = problemsOpen ? 4 : 3;

  return (
    <div className="grid h-screen w-screen overflow-hidden" style={{ gridTemplateRows: gridRows }}>
      <div style={{ gridRow: 1 }}>
        <TabBar />
      </div>
      {contours.map((contour) => (
        <ContourPanel
          key={contour.id}
          contour={contour}
          isActive={contour.id === activeContourId}
          statusBarRow={statusBarRow}
        />
      ))}
      {problemsOpen && (
        <div
          style={{
            gridRow: 3,
            overflow: "hidden",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <ProblemsPanel onClose={() => setProblemsOpen(false)} />
        </div>
      )}
    </div>
  );
}

interface ContourPanelProps {
  contour: ContourConfig;
  isActive: boolean;
  /** В какой grid-row Shell'а рендерить StatusBar (меняется, когда открыта ProblemsPanel). */
  statusBarRow: number;
}

function ContourPanel({ contour, isActive, statusBarRow }: ContourPanelProps) {
  const initialSection: SectionId = contour.isSystem ? "projects" : "configurator";

  return (
    <ContourWebSocketProvider contour={contour}>
      <NavigationProvider initialSection={initialSection}>
        <div
          className="flex overflow-hidden"
          style={{ gridRow: 2, display: isActive ? "flex" : "none" }}
        >
          <AuthGate>
            <ContourBody />
          </AuthGate>
        </div>
        <div style={{ gridRow: statusBarRow, display: isActive ? "flex" : "none" }}>
          <StatusBar />
        </div>
        {/* CommandPalette (Ctrl/Cmd+Shift+P) — список действий.
            QuickOpen (Ctrl/Cmd+P) — быстрый переход к процессу по имени.
            Оба слушают глобальный хоткей и рендерят UI только когда открыт. */}
        {isActive && <CommandPalette />}
        {isActive && <QuickOpen />}
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
