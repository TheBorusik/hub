import { useCallback, useEffect, useRef, useState } from "react";
import type { ProcessStage } from "@/lib/ws-api-models";
import { normStageType } from "../lib/stage-type-helpers";
import { stageColor } from "../lib/stage-colors";

interface StageHeaderProps {
  /** Имя стейджа из props (single source of truth для родителя). */
  stageName: string;
  stage: ProcessStage;
  onChangeDisplayName: (value: string) => void;
  onRename: (oldName: string, newName: string) => void;
}

/**
 * Шапка StageEditor с инлайновыми инпутами Display Name / Name и type-бейджем.
 * Логика F2 (фокус на Name), commitRename и буферизации `localName` —
 * полностью здесь, чтобы не загромождать оркестратор.
 */
export function StageHeader({
  stageName,
  stage,
  onChangeDisplayName,
  onRename,
}: StageHeaderProps) {
  const [localName, setLocalName] = useState(stageName);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const t = normStageType(stage.Type);
  const color = stageColor(stage.Type);

  useEffect(() => {
    setLocalName(stageName);
  }, [stageName]);

  // F2 — фокус и select имени стейджа (если фокус не в input/textarea/Monaco).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "F2" || e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
      const active = document.activeElement as HTMLElement | null;
      if (active) {
        const tag = active.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (active.classList.contains("monaco-editor") || active.closest(".monaco-editor")) return;
      }
      if (nameInputRef.current) {
        e.preventDefault();
        nameInputRef.current.focus();
        nameInputRef.current.select();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const commitRename = useCallback(() => {
    const trimmed = localName.trim();
    if (trimmed && trimmed !== stageName) {
      onRename(stageName, trimmed);
    } else {
      setLocalName(stageName);
    }
  }, [localName, stageName, onRename]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderBottom: `2px solid ${color}`,
        background: "var(--color-sidebar)",
        flexShrink: 0,
      }}
    >
      <label style={{ fontSize: 11, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
        Display Name
      </label>
      <input
        value={stage.DisplayName ?? ""}
        onChange={(e) => onChangeDisplayName(e.target.value)}
        placeholder="Display Name"
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: 12,
          color: "var(--color-text-primary)",
          padding: "2px 4px",
          minWidth: 0,
        }}
      />
      <label style={{ fontSize: 11, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
        Name
      </label>
      <input
        ref={nameInputRef}
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        onBlur={commitRename}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitRename();
          if (e.key === "Escape") {
            setLocalName(stageName);
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="Name"
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: 12,
          color: "var(--color-text-primary)",
          padding: "2px 4px",
          minWidth: 0,
        }}
      />
      <span style={{ fontSize: 10, color, fontWeight: 600, whiteSpace: "nowrap" }}>{t}</span>
    </div>
  );
}
