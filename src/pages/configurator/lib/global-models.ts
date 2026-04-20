import type { WebGlobalModel, DiagnosticModel } from "@/lib/ws-api-models";

/**
 * Фиксированный порядок категорий в сайдбаре Global Models.
 * Неизвестные категории идут после этих по алфавиту.
 */
export const GLOBAL_MODEL_CATEGORIES = ["MODEL", "HELPER", "CRUD"] as const;

/**
 * Ключ модели — `Category::TypeName`. Нужен, чтобы различать записи с одинаковыми
 * именами в разных категориях (в API `TypeName` уникален только в рамках категории).
 */
export function modelKey(m: Pick<WebGlobalModel, "Category" | "TypeName">): string {
  return `${m.Category}::${m.TypeName}`;
}

/**
 * Цвет категории для badge в toolbar / списке. Держим локально, т.к. это не
 * цвета стейджей — к `STAGE_TYPE_COLORS` не имеет отношения.
 */
export function categoryBadgeColor(cat: string): string {
  switch (cat) {
    case "HELPER":
      return "#dcdcaa";
    case "MODEL":
      return "#9cdcfe";
    case "CRUD":
      return "#ce9178";
    default:
      return "#999";
  }
}

/**
 * Нормализация `DiagnosticModel` либо строки в `DiagnosticModel`-совместимый объект.
 * `validateGlobalModel`/`addGlobalModel` иногда возвращают строки в `Errors` —
 * приводим их к диагностикам с позицией 1:1, чтобы единообразно рендерить markers.
 */
export function toDiagnostic(e: DiagnosticModel | string): DiagnosticModel {
  if (typeof e === "string") {
    return {
      Text: e,
      Message: e,
      StartLine: 1,
      EndLine: 1,
      StartColumn: 1,
      EndColumn: 1,
    };
  }
  return e;
}
