import type { CSSProperties } from "react";
import { Settings, X } from "lucide-react";
import { t } from "@/lib/design-tokens";
import type { OpenTab } from "./ConfigTabContent";

export interface ConfigurationTabsBarProps {
  tabs: OpenTab[];
  activeTabId: number | null;
  dirtyTabs: Set<number>;
  onSelect: (configId: number) => void;
  onClose: (configId: number) => void;
}

/** Как `Tabs` chrome: одна строка вкладки — `div[role=tab]`, крестик внутри с `.ui-tab-close` и отступом, без вертикальной полоски. */
function chromeTabRowStyle(isActive: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: t.space[2],
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    background: "transparent",
    border: "none",
    fontFamily: "inherit",
    fontSize: t.font.size.xs,
    height: t.component.tab.height,
    padding: `0 ${t.space[5]}`,
    position: "relative",
    ...(isActive ? { background: t.color.bg.tabActive } : null),
    color: isActive ? t.color.text.active : t.color.text.muted,
    borderRight: `1px solid ${t.color.border.default}`,
    borderBottom: isActive ? "none" : `1px solid ${t.color.border.default}`,
  };
}

/**
 * Полоса вкладок System → Configuration: разметка совпадает с общим `<Tabs variant="chrome">`,
 * но без общего компонента (стабильные клики по крестику).
 */
export function ConfigurationTabsBar({
  tabs,
  activeTabId,
  dirtyTabs,
  onSelect,
  onClose,
}: ConfigurationTabsBarProps) {
  return (
    <div
      role="tablist"
      aria-label="Open adapter configurations"
      style={{
        display: "flex",
        alignItems: "stretch",
        flexShrink: 0,
        background: t.color.bg.sidebar,
        borderBottom: `1px solid ${t.color.border.default}`,
        overflowX: "auto",
      }}
    >
      {tabs.map((tab) => {
        const id = tab.config.ConfigurationId;
        const isActive = id === activeTabId;
        const enabled = tab.config.Enabled;
        return (
          <div
            key={id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            title={`${tab.config.AdapterType}: ${tab.config.Name}`}
            className="ui-tab"
            data-variant="chrome"
            data-active={isActive ? "true" : undefined}
            style={chromeTabRowStyle(isActive)}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest(".ui-tab-close")) return;
              if (!isActive) onSelect(id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!isActive) onSelect(id);
              }
            }}
          >
            {dirtyTabs.has(id) && (
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: t.radius.full,
                  background: isActive ? t.color.text.primary : t.color.text.muted,
                  marginRight: 2,
                }}
              />
            )}
            <Settings
              size={12}
              style={{
                opacity: 0.6,
                flexShrink: 0,
                color: enabled ? t.color.success : t.color.text.muted,
              }}
            />
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                minWidth: 0,
                maxWidth: 220,
              }}
            >
              <span
                style={{
                  color: t.color.text.muted,
                  marginRight: t.space[1],
                  flexShrink: 0,
                }}
              >
                {tab.config.AdapterType}:
              </span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.config.Name}
              </span>
            </span>
            <button
              type="button"
              aria-label="Close tab"
              className="ui-tab-close toolbar-btn"
              onClick={(e) => {
                e.stopPropagation();
                onClose(id);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 16,
                height: 16,
                marginLeft: t.space[2],
                padding: 0,
                border: "none",
                background: "transparent",
                color: t.color.text.muted,
                borderRadius: t.radius.sm,
                cursor: "pointer",
              }}
            >
              <X size={10} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
