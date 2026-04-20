import type { CSSProperties } from "react";

/**
 * Общие inline-стили для всплывающих диалогов в `ConfigurationPanel` и
 * смежных overlay'ях (Upsert Adapter Type / Configuration / Section).
 *
 * Осознанно оставлены здесь, а не уехали в UI-kit `<Modal>`:
 * эти диалоги рендерятся внутри правой части панели (absolute inset),
 * а не через portal в `document.body`. Единый `<Modal>`-primitive сейчас
 * работает через portal + focus-trap — переводить на него следует отдельной
 * миграцией (пункт 6.4 ТЗ), вместе с `role="dialog"` и return-focus.
 */

export const overlayBg: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 20,
  backgroundColor: "rgba(0,0,0,0.3)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  paddingTop: 60,
};

export const dialogStyle: CSSProperties = {
  backgroundColor: "var(--color-sidebar)",
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  padding: 20,
  minWidth: 340,
  maxWidth: "80%",
  boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
};

export const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  color: "var(--color-text-muted)",
};

export const inputStyle: CSSProperties = {
  background: "var(--color-input-bg)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text)",
  fontSize: 12,
  padding: "4px 8px",
  height: 24,
  borderRadius: 3,
  outline: "none",
};

export const cancelBtnStyle: CSSProperties = {
  padding: "4px 12px",
  fontSize: 12,
  background: "none",
  border: "1px solid var(--color-border)",
  color: "var(--color-text-muted)",
  borderRadius: 3,
  cursor: "pointer",
};

export const primaryBtnStyle: CSSProperties = {
  padding: "4px 12px",
  fontSize: 12,
  background: "#0e639c",
  border: "none",
  color: "#fff",
  borderRadius: 3,
  cursor: "pointer",
};

/**
 * JSON → красиво отформатированная строка. Если вход уже строка — пытается
 * распарсить и заново сериализовать. На невалидном JSON возвращает исходное
 * значение (для строки) или `"{}"` (для объектов и для `null`).
 *
 * Переиспользуется редакторами секций (`ConfigTabContent`) и базовой
 * инициализацией формы `CreateSectionOverlay`.
 */
export function tryFormatJson(raw: unknown): string {
  if (raw == null) return "{}";
  if (typeof raw !== "string") {
    try {
      return JSON.stringify(raw, null, 2);
    } catch {
      return "{}";
    }
  }
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
