import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ProblemSeverity = "error" | "warning" | "info";

export interface Problem {
  /** Уникальный id проблемы в источнике. */
  id: string;
  severity: ProblemSeverity;
  /** Источник: `configurator.compile`, `viewer.move`, `system.permissions`, ... */
  source: string;
  /** Путь/идентификатор сущности (файл, процесс, модель). */
  resource?: string;
  /** Сообщение, первая строка — заголовок. */
  message: string;
  /** Позиция в файле, если применимо. */
  line?: number;
  column?: number;
  /** Опционально — таймстамп появления (для сортировки). */
  timestamp?: number;
  /** Клик — "перейти к проблеме". */
  onReveal?: () => void;
}

interface ProblemsContextValue {
  problems: Problem[];
  add: (p: Problem) => void;
  update: (id: string, patch: Partial<Problem>) => void;
  remove: (id: string) => void;
  clearSource: (source: string) => void;
  setSource: (source: string, problems: Problem[]) => void;
}

const Ctx = createContext<ProblemsContextValue | null>(null);

/**
 * Единый реестр problems — подписчики видят общий список. Источники
 * (compiler, runtime diagnostics, server validation) регистрируют проблемы
 * через `setSource(source, [...])` (замещает все проблемы от этого источника)
 * или `add/remove` по одной.
 *
 * UI (ProblemsPanel) читает `problems` и группирует по severity/resource.
 */
export function ProblemsProvider({ children }: { children: ReactNode }) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const indexRef = useRef<Map<string, Problem>>(new Map());

  const resyncFromIndex = () => {
    setProblems(Array.from(indexRef.current.values()));
  };

  const add = useCallback((p: Problem) => {
    indexRef.current.set(p.id, p);
    resyncFromIndex();
  }, []);

  const update = useCallback((id: string, patch: Partial<Problem>) => {
    const cur = indexRef.current.get(id);
    if (!cur) return;
    indexRef.current.set(id, { ...cur, ...patch });
    resyncFromIndex();
  }, []);

  const remove = useCallback((id: string) => {
    if (indexRef.current.delete(id)) resyncFromIndex();
  }, []);

  const clearSource = useCallback((source: string) => {
    let changed = false;
    for (const [k, v] of Array.from(indexRef.current.entries())) {
      if (v.source === source) {
        indexRef.current.delete(k);
        changed = true;
      }
    }
    if (changed) resyncFromIndex();
  }, []);

  const setSource = useCallback((source: string, next: Problem[]) => {
    for (const [k, v] of Array.from(indexRef.current.entries())) {
      if (v.source === source) indexRef.current.delete(k);
    }
    for (const p of next) indexRef.current.set(p.id, p);
    resyncFromIndex();
  }, []);

  const value = useMemo<ProblemsContextValue>(
    () => ({ problems, add, update, remove, clearSource, setSource }),
    [problems, add, update, remove, clearSource, setSource],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProblems(): ProblemsContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // noop-провайдер: позволяет компонентам использовать hook без обязательной
    // обёртки (например, в storybook). Никаких мутаций.
    return {
      problems: [],
      add: () => {},
      update: () => {},
      remove: () => {},
      clearSource: () => {},
      setSource: () => {},
    };
  }
  return ctx;
}
