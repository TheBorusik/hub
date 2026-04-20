import { useCallback, useEffect, useRef, useState } from "react";
import type { HubWsApi } from "@/lib/ws-api";
import type {
  WebProcess, DiagnosticModel, UpsertProcessAssemblyResponse,
} from "@/lib/ws-api-models";
import type { useToast } from "@/providers/ToastProvider";
import type { useNotifications } from "@/providers/NotificationsProvider";
import type { useProblems } from "@/providers/ProblemsProvider";
import { publishCompileProblems, type NavigateToProcess } from "./publish-compile-problems";

type ToastApi = ReturnType<typeof useToast>;
type NotificationsApi = ReturnType<typeof useNotifications>;
type ProblemsApi = ReturnType<typeof useProblems>;

interface UseProcessSaveArgs {
  api: HubWsApi;
  process: WebProcess | null;
  toast: ToastApi;
  notifications: NotificationsApi;
  problems: ProblemsApi;
  navigateTo: NavigateToProcess;
  /** Вызывается после успешного `upsertProcessAssembly` PROCESS-части. */
  onSavedSnapshot: () => void;
  /** Информирует родителя «процесс сохранён» (например, перерисовать tree dirty). */
  onSaved?: () => void;
}

export interface ProcessSaveApi {
  saving: boolean;
  validating: boolean;
  /** Текущий список compile-диагностик — для индикатора `!`. */
  compileDiagnostics: DiagnosticModel[];
  setCompileDiagnostics: (diagnostics: DiagnosticModel[]) => void;
  /** Сохранить PROCESS + WEBDATA, опубликовать problems / notifications. */
  handleSave: () => Promise<void>;
  /** Структурная валидация на сервере; problems публикуются. */
  handleValidateProcess: () => Promise<void>;
}

/**
 * Save / autosave / validate для процесса. Раньше эти 240+ строк жили в
 * `ProcessEditor.tsx` — здесь они в одном чистом хуке без UI.
 *
 * Особенности:
 *  - сохраняем PROCESS и (если есть) WEBDATA параллельно через
 *    `Promise.allSettled`, чтобы один не блокировал другой;
 *  - successfull PROCESS «сбрасывает» dirty-снимок (через `onSavedSnapshot`);
 *  - compile-ошибки из payload PROCESS публикуются в `Problems` независимо
 *    от инфраструктурного исхода;
 *  - autosave дебаунс 5 сек после последнего изменения dirty-стейджа.
 */
