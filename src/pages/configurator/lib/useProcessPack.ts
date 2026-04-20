import { useCallback, useRef } from "react";
import type { WebProcess } from "@/lib/ws-api-models";
import type { useToast } from "@/providers/ToastProvider";
import type { useNotifications } from "@/providers/NotificationsProvider";

type ToastApi = ReturnType<typeof useToast>;
type NotificationsApi = ReturnType<typeof useNotifications>;

interface UseProcessPackArgs {
  process: WebProcess | null;
  toast: ToastApi;
  notifications: NotificationsApi;
  onProcessUpdate: (process: WebProcess) => void;
}

export interface ProcessPackApi {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  /** Скачать текущий процесс как JSON. */
  handlePack: () => void;
  /** Открыть file picker для Unpack. */
  handleUnpackClick: () => void;
  /** Прочитать выбранный JSON-файл и заменить им процесс. */
  handleUnpackFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Pack (download JSON) / Unpack (upload + parse + replace) для текущего
 * процесса. Сам файл-инпут хранится в ref, который ProcessEditor рендерит
 * скрытно (через ProcessEditorActionRail).
 */
export function useProcessPack({
  process,
  toast,
  notifications,
  onProcessUpdate,
}: UseProcessPackArgs): ProcessPackApi {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePack = useCallback(() => {
    if (!process) return;
    try {
      const json = JSON.stringify(process, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${process.TypeName || "process"}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Освобождаем URL чуть позже, чтобы браузер успел запустить скачивание.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.push("success", `Packed ${process.TypeName}.json`, { duration: 2000 });
    } catch (e) {
      notifications.push("error", "Failed to pack process", {
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }, [process, toast, notifications]);

  const handleUnpackClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleUnpackFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !process) return;
    const reader = new FileReader();
    reader.onerror = () => {
      notifications.push("error", "Failed to read file", { body: String(reader.error) });
    };
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const parsed = JSON.parse(text) as WebProcess;
        if (!parsed || typeof parsed !== "object" || !("TypeName" in parsed)) {
          throw new Error("Invalid WebProcess dump: missing TypeName");
        }
        onProcessUpdate(parsed);
        toast.push("success", `Unpacked: ${parsed.TypeName}`);
      } catch (err) {
        notifications.push("error", "Failed to unpack file", {
          body: err instanceof Error ? err.message : String(err),
        });
      }
    };
    reader.readAsText(file);
  }, [process, onProcessUpdate, toast, notifications]);

  return { fileInputRef, handlePack, handleUnpackClick, handleUnpackFile };
}
