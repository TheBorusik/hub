export interface TreeNode {
  key: string;
  type: string;
  label: string;
  expanded: boolean;
  nodes?: TreeNode[];
  data?: CommandData;
  json?: string;
  currentJson?: string;
  [extra: string]: unknown;
}

export interface CommandData {
  Level: string;
  AdapterName: string;
  AdapterType: string;
  CommandName: string;
}

export interface SelectedCommand {
  key: string;
  label: string;
  data: CommandData;
  json: string;
  currentJson?: string;
}

export interface TestCaseModel {
  Name: string;
  Description?: string;
  Case: unknown;
  CommandName?: string;
}

export interface SessionField {
  name: string;
  value: string;
  type: "A" | "N" | "S";
}

export type SessionFields = Record<string, SessionField>;
