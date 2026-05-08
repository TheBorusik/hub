export interface CrudModel {
  Name: string;
  ServiceType: string;
  KeyName: string;
  KeyType: string;
  Type: string;
  Identity: boolean;
  Table?: string | null;
  Handlers: string[];
  Properties: CrudProperty[];
  ConfigTable?: string | null;
  [extra: string]: unknown;
}

export interface CrudProperty {
  Name: string;
  Type: string;
  IsRequired: boolean;
  Pattern?: string | null;
  PatternErrorMessage?: string | null;
  Min?: number | null;
  MinErrorMessage?: string | null;
  Max?: number | null;
  MaxErrorMessage?: string | null;
  MaxLength?: number | null;
  MaxLengthErrorMessage?: string | null;
  MinLength?: number | null;
  MinLengthErrorMessage?: string | null;
  Enums?: unknown[] | null;
  EnumsErrorMessage?: string | null;
  Properties?: CrudProperty[] | null;
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
  totalCount: number;
  sortCol: string | null;
  sortDir: "asc" | "desc";
}
