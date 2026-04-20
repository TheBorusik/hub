import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import type { WebProcess, ProcessStage } from "@/lib/ws-api-models";

export type SpecialView = "code" | "diff" | "run" | "global-models" | null;

interface ProcessBreadcrumbsProps {
  process: WebProcess;
  activeTab: string;
  specialView: SpecialView;
  isDiagram: boolean;
  isStageOpen: boolean;
  stages: Record<string, ProcessStage>;
  onGotoDiagram: () => void;
}

const SPECIAL_LABEL: Record<Exclude<SpecialView, null>, string> = {
  code: "Code",
  diff: "Diff",
  run: "Run",
  "global-models": "Global Models",
};

/**
 * Хлебные крошки `Catalog › Subcatalog › Process [› Stage|Code|Diff|Run|GM]`.
 * Каталог-сегменты пока без onClick (в будущем — навигация по ProcessTree).
 */
export function ProcessBreadcrumbs({
  process,
  activeTab,
  specialView,
  isDiagram,
  isStageOpen,
  stages,
  onGotoDiagram,
}: ProcessBreadcrumbsProps) {
  const nameParts = (process.Name ?? process.TypeName).split(".").filter(Boolean);
  const processLeafName = nameParts[nameParts.length - 1] ?? process.TypeName;
  const parentSegments = nameParts.slice(0, -1);

  const crumbs: BreadcrumbItem[] = parentSegments.map((p, i) => ({
    id: `cat-${i}-${p}`,
    label: p,
    muted: true,
  }));
  crumbs.push({
    id: "process",
    label: processLeafName,
    title: process.TypeName,
    onClick: specialView || !isDiagram ? onGotoDiagram : undefined,
    active: isDiagram,
  });
  if (specialView) {
    crumbs.push({ id: "view", label: SPECIAL_LABEL[specialView], active: true });
  } else if (isStageOpen) {
    const st = stages[activeTab];
    if (st) {
      crumbs.push({
        id: `stage-${activeTab}`,
        label: st.DisplayName || activeTab,
        title: activeTab,
        active: true,
      });
    }
  }

  return <Breadcrumbs items={crumbs} aria-label="Process path" />;
}
