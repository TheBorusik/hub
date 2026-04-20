import { type ReactNode, useEffect, useState, createContext, useContext, useRef } from "react";
import { loader, type Monaco } from "@monaco-editor/react";
import type * as MonacoNs from "monaco-editor";

export interface MonacoProviderValue {
  monaco: Monaco | null;
  /** Готов ли глобальный AMD-loader. Компоненты могут отложить монтирование до ready. */
  ready: boolean;
}

const Ctx = createContext<MonacoProviderValue | null>(null);

const FALLBACK_EDITOR_BG = "#1e1e1e";

function readEditorBg(): string {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-editor")
    .trim();
  return v || FALLBACK_EDITOR_BG;
}

/**
 * Единая тёмная тема для Monaco в Hub (не C#/не WFM). C#-редакторы используют
 * `wfm-dark` (см. ниже) — обе темы регистрируются здесь, чтобы исключить
 * дубли (см. `eslint-rules/no-monaco-theme-define`).
 */
function defineHubDarkTheme(monaco: Monaco, registered: { current: boolean }): void {
  if (registered.current) return;
  const theme: MonacoNs.editor.IStandaloneThemeData = {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": readEditorBg(),
    },
  };
  monaco.editor.defineTheme("hub-dark", theme);
  registered.current = true;
}

/* ---------------------------------------------------------------- WFM theme */

const wfmThemeRegistry = { current: false };

/**
 * WFM C#-тема. Правила (token rules) предоставляются доменным модулем
 * `pages/configurator/monaco/wfm-csharp.ts`, но регистрация
 * `monaco.editor.defineTheme("wfm-dark", ...)` живёт здесь — единый
 * theme-bootstrap. Дубль-вызовы безопасны: внутренний guard.
 */
export function ensureWfmDarkTheme(
  monaco: Monaco,
  rules: MonacoNs.editor.ITokenThemeRule[],
): void {
  if (wfmThemeRegistry.current) return;
  monaco.editor.defineTheme("wfm-dark", {
    base: "vs-dark",
    inherit: true,
    rules,
    colors: {
      "editor.background": readEditorBg(),
    },
  });
  wfmThemeRegistry.current = true;
}

/**
 * Lazy provider для Monaco: подгружает монако один раз за жизнь приложения
 * и регистрирует общий `hub-dark`. Использовать НЕ обязательно — `<CodeEditor>`
 * подтянет Monaco самостоятельно, — но если приложение уже знает, что
 * редактор понадобится, можно смонтировать провайдер в корне, чтобы скрыть
 * задержку первой загрузки.
 */
export function MonacoProvider({ children }: { children: ReactNode }) {
  const [monaco, setMonaco] = useState<Monaco | null>(null);
  const themeRegistered = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loader.init().then((m) => {
      if (cancelled) return;
      setMonaco(m);
      defineHubDarkTheme(m, themeRegistered);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Ctx.Provider value={{ monaco, ready: monaco !== null }}>
      {children}
    </Ctx.Provider>
  );
}

export function useMonaco(): MonacoProviderValue {
  const ctx = useContext(Ctx);
  return ctx ?? { monaco: null, ready: false };
}

/** Регистрация hub-dark в любом контексте (CodeEditor вызывает сам, если нужно). */
export function ensureHubDarkTheme(monaco: Monaco, registered: { current: boolean }): void {
  defineHubDarkTheme(monaco, registered);
}
