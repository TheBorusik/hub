/**
 * Кросс-секционная навигация в пределах одного контура:
 *   — навигация между разделами (Configurator/Viewer/...) с прокидыванием
 *     intent'а целевому разделу (например, "открой процесс X");
 *   — проверка «есть ли несохранённые изменения» перед сменой раздела
 *     через регистрируемые `DirtyGuard`-ы, с диалогом *Save & go /
 *     Continue anyway / Cancel*.
 *
 * Живёт внутри `ContourPanel` — один инстанс на контур. `Shell`
 * и `ActivityBar` обязаны ходить через `navigateTo`, иначе гард не
 * сработает.
 */

import {
  createContext, useCallback, useContext, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import type { SectionId } from "@/components/layout/ActivityBar";
import type { ViewerTab } from "@/pages/viewer/types";
import { UnsavedChangesDialog } from "@/components/layout/UnsavedChangesDialog";

export type NavigationIntent =
  | { kind: "openProcessInConfigurator"; processName: string }
  | { kind: "openProcessInViewer"; processId: number; name: string; tab?: ViewerTab };

export interface DirtyGuard {
  /** Есть ли несохранённые изменения прямо сейчас. */
  isDirty(): boolean;
  /**
   * Человеко-читаемый список dirty-элементов (названия вкладок, сущностей)
   * — показывается в диалоге. Опционален.
   */
  listDirty?(): string[];
  /**
   * Сохранить всё dirty. `true` — успешно, `false` — что-то не сохранилось
   * (например, компиляционные ошибки/API-фейл). В этом случае навигация
   * отменяется и диалог показывает сообщение о проблеме.
   */
  saveAll(): Promise<boolean>;
}

interface NavigationContextValue {
  currentSection: SectionId;
  visitedSections: ReadonlySet<SectionId>;
  /** Навигация с проверкой dirty guard текущей секции. */
  navigateTo: (section: SectionId, intent?: NavigationIntent) => void;
  /**
   * Забрать и очистить pending intent для указанной секции. Обычно
   * вызывается принимающей секцией в `useEffect`, когда она активируется.
   */
  consumeIntent: (section: SectionId) => NavigationIntent | null;
  /** Регистрация dirty-гарда от секции. Возвращает unregister-колбэк. */
  registerDirtyGuard: (section: SectionId, guard: DirtyGuard) => () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

interface NavigationProviderProps {
  initialSection: SectionId;
  /** Внешний наблюдатель — например, `Shell` хочет знать, какая секция активна. */
  onSectionChange?: (section: SectionId) => void;
  children: ReactNode;
}

export function NavigationProvider({ initialSection, onSectionChange, children }: NavigationProviderProps) {
  const [currentSection, setCurrentSection] = useState<SectionId>(initialSection);
  const [visitedSections, setVisitedSections] = useState<Set<SectionId>>(() => new Set([initialSection]));

  // Очереди intent'ов — через ref, чтобы не прыгать рендером при push/pop.
  const pendingIntentsRef = useRef<Map<SectionId, NavigationIntent>>(new Map());
  const dirtyGuardsRef = useRef<Map<SectionId, DirtyGuard>>(new Map());

  // Pending-навигация показывает `UnsavedChangesDialog`. `saving` — для
  // индикатора в кнопке «Save & go».
  const [pending, setPending] = useState<{
    target: SectionId;
    intent?: NavigationIntent;
    dirtyList: string[];
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /** Непосредственно совершить переход (без dirty-проверки). */
  const performNavigate = useCallback((section: SectionId, intent?: NavigationIntent) => {
    if (intent) {
      // Если уже есть отложенный intent для той же секции — перезаписываем
      // (последний клик выигрывает).
      pendingIntentsRef.current.set(section, intent);
    }
    setVisitedSections((prev) => {
      if (prev.has(section)) return prev;
      const next = new Set(prev);
      next.add(section);
      return next;
    });
    setCurrentSection(section);
    onSectionChange?.(section);
  }, [onSectionChange]);

  const navigateTo = useCallback((section: SectionId, intent?: NavigationIntent) => {
    // Переход в ту же секцию без intent — no-op. С intent — всё равно
    // отдаём получателю (полезно, если нужно открыть другой процесс
    // внутри того же раздела).
    if (section === currentSection && !intent) return;
    if (section === currentSection && intent) {
      pendingIntentsRef.current.set(section, intent);
      // Нужно «пнуть» consumer — проще всего через no-op setState.
      setCurrentSection((s) => s);
      return;
    }

    const guard = dirtyGuardsRef.current.get(currentSection);
    if (guard && guard.isDirty()) {
      setPending({
        target: section,
        intent,
        dirtyList: guard.listDirty?.() ?? [],
      });
      setSaveError(null);
      return;
    }
    performNavigate(section, intent);
  }, [currentSection, performNavigate]);

  const consumeIntent = useCallback((section: SectionId): NavigationIntent | null => {
    const intent = pendingIntentsRef.current.get(section);
    if (!intent) return null;
    pendingIntentsRef.current.delete(section);
    return intent;
  }, []);

  const registerDirtyGuard = useCallback((section: SectionId, guard: DirtyGuard) => {
    dirtyGuardsRef.current.set(section, guard);
    return () => {
      // Снимаем только если это всё ещё тот же самый guard (не перезатёрли
      // регистрацией из нового инстанса страницы).
      if (dirtyGuardsRef.current.get(section) === guard) {
        dirtyGuardsRef.current.delete(section);
      }
    };
  }, []);

  const handleDialogCancel = useCallback(() => {
    setPending(null);
    setSaveError(null);
  }, []);

  const handleDialogDiscard = useCallback(() => {
    if (!pending) return;
    // «Continue anyway» — dirty-состояние сохраняется как есть
    // (Shell теперь держит секцию в DOM через display:none).
    const { target, intent } = pending;
    setPending(null);
    setSaveError(null);
    performNavigate(target, intent);
  }, [pending, performNavigate]);

  const handleDialogSave = useCallback(async () => {
    if (!pending) return;
    const guard = dirtyGuardsRef.current.get(currentSection);
    if (!guard) {
      // Нестандартный случай (гард снят между открытием и нажатием) —
      // просто продолжаем.
      const { target, intent } = pending;
      setPending(null);
      performNavigate(target, intent);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const ok = await guard.saveAll();
      if (!ok) {
        setSaveError("Some changes couldn't be saved. Fix the errors or press Continue anyway.");
        return;
      }
      const { target, intent } = pending;
      setPending(null);
      performNavigate(target, intent);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [pending, currentSection, performNavigate]);

  const value = useMemo<NavigationContextValue>(() => ({
    currentSection,
    visitedSections,
    navigateTo,
    consumeIntent,
    registerDirtyGuard,
  }), [currentSection, visitedSections, navigateTo, consumeIntent, registerDirtyGuard]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
      {pending && (
        <UnsavedChangesDialog
          fromSection={currentSection}
          targetSection={pending.target}
          dirtyList={pending.dirtyList}
          saving={saving}
          error={saveError}
          onSaveAndGo={handleDialogSave}
          onDiscardAndGo={handleDialogDiscard}
          onCancel={handleDialogCancel}
        />
      )}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used inside <NavigationProvider>");
  return ctx;
}
