/**
 * Единая карта цветов стейджей для всех Configurator-компонентов.
 *
 * Карта намеренно содержит **оба** варианта ключа: короткий (`CRUD`,
 * `Command`, `SubStart`, `Final`, `End`) и полный (`CRUDDefinition`,
 * `CommandDefinition`, `SubDefinition`, `EndDefinition`). В разных местах
 * кодовой базы тип стейджа приходит по-разному:
 *  - из `WebProcess.Stages` приходит `*Definition` (выдаётся сервером при
 *    `Create`);
 *  - из UI-диалогов (`AddStageDialog`) приходит короткая форма (что выбирает
 *    пользователь в селекторе);
 *  - при генерации `ReturnStages` мы смотрим на оба варианта.
 *
 * Поэтому тесты на принадлежность цвету должны работать обоих вариантов —
 * не нужно нормализовать вход, просто `STAGE_TYPE_COLORS[type]`.
 */
export const STAGE_TYPE_COLORS: Record<string, string> = {
  Start: "#5CADD5",
  CRUD: "seagreen",
  CRUDDefinition: "seagreen",
  Command: "#0FD334",
  CommandDefinition: "#0FD334",
  Transform: "#0F8B8D",
  TransformDefinition: "#0F8B8D",
  Event: "#FCA6ED",
  EventDefinition: "#FCA6ED",
  Sub: "#0089ED",
  SubStart: "#0089ED",
  SubDefinition: "#0089ED",
  Final: "#F6511D",
  End: "#F6511D",
  EndDefinition: "#F6511D",
};

/** Fallback-цвет для неизвестных типов. */
export const STAGE_COLOR_FALLBACK = "#888";

/** Возвращает цвет стейджа по его `Type`, либо `STAGE_COLOR_FALLBACK`. */
export function stageColor(type: string | undefined | null): string {
  if (!type) return STAGE_COLOR_FALLBACK;
  return STAGE_TYPE_COLORS[type] ?? STAGE_COLOR_FALLBACK;
}

/** Человекочитаемая метка для типа стейджа. Используется в диаграмме/outline. */
export function stageTypeLabel(type: string): string {
  if (type === "Start") return "Start";
  if (type === "EndDefinition" || type === "End" || type === "Final") return "End";
  if (type === "CRUDDefinition" || type === "CRUD") return "CRUD";
  if (type === "CommandDefinition" || type === "Command") return "Command";
  if (type === "TransformDefinition" || type === "Transform") return "Transform";
  if (type === "EventDefinition" || type === "Event") return "Event";
  if (type === "SubDefinition" || type === "SubStart" || type === "Sub") return "Sub";
  return type;
}
