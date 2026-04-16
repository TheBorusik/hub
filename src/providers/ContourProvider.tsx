import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from "react";

export interface ContourConfig {
  id: string;
  name: string;
  wsUrl: string;
  description?: string;
  isSystem?: boolean;
}

interface ContourState {
  contours: ContourConfig[];
  activeContourId: string;
}

interface ContourContextValue extends ContourState {
  addContour: (config: Omit<ContourConfig, "id">) => string;
  removeContour: (id: string) => void;
  setActiveContour: (id: string) => void;
  getActiveContour: () => ContourConfig | undefined;
}

const SYSTEM_CONTOUR: ContourConfig = {
  id: "system",
  name: "System",
  wsUrl: "",
  description: "Management Contour",
  isSystem: true,
};

const STORAGE_KEY = "hub_contours";
const SYSTEM_URL_KEY = "hub_system_url";

function loadContoursFromStorage(): ContourConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ContourConfig[];
  } catch { /* ignore */ }
  return [];
}

function saveContoursToStorage(contours: ContourConfig[]) {
  const projectContours = contours.filter((c) => !c.isSystem);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projectContours));
}

export function loadSystemUrl(): string {
  return localStorage.getItem(SYSTEM_URL_KEY) ?? "";
}

export function saveSystemUrl(url: string) {
  localStorage.setItem(SYSTEM_URL_KEY, url);
}

const ContourContext = createContext<ContourContextValue | null>(null);

export function ContourProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ContourState>(() => {
    const systemUrl = loadSystemUrl();
    const system: ContourConfig = { ...SYSTEM_CONTOUR, wsUrl: systemUrl };
    const saved = loadContoursFromStorage();
    return {
      contours: [system, ...saved],
      activeContourId: "system",
    };
  });

  const addContour = useCallback(
    (config: Omit<ContourConfig, "id">): string => {
      const id = crypto.randomUUID();
      setState((prev) => {
        const next = [...prev.contours, { ...config, id }];
        saveContoursToStorage(next);
        return { contours: next, activeContourId: id };
      });
      return id;
    },
    [],
  );

  const removeContour = useCallback((id: string) => {
    setState((prev) => {
      if (prev.contours.find((c) => c.id === id)?.isSystem) return prev;
      const next = prev.contours.filter((c) => c.id !== id);
      saveContoursToStorage(next);
      const activeId =
        prev.activeContourId === id ? "system" : prev.activeContourId;
      return { contours: next, activeContourId: activeId };
    });
  }, []);

  const setActiveContour = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeContourId: id }));
  }, []);

  const getActiveContour = useCallback(
    () => state.contours.find((c) => c.id === state.activeContourId),
    [state],
  );

  return (
    <ContourContext.Provider
      value={{
        ...state,
        addContour,
        removeContour,
        setActiveContour,
        getActiveContour,
      }}
    >
      {children}
    </ContourContext.Provider>
  );
}

export function useContours() {
  const ctx = useContext(ContourContext);
  if (!ctx) throw new Error("useContours must be used within ContourProvider");
  return ctx;
}
