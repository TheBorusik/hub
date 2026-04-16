import {
  Settings,
  Terminal,
  Database,
  Eye,
  Workflow,
  FolderOpen,
  HardDrive,
} from "lucide-react";
import { useContours } from "@/providers/ContourProvider";

export type SectionId =
  | "configurator"
  | "viewer"
  | "command-tester"
  | "crud-editor"
  | "system"
  | "projects"
  | "db-explorer";

interface ActivityBarProps {
  activeSection: SectionId;
  onSectionChange: (section: SectionId) => void;
}

const sections: { id: SectionId; label: string; icon: React.ElementType; systemOnly?: boolean }[] = [
  { id: "configurator", label: "Configurator", icon: Workflow },
  { id: "viewer", label: "Viewer", icon: Eye },
  { id: "command-tester", label: "Cmd Tester", icon: Terminal },
  { id: "crud-editor", label: "CRUD", icon: Database },
  { id: "system", label: "System", icon: Settings },
  { id: "projects", label: "Projects", icon: FolderOpen, systemOnly: true },
  { id: "db-explorer", label: "DB Explorer", icon: HardDrive },
];

export function ActivityBar({ activeSection, onSectionChange }: ActivityBarProps) {
  const { getActiveContour } = useContours();
  const contour = getActiveContour();
  const isSystem = contour?.isSystem ?? false;

  return (
    <div className="flex flex-col items-center bg-activitybar shrink-0" style={{ width: 48 }}>
      {sections
        .filter((s) => !s.systemOnly || isSystem)
        .map((s) => {
          const Icon = s.icon;
          const isActive = s.id === activeSection;
          return (
            <button
              key={s.id}
              onClick={() => onSectionChange(s.id)}
              title={s.label}
              className="relative flex items-center justify-center cursor-pointer transition-colors toolbar-btn"
              style={{
                width: 48,
                height: 48,
                color: isActive ? "#ffffff" : "rgba(255,255,255,0.5)",
                borderRadius: 0,
              }}
            >
              {isActive && (
                <div
                  className="absolute left-0 top-0 bottom-0"
                  style={{ width: 2, background: "#ffffff" }}
                />
              )}
              <Icon size={24} />
            </button>
          );
        })}
    </div>
  );
}