export function useProcessSave({
  api,
  process,
  toast,
  notifications,
  problems,
  navigateTo,
  onSavedSnapshot,
  onSaved,
}: UseProcessSaveArgs): ProcessSaveApi {
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [compileDiagnostics, setCompileDiagnostics] = useState<DiagnosticModel[]>([]);

  const handleSave = useCallback(async () => {
    if (!process) return;
    setSaving(true);

    const hasWebData = !!process.WebData;
    const tasks: Array<Promise<unknown>> = [
      api.upsertProcessAssembly(process.TypeName, "PROCESS", process, false),
    ];
    if (hasWebData) {
      tasks.push(
        api.upsertProcessAssembly(process.TypeName + "WebData", "WEBDATA", process.WebData, false),
      );
    }

    const results = await Promise.allSettled(tasks);
    const processRes = results[0];
    const webDataRes = hasWebData ? results[1] : undefined;

    const errDetail = (r: PromiseRejectedResult) => {
      const e = r.reason;
      if (e instanceof Error) return e.message;
      if (typeof e === "string") return e;
      // SAL-сервер возвращает ошибки как объект Payload — вытаскиваем
      // наиболее частые поля.
      if (e && typeof e === "object") {
        const anyE = e as Record<string, unknown>;
        if (typeof anyE.Error === "string") return anyE.Error;
        if (typeof anyE.Message === "string") return anyE.Message;
      }
      try { return JSON.stringify(e); } catch { return String(e); }
    };

    const processOk = processRes.status === "fulfilled";
    const webDataOk = !webDataRes || webDataRes.status === "fulfilled";

    if (processOk) {
      onSavedSnapshot();
      onSaved?.();
    }

    // Парсим Errors из payload PROCESS (компиляция и т.п.) — независимо от
    // инфраструктурного успеха.
    const respDiagnostics: DiagnosticModel[] = [];
    const respStringErrors: string[] = [];
    if (processOk) {
      const payload = (processRes as PromiseFulfilledResult<UpsertProcessAssemblyResponse>).value;
      const rawErrors = payload?.Errors ?? [];
      for (const e of rawErrors) {
        if (typeof e === "string") respStringErrors.push(e);
        else if (e && typeof e === "object" && "Message" in e) respDiagnostics.push(e as DiagnosticModel);
      }
    }
    const hasCompileIssues = respDiagnostics.length > 0 || respStringErrors.length > 0;

    if (processOk) {
      setCompileDiagnostics(respDiagnostics);
      publishCompileProblems(
        process.TypeName, process.Name, respDiagnostics, respStringErrors, problems, navigateTo,
      );
    }

    if (!processOk && !webDataOk) {
      const detail =
        `PROCESS: ${errDetail(processRes as PromiseRejectedResult)}\n` +
        `WEBDATA: ${errDetail(webDataRes as PromiseRejectedResult)}`;
      notifications.push("error", "Failed to save both PROCESS and WEBDATA", {
        source: process.TypeName,
        body: detail,
      });
      console.error("Save failed (PROCESS)", (processRes as PromiseRejectedResult).reason);
      console.error("Save failed (WEBDATA)", (webDataRes as PromiseRejectedResult).reason);
    } else if (!processOk) {
      notifications.push("error", "Failed to save PROCESS", {
        source: process.TypeName,
        body: errDetail(processRes as PromiseRejectedResult),
      });
      console.error("Save failed (PROCESS)", (processRes as PromiseRejectedResult).reason);
    } else if (!webDataOk) {
      notifications.push("warning", "PROCESS saved, but WEBDATA failed", {
        source: process.TypeName,
        body: errDetail(webDataRes as PromiseRejectedResult),
      });
      console.error("Save failed (WEBDATA)", (webDataRes as PromiseRejectedResult).reason);
    }

    if (processOk && hasCompileIssues) {
      const n = respDiagnostics.length + respStringErrors.length;
      const bodyLines: string[] = [];
      if (respStringErrors.length > 0) bodyLines.push(...respStringErrors);
      notifications.push("warning", `Saved with ${n} compile error${n === 1 ? "" : "s"}: ${process.TypeName}`, {
        source: process.TypeName,
        body: bodyLines.length > 0 ? bodyLines.join("\n") : undefined,
        diagnostics: respDiagnostics.length > 0 ? respDiagnostics : undefined,
      });
    } else if (processOk && webDataOk) {
      toast.push("success", `Saved: ${process.TypeName}`);
    }

    setSaving(false);
  }, [api, process, toast, notifications, problems, navigateTo, onSavedSnapshot, onSaved]);

  const handleValidateProcess = useCallback(async () => {
    if (!process) return;
    setValidating(true);
    try {
      const res = await api.validateProcess(process);
      const raw = res?.Errors ?? [];
      const diagnostics: DiagnosticModel[] = [];
      const stringErrors: string[] = [];
      for (const e of raw) {
        if (typeof e === "string") stringErrors.push(e);
        else if (e && typeof e === "object" && "Message" in e) diagnostics.push(e as DiagnosticModel);
      }
      const total = diagnostics.length + stringErrors.length;
      publishCompileProblems(
        process.TypeName, process.Name, diagnostics, stringErrors, problems, navigateTo,
      );
      if (total === 0) {
        toast.push("success", `Validation passed: ${process.TypeName}`);
      } else {
        notifications.push(
          "warning",
          `Validation: ${total} issue${total === 1 ? "" : "s"} in ${process.TypeName}`,
          {
            source: process.TypeName,
            body: stringErrors.length > 0 ? stringErrors.join("\n") : undefined,
            diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
          },
        );
      }
    } catch (e) {
      notifications.push("error", "Validate Process failed", {
        source: process.TypeName,
        body: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setValidating(false);
    }
  }, [api, process, toast, notifications, problems, navigateTo]);

  return {
    saving,
    validating,
    compileDiagnostics,
    setCompileDiagnostics,
    handleSave,
    handleValidateProcess,
  };
}

interface UseAutoSaveArgs {
  enabled: boolean;
  process: WebProcess | null;
  saving: boolean;
  dirtyCount: number;
  handleSave: () => Promise<void>;
}

/** Debounced auto-save: 5 секунд тишины после последнего изменения dirty. */
export function useAutoSave({ enabled, process, saving, dirtyCount, handleSave }: UseAutoSaveArgs): void {
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled || !process) return;
    if (saving) return;
    if (dirtyCount === 0) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      handleSave();
    }, 5000);
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, process, dirtyCount, saving, handleSave]);
}
