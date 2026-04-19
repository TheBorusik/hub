import { useEffect, useSyncExternalStore } from "react";
import { commandRegistry } from "./registry";
import type { Command } from "./types";

/**
 * Регистрирует команду на время жизни компонента. `deps` — чтобы объявление
 * могло захватывать актуальные значения из замыкания (например, активный tab).
 */
export function useCommand(command: Command, deps: readonly unknown[] = []): void {
  useEffect(() => {
    const dispose = commandRegistry.register(command);
    return dispose;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Подписка на список зарегистрированных команд (для CommandPalette). */
export function useCommandList(): Command[] {
  return useSyncExternalStore(
    (cb) => commandRegistry.subscribe(cb),
    () => commandRegistry.list(),
    () => commandRegistry.list(),
  );
}
