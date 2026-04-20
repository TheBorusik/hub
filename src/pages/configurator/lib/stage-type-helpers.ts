/**
 * Набор helpers для работы с `Type` стейджа.
 *
 * В коде процессов встречаются оба варианта:
 *  - short: `"Start"`, `"CRUD"`, `"Command"`, `"Transform"`, `"Event"`, `"SubStart"`, `"Sub"`, `"Final"`, `"End"`
 *  - long:  `"CRUDDefinition"`, `"CommandDefinition"`, …
 *
 * `norm` сводит оба к short-варианту. Остальные helpers принимают как сырой
 * `Type`, так и нормализованный — результат одинаков.
 */

/** `"CRUDDefinition"` → `"CRUD"`, `"Start"` → `"Start"`. */
export function normStageType(type: string): string {
  return type.replace("Definition", "");
}

/**
 * Метка для поля `GetData` в UI редактора стейджа — разная по типу:
 * CRUD → «Make Command Payload Script», Sub → «Make Init Params Script», и т.п.
 */
export function getDataLabel(type: string): string {
  const t = normStageType(type);
  switch (t) {
    case "CRUD":
      return "Make Command Payload Script:";
    case "Command":
      return "Make Command Payload Script:";
    case "Sub":
    case "SubStart":
      return "Make Init Params Script:";
    case "Event":
      return "Make Event Payload Script:";
    case "End":
    case "Final":
      return "Make Result Payload Script:";
    default:
      return "GetData:";
  }
}

/** Есть ли у стейджа этого типа поле `GetData` (body-скрипт). */
export function stageHasGetData(type: string): boolean {
  const t = normStageType(type);
  return !["Start", "Transform"].includes(t);
}

/** Есть ли у стейджа этого типа поле `GetNextStage`. */
export function stageHasGetNextStage(type: string): boolean {
  const t = normStageType(type);
  return !["End", "Final"].includes(t);
}

/**
 * Есть ли у стейджа этого типа поле `GetErrorNextStage` (fallback при ошибке
 * выполнения). `Transform`/`Event`/`Start`/`End` не имеют — они либо
 * терминальные, либо не вызывают внешний код, способный упасть.
 */
export function stageHasGetErrorNextStage(type: string): boolean {
  const t = normStageType(type);
  return !["End", "Final", "Transform", "Event", "Start"].includes(t);
}

/**
 * Распаковка `ProcessResult` из sample-payload'а, который приходит с сервера
 * после `Run` процесса: возможны форматы `{ CommandResult: { ProcessResult: ... }}`,
 * `{ CommandResult: { Result: ... } }`, плоский `{ Result: ... }` или сразу объект.
 * Возвращает `Record<string, unknown>` или `null`, если payload пустой.
 */
export function extractProcessResult(raw: unknown): Record<string, unknown> | null {
  const wrapper = raw as Record<string, unknown> | null;
  const cr = (wrapper?.CommandResult ?? wrapper) as Record<string, unknown> | null;
  const pr = (cr?.ProcessResult ?? cr?.Result ?? cr) as Record<string, unknown> | null;
  return pr ?? null;
}
