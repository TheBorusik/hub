// --- Navigation ---

export type SystemView =
  | "status"
  | "configuration"
  | "base-sections"
  | "table-data"
  | "errors-wfm"
  | "errors-command"
  | "errors-event"
  | "errors-result"
  | "errors-other"
  | "permissions"
  | "roles";

export type ErrorType = "wfm" | "command" | "event" | "result" | "other";

export function viewToErrorType(view: SystemView): ErrorType | null {
  const map: Partial<Record<SystemView, ErrorType>> = {
    "errors-wfm": "wfm",
    "errors-command": "command",
    "errors-event": "event",
    "errors-result": "result",
    "errors-other": "other",
  };
  return map[view] ?? null;
}

// --- Adapters: Health ---

export interface AdapterHealth {
  Name: string;
  Type: string;
  AdapterVersion: string;
  SalVersion: string;
  State: "Up" | "Down" | "Unknown" | "NotResponding";
  Contour: string;
  StartTime?: string;
  LastStateUpdateTime: string;
  DownTime?: string;
}

// --- Adapters: Configuration ---

export interface AdapterType {
  AdapterType: string;
  MaxInstances: number;
  Exported: boolean;
  Configurations?: AdapterConfiguration[];
}

export interface AdapterConfiguration {
  AdapterType: string;
  ConfigurationId: number;
  Name: string;
  Description: string;
  Enabled: boolean;
  Exported: boolean;
  IsDefault: boolean;
}

// --- Adapters: Sections ---

export interface ConfigSection {
  SectionId: number;
  ConfigurationId?: number;
  Name: string;
  DisplayName?: string;
  Inherited: boolean;
  Locked?: boolean;
  BuildTable: boolean;
  BuildRules: boolean;
  JsonData?: string;
}

// --- Adapters: Tables ---

export interface TableInfo {
  Name: string;
  DisplayName?: string;
}

export interface FieldInfo {
  FieldName: string;
  ColumnName: string;
  FieldType: string;
  TableFieldOrder: number;
  FilterName: string;
  IsPrimaryKey: boolean;
}

export interface TableMeta {
  FieldInfos: FieldInfo[];
}

// --- Errors ---

export interface ErrorOperation {
  CorrelationId: string;
  Contour: string;
  AdapterType: string;
  AdapterName: string;
  TimeStamp: string;
  RoutingKey: string;
  ExchangeType: string;
  Exception: string;
  Payload: string;
  Headers: string;
  ErrorType: string;
  WfmProcessId?: string;
  TransactionId?: string;
}

// --- Permissions ---

export interface PermissionTreeNode {
  Type: "catalog" | "permission";
  PermissionId?: number;
  CatalogId?: number;
  ParentId?: number;
  Name: string;
  Description: string;
  StrId?: string;
  PermissionSettings?: PermissionSettings;
  PermissionTree?: PermissionTreeNode[];
}

export interface PermissionSettings {
  Type: "Unknown" | "Api" | "UI" | "Event";
  ConfirmationRequired: boolean;
  ApiPath?: string[];
}

export interface Permission {
  PermissionId: number;
  Name: string;
  Description: string;
  StrId?: string;
  CatalogId?: number;
  PermissionSettings?: PermissionSettings;
}

// --- Roles ---

export interface Role {
  RoleId: number;
  Name: string;
  Description: string;
  SessionSettings: SessionSettings;
  SessionData?: unknown;
  Permissions?: RolePermission[];
}

export interface SessionSettings {
  SessionTTL?: string;
  AutoProlongation: boolean;
  ManualProlongation: boolean;
  EncryptionRequired: boolean;
  ReAuthEnable: boolean;
}

export interface RolePermission {
  PermissionId: number;
  Name: string;
  Description: string;
  Action: "Allow" | "Deny" | "Unknown";
  StrId?: string;
}
