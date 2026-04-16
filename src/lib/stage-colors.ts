export type StageType =
  | "Start"
  | "CRUD"
  | "Command"
  | "Transform"
  | "Event"
  | "SubStart"
  | "Final"
  | "Unknown";

export const stageColors: Record<StageType, string> = {
  Start: "#5CADD5",
  CRUD: "seagreen",
  Command: "#0FD334",
  Transform: "#0F8B8D",
  Event: "#FCA6ED",
  SubStart: "#0089ED",
  Final: "#F6511D",
  Unknown: "#50514F",
};

export function getStageColor(type: string): string {
  return stageColors[type as StageType] ?? stageColors.Unknown;
}
