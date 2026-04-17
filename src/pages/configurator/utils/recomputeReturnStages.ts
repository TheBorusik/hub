import type { WebProcess, WebStage } from "@/lib/ws-api-models";

const STAGE_TYPE_COLORS: Record<string, string> = {
  Start: "#5CADD5",
  Final: "#F6511D",
  CRUD: "seagreen",
  CRUDDefinition: "seagreen",
  Command: "#0FD334",
  CommandDefinition: "#0FD334",
  Transform: "#0F8B8D",
  TransformDefinition: "#0F8B8D",
  Event: "#FCA6ED",
  EventDefinition: "#FCA6ED",
  SubStart: "#0089ED",
  SubDefinition: "#0089ED",
  EndDefinition: "#F6511D",
};

interface ReturnStageEntry {
  Name: string;
  State: "SUCCESS" | "FAILED";
}

const RETURN_RE = /return\s*(?<returnStage>[^;]+);/gm;

function parseReturns(code: string | undefined, stageNames: Set<string>, state: "SUCCESS" | "FAILED"): ReturnStageEntry[] {
  if (!code) return [];
  const results: ReturnStageEntry[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(RETURN_RE.source, RETURN_RE.flags);
  while ((m = re.exec(code)) !== null) {
    const name = m.groups?.returnStage?.trim();
    if (name && stageNames.has(name)) {
      results.push({ Name: name, State: state });
    }
  }
  return results;
}

export function recomputeReturnStages(process: WebProcess): WebProcess {
  const stages = process.Stages ?? {};
  const stageNameSet = new Set(Object.keys(stages));
  const oldWebStages = process.WebData?.Stages ?? {};
  const newWebStages: Record<string, WebStage> = {};

  for (const stageName of Object.keys(stages)) {
    const stage = stages[stageName];
    const webStage: WebStage = {
      ...(oldWebStages[stageName] ?? { Position: { x: 0, y: 0 }, Lines: {} }),
    };

    let color = STAGE_TYPE_COLORS[stage.Type] ?? "#888";
    if (process.Startup === stageName) {
      color = "#5CADD5";
    }
    webStage.Color = color;

    const returnStages = [
      ...parseReturns(stage.GetNextStage, stageNameSet, "SUCCESS"),
      ...parseReturns(stage.GetErrorNextStage, stageNameSet, "FAILED"),
    ];

    const newLines: Record<string, { LineIn: string; LineOut: string; Dash?: boolean }> = {};
    for (const rs of returnStages) {
      const existing = webStage.Lines?.[rs.Name];
      newLines[rs.Name] = {
        LineIn: existing?.LineIn ?? "top",
        LineOut: existing?.LineOut ?? "auto",
        Dash: rs.State === "FAILED",
      };
    }
    webStage.Lines = newLines;

    stage.ReturnStages = [...new Set(returnStages.map((r) => r.Name))];
    newWebStages[stageName] = webStage;
  }

  return {
    ...process,
    Stages: { ...stages },
    WebData: process.WebData
      ? { ...process.WebData, Stages: newWebStages }
      : { Stages: newWebStages },
  };
}
