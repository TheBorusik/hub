import { useCallback, useState } from "react";
import type { CSSProperties } from "react";
import { Group, Panel, usePanelRef } from "react-resizable-panels";
import { ChevronRight, ChevronDown } from "lucide-react";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { useAutoSaveLayout } from "@/hooks/useAutoSaveLayout";
import { CSharpEditor } from "./CSharpEditor";
import type { StageEditorActionCallbacks } from "../monaco/wfm-csharp";

const errorToggleStyle: CSSProperties = {
  height: 26,
  padding: "0 12px",
  gap: 4,
  fontSize: 11,
  fontWeight: 600,
  color: "var(--color-text-muted)",
  background: "var(--color-sidebar)",
  border: "none",
  width: "100%",
  textAlign: "left",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

export interface NextStageWithErrorProps {
  stageName: string;
  nextValue: string;
  errorValue: string;
  initiallyOpen: boolean;
  onChangeNext: (v: string) => void;
  onChangeError: (v: string) => void;
  stageNames: string[];
  processResultName: string;
  actions?: StageEditorActionCallbacks;
}

/**
 * Всегда держим одинаковое дерево: `<Group>` + верхний `<Panel>` (Get Next Stage)
 * + `<ResizeHandle>` + нижний `<Panel collapsible>` (Get Error Next Stage).
 *
 * Это важно, потому что при переключении видимости нижней секции раньше
 * менялось родительское дерево JSX (ранее был `errorOpen ? <Group/> : <div/>`),
 * из-за чего React-у приходилось переcоздавать `CSharpEditor` для «Get Next
 * Stage», Monaco строил новую модель — и это давало видимое мигание.
 * Стабильное дерево + `collapsible` Panel убирают ремоунт (как сделано
 * для «Request Data» в CommandTester).
 */
export function NextStageWithError({
  stageName,
  nextValue,
  errorValue,
  initiallyOpen,
  onChangeNext,
  onChangeError,
  stageNames,
  processResultName,
  actions,
}: NextStageWithErrorProps) {
  const errorPanelRef = usePanelRef();
  const [collapsed, setCollapsed] = useState(!initiallyOpen);
  // rrp v4: autoSaveId нет — кладём layout в localStorage сами.
  const vLayout = useAutoSaveLayout(`stage-v2-${stageName}`);

  const toggle = useCallback(() => {
    const panel = errorPanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
  }, [errorPanelRef]);

  return (
    <Group orientation="vertical" id={`stage-v2-${stageName}`} {...vLayout}>
      <Panel id="get-next-stage" minSize="80px">
        <CSharpEditor
          label="Get Next Stage:"
          value={nextValue}
          onChange={onChangeNext}
          stageNames={stageNames}
          currentStageName={stageName}
          processResultName={processResultName}
          actions={actions}
        />
      </Panel>
      <ResizeHandle direction="vertical" />
      <Panel
        id="get-error-next-stage"
        panelRef={errorPanelRef}
        collapsible
        collapsedSize="26px"
        defaultSize={initiallyOpen ? 25 : 8}
        minSize="126px"
        onResize={() => {
          setCollapsed(errorPanelRef.current?.isCollapsed() ?? false);
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          <button
            className="flex items-center shrink-0 select-none cursor-pointer"
            onClick={toggle}
            style={errorToggleStyle}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            Get Error Next Stage
          </button>
          {!collapsed && (
            <div style={{ flex: 1, minHeight: 0 }}>
              <CSharpEditor
                label=""
                value={errorValue}
                onChange={onChangeError}
                stageNames={stageNames}
                currentStageName={stageName}
                processResultName={processResultName}
                actions={actions}
              />
            </div>
          )}
        </div>
      </Panel>
    </Group>
  );
}
