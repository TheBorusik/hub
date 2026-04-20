import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, FileCode2 } from "lucide-react";
import type { HubWsApi } from "@/lib/ws-api";
import type { WebGlobalModel, DiagnosticModel } from "@/lib/ws-api-models";
import { Button } from "@/components/ui/Button";
import { EmptyState as UIEmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/providers/ToastProvider";
import { modelKey, toDiagnostic } from "../lib/global-models";
import { GlobalModelsSidebar } from "./GlobalModelsSidebar";
import { GlobalModelEditor, type GlobalModelBusyState } from "./GlobalModelEditor";
import { AddGlobalModelDialog } from "./AddGlobalModelDialog";
import { CommitMessageDialog } from "./CommitMessageDialog";

interface GlobalModelsPanelProps {
  api: HubWsApi;
}

/**
 * Оркестратор Global Models: хранит список моделей, выбранную модель, filter,
 * collapsed состояние категорий, busy-флаги, диагностики и снимки оригинального
 * кода (для dirty-трекинга).
 *
 * Рендерит:
 *  - `<GlobalModelsSidebar>` — левая панель со списком (виртуализирована).
 *  - `<GlobalModelEditor>` — правая часть с CodeEditor (или EmptyState).
 *  - `<AddGlobalModelDialog>` / `<CommitMessageDialog>` — модалки.
 *
 * Глобальные хоткеи: `Ctrl+S` сохранить, `Shift+Alt+F` форматировать.
 */
export function GlobalModelsPanel({ api }: GlobalModelsPanelProps) {
  const toast = useToast();
  const [models, setModels] = useState<WebGlobalModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [diagnostics, setDiagnostics] = useState<DiagnosticModel[]>([]);
  const [busy, setBusy] = useState<GlobalModelBusyState>("idle");
  const [commitOpen, setCommitOpen] = useState(false);

  // Снимки «оригинального» кода для dirty-трекинга (по ключу Category::TypeName).
  // Держим в state, а не в ref: ререндер нужен, чтобы сбросить `Save` и точку в sidebar
  // после успешного сохранения (иначе мутация ref не триггерит пересчёт `isDirty`).
  const [originalCode, setOriginalCode] = useState<Record<string, string>>({});

  const load = useCallback(
    async (preserveSelection = false, selectAfterLoad?: { Category: string; TypeName: string }) => {
      setLoading(true);
      try {
        const res = await api.getGlobalModels();
        const list = res.GlobalModels ?? [];
        setModels(list);
        const snaps: Record<string, string> = {};
        for (const m of list) snaps[modelKey(m)] = m.Code ?? "";
        setOriginalCode(snaps);

        const explicitKey = selectAfterLoad ? modelKey(selectAfterLoad) : null;
        if (explicitKey && list.some((m) => modelKey(m) === explicitKey)) {
          setSelectedKey(explicitKey);
        } else if (!preserveSelection && !selectedKey && list.length > 0) {
          setSelectedKey(modelKey(list[0]));
        } else if (selectedKey && !list.some((m) => modelKey(m) === selectedKey)) {
          // Выбранная модель пропала (например, после rename) — сбрасываем.
          setSelectedKey(list.length > 0 ? modelKey(list[0]) : null);
        }
      } catch (e) {
        console.error("Failed to load global models", e);
        toast.push("error", "Failed to load global models", { detail: String(e) });
      } finally {
        setLoading(false);
      }
    },
    [api, selectedKey, toast],
  );

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(
    () => models.find((m) => modelKey(m) === selectedKey) ?? null,
    [models, selectedKey],
  );

  const isDirty = useMemo(() => {
    if (!selected) return false;
    return (originalCode[modelKey(selected)] ?? "") !== (selected.Code ?? "");
  }, [selected, originalCode]);

  const updateSelectedCode = useCallback((next: string) => {
    setSelectedKey((curKey) => {
      if (!curKey) return curKey;
      setModels((prev) => prev.map((m) => (modelKey(m) === curKey ? { ...m, Code: next } : m)));
      return curKey;
    });
    // Любая правка сбрасывает подсветку ошибок — они относятся к предыдущему состоянию.
    setDiagnostics([]);
  }, []);

  // Сброс маркеров при смене выбранной модели.
  useEffect(() => {
    setDiagnostics([]);
  }, [selectedKey]);

  const handleValidate = useCallback(async () => {
    if (!selected) return;
    setBusy("validating");
    try {
      // Серверу нужен весь `WebGlobalModel` (Category+TypeName+Code), а не только код,
      // иначе `ValidateGlobalModelCommand.Model` == null → NRE в хендлере.
      const res = await api.validateGlobalModel({
        Category: selected.Category,
        TypeName: selected.TypeName,
        Code: selected.Code ?? "",
      });
      setDiagnostics((res.Errors ?? []).map(toDiagnostic));
      if (!res.Errors || res.Errors.length === 0) {
        toast.push("success", "Syntax valid", { duration: 1800 });
      } else {
        toast.push("warning", `${res.Errors.length} error(s)`, { duration: 2500 });
      }
    } catch (e) {
      toast.push("error", "Validation failed", { detail: String(e) });
    } finally {
      setBusy("idle");
    }
  }, [api, selected, toast]);

  const handleFormat = useCallback(async () => {
    if (!selected) return;
    setBusy("formatting");
    try {
      const res = await api.formatCode(selected.Code ?? "");
      updateSelectedCode(res.Code ?? selected.Code ?? "");
    } catch (e) {
      toast.push("error", "Format failed", { detail: String(e) });
    } finally {
      setBusy("idle");
    }
  }, [api, selected, toast, updateSelectedCode]);

  const handleSave = useCallback(async () => {
    if (!selected) return;
    setBusy("saving");
    try {
      const res = await api.addGlobalModel(
        { Category: selected.Category, TypeName: selected.TypeName, Code: selected.Code ?? "" },
        false,
      );
      const errs = (res?.Errors ?? []).map(toDiagnostic);
      setDiagnostics(errs);
      if (errs.length === 0) {
        const savedCode = selected.Code ?? "";
        const savedKey = modelKey(selected);
        setOriginalCode((prev) => ({ ...prev, [savedKey]: savedCode }));
        toast.push("success", `Saved: ${selected.TypeName}`, { duration: 1800 });
      } else {
        toast.push("warning", `Saved with ${errs.length} error(s)`, { duration: 2500 });
      }
    } catch (e) {
      toast.push("error", "Save failed", { detail: String(e) });
    } finally {
      setBusy("idle");
    }
  }, [api, selected, toast]);

  const handleCommit = useCallback(
    async (message: string) => {
      if (!selected) return;
      setBusy("committing");
      try {
        const res = await api.commitProcessAssembly([selected.TypeName], message);
        toast.push("success", `Committed ${res.CommitHash?.slice(0, 8) ?? ""}`.trim(), {
          detail: (res.Names ?? []).join(", "),
          duration: 2500,
        });
        setCommitOpen(false);
      } catch (e) {
        toast.push("error", "Commit failed", { detail: String(e) });
      } finally {
        setBusy("idle");
      }
    },
    [api, selected, toast],
  );

  // Хоткеи: Ctrl+S сохранить, Shift+Alt+F форматировать.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!selected) return;
      if (e.ctrlKey && !e.shiftKey && !e.altKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        void handleSave();
      } else if (e.shiftKey && e.altKey && (e.key === "f" || e.key === "F" || e.code === "KeyF")) {
        e.preventDefault();
        void handleFormat();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, handleSave, handleFormat]);

  const toggleCollapsed = useCallback((category: string) => {
    setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }));
  }, []);

  return (
    <div className="flex h-full" style={{ minHeight: 0 }}>
      <GlobalModelsSidebar
        models={models}
        loading={loading}
        filter={filter}
        onFilterChange={setFilter}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        selectedKey={selectedKey}
        onSelect={setSelectedKey}
        originalCodeSnap={originalCode}
        onRefresh={() => void load(true)}
        onAdd={() => setShowAdd(true)}
      />

      <div className="flex-1 flex flex-col min-w-0" style={{ minHeight: 0 }}>
        {selected ? (
          <GlobalModelEditor
            model={selected}
            onCodeChange={updateSelectedCode}
            diagnostics={diagnostics}
            isDirty={isDirty}
            busy={busy}
            onValidate={handleValidate}
            onFormat={handleFormat}
            onSave={handleSave}
            onOpenCommit={() => setCommitOpen(true)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <UIEmptyState
              icon={<FileCode2 size={40} />}
              title="Select a class to view details"
              hint="Choose a class from the left panel to start editing"
              action={
                <Button size="sm" variant="secondary" icon={<Plus size={12} />} onClick={() => setShowAdd(true)}>
                  Add new class
                </Button>
              }
            />
          </div>
        )}
      </div>

      {showAdd && (
        <AddGlobalModelDialog
          api={api}
          existingNames={new Set(models.map((m) => modelKey(m)))}
          onClose={() => setShowAdd(false)}
          onAdded={(m) => {
            setShowAdd(false);
            void load(false, m);
          }}
        />
      )}

      {commitOpen && selected && (
        <CommitMessageDialog
          typeName={selected.TypeName}
          busy={busy === "committing"}
          onCancel={() => setCommitOpen(false)}
          onCommit={handleCommit}
        />
      )}
    </div>
  );
}
