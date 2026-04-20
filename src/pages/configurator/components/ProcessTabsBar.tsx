import { LayoutGrid } from "lucide-react";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import type { ProcessStage } from "@/lib/ws-api-models";

interface ProcessTabsBarProps {
  /** Имя активной таба или special-view sentinel `__none__`. */
  activeId: string;
  /** Список открытых стейджей в порядке появления. */
  openStageTabs: string[];
  /** Все стейджи процесса (для resolve label/displayName). */
  stages: Record<string, ProcessStage>;
  /** Имена стейджей, помеченных как dirty. */
  dirtyStages: Set<string>;
  onChange: (id: string) => void;
  onCloseStageTab: (id: string) => void;
}

/**
 * Top tab strip процесса: Diagram + по одному tab на каждый открытый stage,
 * с dirty-индикатором (●) и кнопкой close. ID `__diagram__` не закрывается.
 */
export function ProcessTabsBar({
  activeId,
  openStageTabs,
  stages,
  dirtyStages,
  onChange,
  onCloseStageTab,
}: ProcessTabsBarProps) {
  const items: TabItem[] = [
    {
      id: "__diagram__",
      label: "Diagram",
      icon: <LayoutGrid size={12} />,
    },
  ];
  for (const sn of openStageTabs) {
    const st = stages[sn];
    if (!st) continue;
    items.push({
      id: sn,
      label: (
        <span
          style={{
            maxWidth: 140,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "inline-block",
          }}
        >
          {st.DisplayName || sn}
        </span>
      ),
      title: st.DisplayName || sn,
      dirty: dirtyStages.has(sn),
      closable: true,
    });
  }
  return (
    <Tabs
      variant="chrome"
      aria-label="Process editor tabs"
      activeId={activeId}
      onChange={onChange}
      onClose={(id) => { if (id !== "__diagram__") onCloseStageTab(id); }}
      items={items}
    />
  );
}
