import type { ProcessStage, WebProcess } from "@/lib/ws-api-models";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Переименование стейджа внутри `WebProcess`.
 *
 * Обновляет:
 *  - `Stages`: создаёт запись с новым ключом, выставляет `Name = newName`;
 *  - тела `GetNextStage` / `GetErrorNextStage` всех остальных стейджей —
 *    заменяет `return <oldName>;` → `return <newName>;` (через regex по
 *    `\breturn\s+…\s*;`, чтобы не задеть частичные совпадения в строках);
 *  - `ReturnStages` всех стейджей — меняет вхождения `oldName` на `newName`;
 *  - `Startup` — если процесс стартует с этого стейджа;
 *  - `WebData.Stages[oldName]` → `[newName]`, а также ключи `Lines[oldName]`
 *    в каждом WebData-стейдже.
 *
 * Возвращает `null`, если имя уже занято или `oldName` не существует —
 * вызывающий код не должен применять изменение.
 */
export function renameStageInProcess(
  process: WebProcess,
  oldName: string,
  newName: string,
): WebProcess | null {
  const stages = { ...process.Stages };
  if (stages[newName] || !stages[oldName]) return null;

  const oldRe = new RegExp(`\\breturn\\s+${escapeRegex(oldName)}\\s*;`, "g");

  const newStages: Record<string, ProcessStage> = {};
  for (const [k, v] of Object.entries(stages)) {
    if (k === oldName) {
      newStages[newName] = { ...v, Name: newName };
    } else {
      const updated = { ...v };
      if (updated.GetNextStage) {
        updated.GetNextStage = updated.GetNextStage.replace(oldRe, `return ${newName};`);
      }
      if (updated.GetErrorNextStage) {
        updated.GetErrorNextStage = updated.GetErrorNextStage.replace(oldRe, `return ${newName};`);
      }
      if (updated.ReturnStages) {
        updated.ReturnStages = updated.ReturnStages.map((r) => (r === oldName ? newName : r));
      }
      newStages[k] = updated;
    }
  }

  const webStages = { ...(process.WebData?.Stages ?? {}) };
  if (webStages[oldName]) {
    webStages[newName] = webStages[oldName];
    delete webStages[oldName];
  }
  for (const ws of Object.values(webStages)) {
    if (ws.Lines?.[oldName]) {
      ws.Lines[newName] = ws.Lines[oldName];
      delete ws.Lines[oldName];
    }
  }

  return {
    ...process,
    Stages: newStages,
    Startup: process.Startup === oldName ? newName : process.Startup,
    WebData: process.WebData ? { ...process.WebData, Stages: webStages } : process.WebData,
  };
}
