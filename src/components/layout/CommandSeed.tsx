import { useMemo } from "react";
import {
  Settings,
  Terminal,
  Database,
  Eye,
  Workflow,
  FolderOpen,
  HardDrive,
} from "lucide-react";
import { useNavigation } from "@/providers/NavigationProvider";
import { useContours } from "@/providers/ContourProvider";
import { useCommands } from "@/lib/commands";
import type { Command } from "@/lib/commands";
import type { SectionId } from "./ActivityBar";

const NAV_SECTIONS: { id: SectionId; label: string; icon: React.ElementType; systemOnly?: boolean }[] = [
  { id: "configurator", label: "Configurator", icon: Workflow },
  { id: "viewer", label: "Viewer", icon: Eye },
  { id: "command-tester", label: "Cmd Tester", icon: Terminal },
  { id: "crud-editor", label: "CRUD", icon: Database },
  { id: "system", label: "System", icon: Settings },
  { id: "projects", label: "Projects", icon: FolderOpen, systemOnly: true },
  { id: "db-explorer", label: "DB Explorer", icon: HardDrive },
];

/**
 * Регистрирует базовые команды навигации в CommandRegistry для текущего контура.
 * Монтируется один раз в ContourBody — useCommand сам снимет регистрацию при
 * анмаунте контура.
 */
export function CommandSeed() {
  const { navigateTo } = useNavigation();
  const { getActiveContour } = useContours();
  const contour = getActiveContour();
  const isSystem = contour?.isSystem ?? false;

  const commands: Command[] = useMemo(
    () =>
      NAV_SECTIONS.filter((s) => !s.systemOnly || isSystem).map<Command>((s) => {
        const Icon = s.icon;
        return {
          id: `nav.${s.id}`,
          title: `Go to ${s.label}`,
          category: "Navigation",
          icon: <Icon size={14} />,
          run: () => navigateTo(s.id),
        };
      }),
    [isSystem, navigateTo],
  );

  useCommands(commands, [commands]);
  return null;
}
