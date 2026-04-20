import type { WebProcess, WebStage } from "@/lib/ws-api-models";
import { STAGE_TYPE_COLORS } from "../lib/stage-colors";

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
