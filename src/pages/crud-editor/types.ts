export interface CrudModel {
  Name: string;
  ServiceType: string;
  KeyName: string;
  Type: string;
  Handlers: string[];
  Properties: CrudProperty[];
  ConfigTable?: string | null;
  [extra: string]: unknown;
}

export interface CrudProperty {
  Name: string;
  Type: string;
  IsRequired: boolean;
  [extra: string]: unknown;
}

export type CrudRecord = Record<string, unknown>;

export interface ModelTab {
  id: string;
  model: CrudModel;
  records: CrudRecord[];
  loading: boolean;
  search: string;
  page: number;
  pageSize: number;
  sortCol: string | null;
  sortDir: "asc" | "desc";
}
