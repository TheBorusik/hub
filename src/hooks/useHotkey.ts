import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Поддерживаемые модификаторы в строке combo: ctrl, meta, alt, shift, mod.
 * `mod` — кроссплатформенный: на Mac это Meta (Cmd), иначе Ctrl.
 * Примеры: "ctrl+s", "mod+shift+p", "escape", "arrowdown".
 *
 * Сравнение case-insensitive; несколько combo можно задать массивом.
 */
export type Hotkey = string | readonly string[];

export interface UseHotkeyOptions {
  /** Если false — слушатель не навешивается. default: true */
  enabled?: boolean;
  /** Вызвать `preventDefault()` перед handler. default: true для не-Escape */
  preventDefault?: boolean;
  /** Вызвать `stopPropagation()`. default: false */
  stopPropagation?: boolean;
  /**
   * Игнорировать, если фокус сейчас в input/textarea/contenteditable.
   * Полезно для глобальных шоткатов вроде Ctrl+P. default: false.
   */
  ignoreWhenTyping?: boolean;
  /** Таргет, к которому цепляемся. default: window */
  target?: Window | HTMLElement | null;
}

const isMac = typeof navigator !== "undefined" && /Mac|iP(hone|ad|od)/.test(navigator.platform);

function parseCombo(combo: string): {
  key: string;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
} {
  const parts = combo.toLowerCase().split("+").map((p) => p.trim()).filter(Boolean);
  const out = { key: "", ctrl: false, meta: false, alt: false, shift: false };
  for (const p of parts) {
    if (p === "ctrl") out.ctrl = true;
    else if (p === "meta" || p === "cmd") out.meta = true;
    else if (p === "alt" || p === "option") out.alt = true;
    else if (p === "shift") out.shift = true;
    else if (p === "mod") {
      if (isMac) out.meta = true;
      else out.ctrl = true;
    } else {
      out.key = p;
    }
  }
  return out;
}

function matches(e: KeyboardEvent, combo: string): boolean {
  const c = parseCombo(combo);
  if (e.ctrlKey !== c.ctrl) return false;
  if (e.metaKey !== c.meta) return false;
  if (e.altKey !== c.alt) return false;
  if (e.shiftKey !== c.shift) return false;
  return e.key.toLowerCase() === c.key;
}

function isTypingTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (t.isContentEditable) return true;
  return false;
}

/**
 * Подписывается на keydown и вызывает `handler`, когда совпала одна из
 * комбинаций `combo`. Все колбэки держатся в ref — сам listener монтируется
 * один раз, поэтому не нужно мемоизировать handler снаружи.
 */
export function useHotkey(
  combo: Hotkey,
  handler: (event: KeyboardEvent) => void,
  options: UseHotkeyOptions = {},
): void {
  const {
    enabled = true,
    preventDefault,
    stopPropagation = false,
    ignoreWhenTyping = false,
    target,
  } = options;

  const handlerRef = useRef(handler);
  useLayoutEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;
    const combos = Array.isArray(combo) ? combo : [combo as string];

    const el: EventTarget = target ?? window;
    const onKey = (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ignoreWhenTyping && isTypingTarget(ke)) return;
      for (const c of combos) {
        if (matches(ke, c)) {
          const shouldPrevent = preventDefault ?? ke.key.toLowerCase() !== "escape";
          if (shouldPrevent) ke.preventDefault();
          if (stopPropagation) ke.stopPropagation();
          handlerRef.current(ke);
          return;
        }
      }
    };

    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [combo, enabled, preventDefault, stopPropagation, ignoreWhenTyping, target]);
}
