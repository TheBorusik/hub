import type { ReactNode } from "react";

/**
 * Единая регистрационная запись команды приложения. Потребляется:
 *   - Command Palette (Ctrl+Shift+P): все команды с visible !== false, с учётом fuzzy match по title/category;
 *   - ContextMenu: подписчики получают список доступных команд для данного контекста;
 *   - Hotkey runtime: привязка keybinding → runCommand.
 *
 * Команда — это "действие" и ничего больше. Никаких UI- или domain-состояний
 * внутри: она должна только вызвать callback, а весь контекст (current section,
 * open tab, selected node, ...) команда получает через замыкание registerCommand.
 */
export interface Command {
  /** Уникальный ID. Convention: `section.action`, напр. `viewer.delete`, `configurator.run`. */
  id: string;
  /** Человеко-читаемое название — показывается в палитре. */
  title: string;
  /** Категория для группировки в палитре: "Viewer", "Configurator", "Git", ... */
  category?: string;
  /** Иконка для визуального якоря. */
  icon?: ReactNode;
  /** Keyboard binding: "mod+shift+p", "ctrl+s", ["mod+enter", "f5"]. */
  keybinding?: string | readonly string[];
  /** Описание для tooltip'а в палитре. */
  description?: string;
  /** Ярлык группы в палитре (например "Recently used"). Если не задан — category. */
  group?: string;
  /** Обработчик действия. */
  run: (context?: CommandContext) => void | Promise<void>;
  /** Предикат «можно ли сейчас выполнить»: отрисуется disabled в палитре. */
  isEnabled?: (context?: CommandContext) => boolean;
  /** Скрыть из палитры (но оставить для hotkey / menu). */
  visible?: boolean;
  /** Относительный приоритет сортировки. Больше = выше. */
  priority?: number;
}

/**
 * Контекст, в котором выполняется команда. Намеренно «прозрачный» —
 * conventions можно расширять по мере появления нужных сигналов.
 */
export interface CommandContext {
  /** Текущая активная section: "configurator" | "viewer" | "system" | ... */
  activeSection?: string;
  /** Произвольный полезный payload (например, selected row id). */
  payload?: unknown;
}
