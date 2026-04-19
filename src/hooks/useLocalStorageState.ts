import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

export interface LocalStorageStateOptions<T> {
  /**
   * Версия схемы. Если в хранилище лежит объект без совпадающей версии — он
   * считается "чужим" и прогоняется через migrate (или отбрасывается).
   */
  version?: number;
  /**
   * Функция миграции старого значения. Возвращает либо нормализованное T,
   * либо undefined — если старое значение несовместимо и его нужно выбросить.
   */
  migrate?: (raw: unknown, oldVersion: number | undefined) => T | undefined;
  /** Кастомный сериализатор. default: JSON */
  serialize?: (value: T) => string;
  /** Кастомный десериализатор. default: JSON */
  deserialize?: (raw: string) => unknown;
}

interface Envelope<T> {
  v: number;
  value: T;
}

function isEnvelope(x: unknown): x is Envelope<unknown> {
  return !!x && typeof x === "object" && "v" in (x as object) && "value" in (x as object);
}

/**
 * `useState`, синхронизированный с localStorage. Поддерживает версионирование
 * и миграции — полезно, когда формат "пресетов" меняется (как в
 * ProcessFiltersPanel).
 *
 * Ошибки чтения/записи (privacy mode, quota) проглатываются — UI не должен
 * падать из-за недоступного localStorage.
 */
export function useLocalStorageState<T>(
  key: string,
  initial: T | (() => T),
  options: LocalStorageStateOptions<T> = {},
): [T, Dispatch<SetStateAction<T>>] {
  const {
    version = 1,
    migrate,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options;

  const readInitial = (): T => {
    if (typeof window === "undefined") {
      return typeof initial === "function" ? (initial as () => T)() : initial;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) {
        return typeof initial === "function" ? (initial as () => T)() : initial;
      }
      const parsed = deserialize(raw);
      if (isEnvelope(parsed) && parsed.v === version) {
        return parsed.value as T;
      }
      if (migrate) {
        const oldVersion = isEnvelope(parsed) ? parsed.v : undefined;
        const rawValue = isEnvelope(parsed) ? parsed.value : parsed;
        const migrated = migrate(rawValue, oldVersion);
        if (migrated !== undefined) return migrated;
      }
      return typeof initial === "function" ? (initial as () => T)() : initial;
    } catch {
      return typeof initial === "function" ? (initial as () => T)() : initial;
    }
  };

  const [state, setState] = useState<T>(readInitial);

  const latest = useRef(state);
  latest.current = state;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const envelope: Envelope<T> = { v: version, value: state };
      window.localStorage.setItem(key, serialize(envelope as unknown as T));
    } catch {
      /* out of quota / privacy — молча игнорируем */
    }
  }, [key, state, version, serialize]);

  const set: Dispatch<SetStateAction<T>> = useCallback((update) => {
    setState((prev) =>
      typeof update === "function" ? (update as (p: T) => T)(prev) : update,
    );
  }, []);

  return [state, set];
}
