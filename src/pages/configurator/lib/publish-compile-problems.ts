import type { DiagnosticModel } from "@/lib/ws-api-models";
import type { Problem } from "@/providers/ProblemsProvider";

/** Префикс `source` для compile-диагностик Configurator'а. Отдельный key per
 *  process: `configurator.compile:${typeName}`. */
export const COMPILE_PROBLEM_SOURCE = "configurator.compile";

export interface ProblemsLike {
  setSource: (source: string, next: Problem[]) => void;
  clearSource: (source: string) => void;
}

export interface NavigateToProcess {
  (section: "configurator", intent: { kind: "openProcessInConfigurator"; processName: string }): void;
}

/**
 * Зарегистрировать компиляционные ошибки процесса в глобальном
 * `ProblemsProvider`. Замещает все предыдущие проблемы с тем же
 * `source` ключом (одна запись на процесс). Пустой массив = «всё
 * чисто» — запись удаляется `setSource([])` (не `clearSource`, т.к.
 * нам нужно зарегистрировать пустой список, иначе старые останутся).
 */
export function publishCompileProblems(
  typeName: string,
  processName: string | undefined,
  diagnostics: DiagnosticModel[],
  stringErrors: string[],
  problems: Pick<ProblemsLike, "setSource">,
  navigateTo: NavigateToProcess,
) {
  const source = COMPILE_PROBLEM_SOURCE;
  const resource = typeName;
  // onReveal для конкретного процесса — глобальная навигация в
  // Configurator с открытием этого процесса. Даже если пользователь
  // находится в другом разделе, клик по проблеме вернёт его сюда.
  const reveal = () => {
    if (!processName) return;
    navigateTo("configurator", { kind: "openProcessInConfigurator", processName });
  };
  const list: Problem[] = [];
  for (let i = 0; i < diagnostics.length; i++) {
    const d = diagnostics[i];
    list.push({
      id: `${source}:${typeName}:${i}`,
      severity: "error",
      source,
      resource,
      message: d.Message || d.Text,
      line: d.StartLine,
      column: d.StartColumn,
      timestamp: Date.now(),
      onReveal: reveal,
    });
  }
  for (let i = 0; i < stringErrors.length; i++) {
    list.push({
      id: `${source}:${typeName}:str:${i}`,
      severity: "error",
      source,
      resource,
      message: stringErrors[i],
      timestamp: Date.now(),
      onReveal: reveal,
    });
  }
  // Отдельный source per-process, чтобы setSource не затирал
  // диагностики других процессов.
  problems.setSource(`${source}:${typeName}`, list);
}

/** Ключ `source` для проблем конкретного процесса. Полезно для `clearSource`. */
export function compileProblemSourceFor(typeName: string): string {
  return `${COMPILE_PROBLEM_SOURCE}:${typeName}`;
}
