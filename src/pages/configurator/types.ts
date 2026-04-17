import type { WebProcess } from "@/lib/ws-api-models";

export interface OpenTab {
  typeName: string;
  name: string;
  process: WebProcess | null;
  originalJson: string;
  loading: boolean;
  dirty: boolean;
}

export type EditorMode = "editor" | "diagram" | "code" | "diff";
