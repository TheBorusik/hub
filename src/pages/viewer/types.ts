export type ViewerTab = "completed" | "manual" | "idle";

export interface ViewProcess {
  ProcessId: number;
  Name: string;
  Version: number;
  Status: string;
  StatusTimeStamp: string;
  Priority: number;
  Worker: string;
  Cause: string;
  TimeStamp: string;
  ResultCode: string;
  RegisterTimestamp: string;
  EndTimestamp: string;
  Type: string;
  Elapsed: number;
}

export interface StageData {
  Index: number;
  StageIndex: number;
  ProcessName: string;
  ProcessVersion: string;
  Name: string;
  DisplayName: string;
  Type: string;
  Elapsed: string;
  ContextDiff: unknown;
  SessionDiff: unknown;
  ManualControlCause: unknown;
  ResultIndex?: number;
  Sub?: unknown;
  Result?: unknown;
  Command?: unknown;
  Event?: unknown;
  Children?: StageData[];
}

export interface StageNode {
  Data: StageData;
  Children: StageNode[];
}

export interface ProcessDetail {
  ProcessId: number;
  Name: string;
  Version: string;
  Priority: number;
  Stages: StageNode[];
  HasStages: boolean;
  LastStageIndex: number;
  Status: string;
  StatusTimestamp: string;
  RegisterTimestamp: string;
  EndTimestamp: string;
  ManualControlCause: unknown;
  WfmElapsed: string;
  Context: unknown;
  Session: unknown;
  InitObject: unknown;
  InitSession: unknown;
  TimeStamp?: string;
}

export type StageSubject =
  | "Context"
  | "ContextDiff"
  | "Session"
  | "SessionDiff"
  | "Result"
  | "Command"
  | "InitObject"
  | "ManualControlCause"
  | "Event";

export interface ProcessTab {
  id: string;
  processId: number;
  name: string;
  tab: ViewerTab;
  detail: ProcessDetail | null;
  children: ProcessDetail[];
  loading: boolean;
}

export const STAGE_COLORS: Record<string, string> = {
  StartProcess: "#5CADD5",
  CRUD: "seagreen",
  Command: "#0FD334",
  Transform: "#0F8B8D",
  Event: "#FCA6ED",
  SubStart: "#0089ED",
  Final: "#F6511D",
  Obsolete: "#9C27B0",
};

export interface StageContextButton {
  label: string;
  subject: string;
  stageIndex: number;
  danger?: boolean;
}

export function getStageContextButtons(stage: StageData): StageContextButton[] {
  const si = stage.StageIndex;
  const ri = stage.ResultIndex;
  const buttons: StageContextButton[] = [
    { label: "Context", subject: "Context", stageIndex: si },
    { label: "Session", subject: "Session", stageIndex: si },
  ];

  switch (stage.Type) {
    case "StartProcess":
      buttons.push({ label: "ContextDiff", subject: "ContextDiff", stageIndex: si });
      buttons.push({ label: "SessionDiff", subject: "SessionDiff", stageIndex: si });
      break;
    case "Transform":
      buttons.push({ label: "ContextDiff", subject: "ContextDiff", stageIndex: si });
      buttons.push({ label: "SessionDiff", subject: "SessionDiff", stageIndex: si });
      break;
    case "Event":
      buttons.push({ label: "ContextDiff", subject: "ContextDiff", stageIndex: si });
      buttons.push({ label: "SessionDiff", subject: "SessionDiff", stageIndex: si });
      buttons.push({ label: "Event", subject: "Event", stageIndex: si });
      break;
    case "CRUD":
    case "SubStart":
      buttons.push({ label: "ContextBeforeDiff", subject: "ContextDiff", stageIndex: si });
      if (ri) buttons.push({ label: "ContextAfterDiff", subject: "ContextDiff", stageIndex: ri });
      buttons.push({ label: "SessionBeforeDiff", subject: "SessionDiff", stageIndex: si });
      if (ri) buttons.push({ label: "SessionAfterDiff", subject: "SessionDiff", stageIndex: ri });
      if (stage.Type === "SubStart") {
        buttons.push({ label: "InitObject", subject: "InitObject", stageIndex: si });
      }
      if (ri) buttons.push({ label: "Result", subject: "Result", stageIndex: ri });
      break;
    case "Command":
      buttons.push({ label: "ContextBeforeDiff", subject: "ContextDiff", stageIndex: si });
      if (ri) buttons.push({ label: "ContextAfterDiff", subject: "ContextDiff", stageIndex: ri });
      buttons.push({ label: "SessionBeforeDiff", subject: "SessionDiff", stageIndex: si });
      if (ri) buttons.push({ label: "SessionAfterDiff", subject: "SessionDiff", stageIndex: ri });
      buttons.push({ label: "Command", subject: "Command", stageIndex: si });
      if (ri) buttons.push({ label: "Result", subject: "Result", stageIndex: ri });
      break;
    case "Final":
      buttons.push({ label: "ContextDiff", subject: "ContextDiff", stageIndex: si });
      buttons.push({ label: "SessionDiff", subject: "SessionDiff", stageIndex: si });
      buttons.push({ label: "Result", subject: "Result", stageIndex: si });
      break;
  }

  if (stage.ManualControlCause != null) {
    buttons.push({ label: "Manual Control Cause", subject: "ManualControlCause", stageIndex: si, danger: true });
  }

  return buttons;
}
