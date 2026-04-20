import { useEffect } from "react";

interface UseProcessHotkeysArgs {
  /** Ctrl+S — save the current process. */
  onSave: () => void;
  /** Ctrl+Shift+O — quick open a stage (VS Code "Go to Symbol"-style). */
  onQuickOpenStages: () => void;
}

/**
 * Локальные хоткеи `ProcessEditor`: Ctrl+S и Ctrl+Shift+O. Глобальные
 * Ctrl+P (Quick Open process) и Ctrl+Shift+P (Command Palette) слушает
 * Shell — локально дублировать нельзя, иначе откроются обе панели.
 */
export function useProcessHotkeys({ onSave, onQuickOpenStages }: UseProcessHotkeysArgs): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      if (!e.shiftKey && !e.altKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        onSave();
        return;
      }
      if (e.shiftKey && !e.altKey && (e.key === "o" || e.key === "O")) {
        e.preventDefault();
        onQuickOpenStages();
        return;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onSave, onQuickOpenStages]);
}
