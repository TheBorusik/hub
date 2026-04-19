import { useEffect } from "react";

/**
 * Запоминает элемент, имевший фокус на момент монтирования, и возвращает
 * фокус на него при размонтировании (или при выключении `enabled`).
 *
 * Обычный паттерн для модалок/палитры: пользователь кликнул кнопку → открылась
 * модалка → закрылась → фокус возвращается на ту же кнопку, чтобы клавиатурная
 * навигация продолжалась с того же места.
 */
export function useReturnFocus(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    return () => {
      if (!previouslyFocused) return;
      if (typeof previouslyFocused.focus !== "function") return;
      if (!document.contains(previouslyFocused)) return;
      try {
        previouslyFocused.focus({ preventScroll: true });
      } catch {
        /* noop */
      }
    };
  }, [enabled]);
}
