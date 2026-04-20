import { useCallback, useMemo, useState } from "react";
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

interface Snapshot {
  typeName: string | null;
  fingerprints: Record<string, string>;
}

function computeFingerprints(stages: Record<string, ProcessStage> | undefined): Record<string, string> {
  if (!stages) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(stages)) {
    out[k] = stageFingerprint(v);
  }
  return out;
}

/**
 * Tracking dirty-стейджей через сравнение «контрольной строки» (fingerprint)
 * каждого стейджа с её снимком, взятым при первом рендере процесса или после
 * успешного `reset()`.
 *
 * Снимок переинициализируется автоматически при смене `process.TypeName`
 * (паттерн "derived state on prop change" — синхронный setState в рендере,
 * без эффекта).
 *
 * Вынесено из `ProcessEditor.tsx`, чтобы оркестратор не таскал этот state.
 */
export function useStageDirtyTracking(process: WebProcess | null): StageDirtyTracking {
  const typeName = process?.TypeName ?? null;
  const stages = process?.Stages;

  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({
    typeName,
    fingerprints: computeFingerprints(stages),
  }));

  // Derived state on prop change: при смене процесса синхронно пересчитываем
  // снимок — без эффекта и без «вспышки dirty» на один кадр.
  let effectiveSnapshot = snapshot;
  if (snapshot.typeName !== typeName) {
    effectiveSnapshot = {
      typeName,
      fingerprints: computeFingerprints(stages),
    };
    setSnapshot(effectiveSnapshot);
  }

  const dirtyStages = useMemo(() => {
    const set = new Set<string>();
    if (!stages) return set;
    for (const [k, v] of Object.entries(stages)) {
      if (stageFingerprint(v) !== effectiveSnapshot.fingerprints[k]) {
        set.add(k);
      }
    }
    return set;
  }, [stages, effectiveSnapshot]);

  const reset = useCallback(() => {
    setSnapshot({
      typeName,
      fingerprints: computeFingerprints(stages),
    });
  }, [typeName, stages]);

  return { dirtyStages, reset };
}
