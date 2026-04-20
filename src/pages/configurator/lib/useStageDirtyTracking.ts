import { useMemo, useRef, useState, useCallback } from "react";
import type { ProcessStage, WebProcess } from "@/lib/ws-api-models";
import { stableJson } from "../utils/stableJson";

function stageFingerprint(s: ProcessStage): string {
  return [
    s.DisplayName ?? "",
    s.Name ?? "",
    s.GetData ?? "",
    s.GetNextStage ?? "",
    s.GetErrorNextStage ?? "",
    stableJson(s.Properties ?? {}),
  ].join("\0");
}

export interface StageDirtyTracking {
  /** Множество имён dirty-стейджей (пересчитывается при изменении Stages). */
  dirtyStages: Set<string>;
  /** Снять снимок текущих стейджей; обнуляет dirty. */
  reset: () => void;
}

/**
 * Tracking dirty-стейджей через сравнение «контрольной строки» (fingerprint)
 * каждого стейджа с её снимком, взятым при первом рендере процесса или после
 * успешного `reset()`.
 *
 * Снимок переинициализируется автоматически при смене `process.TypeName`.
 *
 * Вынесено из `ProcessEditor.tsx`, чтобы оркестратор не таскал этот state.
 */
export function useStageDirtyTracking(process: WebProcess | null): StageDirtyTracking {
  const stageSnapshots = useRef<Record<string, string>>({});
  const snapshotTaken = useRef(false);
  const currentTypeNameRef = useRef<string | null>(null);
  const [generation, setGeneration] = useState(0);

  // Сбрасываем снимок при смене процесса.
  if (currentTypeNameRef.current !== (process?.TypeName ?? null)) {
    currentTypeNameRef.current = process?.TypeName ?? null;
    stageSnapshots.current = {};
    snapshotTaken.current = false;
  }

  if (process?.Stages && !snapshotTaken.current) {
    const snap: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.Stages)) {
      snap[k] = stageFingerprint(v);
    }
    stageSnapshots.current = snap;
    snapshotTaken.current = true;
  }

  const dirtyStages = useMemo(() => {
    void generation;
    const set = new Set<string>();
    if (!process?.Stages) return set;
    for (const [k, v] of Object.entries(process.Stages)) {
      if (stageFingerprint(v) !== stageSnapshots.current[k]) {
        set.add(k);
      }
    }
    return set;
  }, [process?.Stages, generation]);

  const reset = useCallback(() => {
    if (!process?.Stages) return;
    const snap: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.Stages)) {
      snap[k] = stageFingerprint(v);
    }
    stageSnapshots.current = snap;
    setGeneration((g) => g + 1);
  }, [process?.Stages]);

  return { dirtyStages, reset };
}
