import type { ReactNode } from "react";
import type { CodeEditorLanguage, CodeEditorMarker } from "@/components/ui/CodeEditor";

/**
 * Состояние редактора (грязный, сохраняется, валидируется)
 */
export interface EditorState {
  /** Флаг изменений, не сохранённых на сервере */
  dirty?: boolean;
  /** Флаг выполнения операции сохранения */
  saving?: boolean;
  /** Флаг выполнения операции валидации */
  validating?: boolean;
  /** Флаг выполнения операции форматирования */
  formatting?: boolean;
  /** Флаг выполнения операции коммита */
  committing?: boolean;
  /** Флаг загрузки содержимого */
  loading?: boolean;
}

/**
 * Действие в тулбаре редактора
 */
export interface EditorAction {
  /** Идентификатор действия (для key) */
  id: string;
  /** Иконка действия */
  icon: ReactNode;
  /** Текст на кнопке (опционально) */
  label?: string;
  /** Всплывающая подсказка */
  title: string;
  /** Обработчик клика */
  onClick: () => void;
  /** Состояние disabled */
  disabled?: boolean;
  /** Вариант кнопки */
  variant?: "primary" | "secondary" | "ghost";
  /** Состояние загрузки (показывает спиннер вместо иконки) */
  loading?: boolean;
  /** Горячая клавиша */
  hotkey?: string;
}

/**
 * Основные пропсы компонента EditorPanel
 */
export interface EditorPanelProps {
  /** Заголовок панели */
  title: string;
  /** Иконка слева от заголовка */
  icon?: ReactNode;
  /** Бейдж (например, количество ошибок) */
  badge?: ReactNode;
  /** Подсказка/дополнительная информация */
  hint?: string;
  /** Действия в тулбаре */
  actions?: EditorAction[];
  /** Содержимое редактора */
  value: string;
  /** Обработчик изменения содержимого */
  onChange?: (value: string) => void;
  /** Язык программирования */
  language: CodeEditorLanguage;
  /** Состояние редактора */
  state?: EditorState;
  /** Маркеры ошибок/предупреждений */
  markers?: CodeEditorMarker[];
  /** Вариант отображения */
  variant?: "default" | "compact" | "borderless";
  /** Показывать ли заголовок */
  showHeader?: boolean;
  /** Показывать ли тулбар */
  showToolbar?: boolean;
  /** Только для чтения */
  readOnly?: boolean;
  /** Уникальный путь модели (для Monaco) */
  path?: string;
  /** Тема редактора */
  theme?: string;
  /** Дополнительные опции Monaco */
  options?: Record<string, unknown>;
  /** Обработчик монтирования редактора */
  onMount?: (editor: any, monaco: any) => void;
  /** Обработчик перед монтированием */
  beforeMount?: (monaco: any) => void;
  /** CSS класс */
  className?: string;
  /** Стили */
  style?: React.CSSProperties;
  /** ARIA label */
  "aria-label"?: string;
}

/**
 * Пропсы для встроенного компонента проблем/ошибок
 */
export interface ProblemsPanelProps {
  /** Массив маркеров */
  markers: CodeEditorMarker[];
  /** Заголовок панели (по умолчанию "Problems") */
  title?: string;
  /** Максимальная высота */
  maxHeight?: number | string;
  /** Обработчик клика по проблеме (для перехода к строке) */
  onProblemClick?: (marker: CodeEditorMarker) => void;
  /** Показывать ли панель проблем */
  showProblems?: boolean;
}

/**
 * Конфигурация горячих клавиш
 */
export interface EditorHotkeys {
  /** Сохранить (Ctrl+S) */
  save?: () => void;
  /** Валидировать (Ctrl+Shift+V) */
  validate?: () => void;
  /** Форматировать (Shift+Alt+F) */
  format?: () => void;
  /** Коммит (Ctrl+Shift+C) */
  commit?: () => void;
}