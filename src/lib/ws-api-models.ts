export enum WfmCommand {
  // Configurator
  GetModels = "WFM.ProcessAssembly.GetModels",
  GetChangedModels = "WFM.ProcessAssembly.GetChangedModels",
  GetProcessAssembly = "WFM.ProcessAssembly.Get",
  GetProcessAssemblySource = "WFM.ProcessAssembly.GetSource",
  LoadProcessAssembly = "WFM.ProcessAssembly.Load",
  Upsert = "WFM.ProcessAssembly.Upsert",
  Create = "WFM.ProcessAssembly.Create",
  Validate = "WFM.ProcessAssembly.Validate",
  ValidateCode = "WFM.ProcessAssembly.ValidateCode",
  FormatCode = "WFM.ProcessAssembly.FormatCode",
  GetCode = "WFM.ProcessAssembly.GetCode",
  Commit = "WFM.ProcessAssembly.Commit",
  RemoveDraft = "WFM.ProcessAssembly.RemoveDraft",

  // Process tree (server-built)
  GetProcessTree = "System.WFM.Process.GetTree",

  // Branch management
  GetBranches = "WFM.ProcessAssembly.GetBranches",
  LoadBranch = "WFM.ProcessAssembly.LoadBranch",
  RefreshBranch = "WFM.ProcessAssembly.RefreshBranch",
  UnloadBranch = "WFM.ProcessAssembly.UnloadBranch",

  // Global models
  GetGlobalModels = "WFM.ProcessAssembly.GetGlobalModels",
  AddGlobalModel = "WFM.ProcessAssembly.AddGlobalModel",
  ValidateGlobalModel = "WFM.ProcessAssembly.ValidateGlobalModel",

  // Pack
  Pack = "WFM.ProcessAssembly.Pack",
  Unpack = "WFM.ProcessAssembly.Unpack",

  // Execute
  Execute = "WFM.Execute",

  // Viewer — process lists
  GetManualProcesses = "WFM.GetManualProcesses2",
  GetIdleProcesses = "WFM.GetIdleProcesses2",
  GetCompletedProcesses = "WFM.GetCompletedProcesses2",
  GetManualProcessDetail = "WFM.GetManualProcessDetail2",
  GetIdleProcessDetail = "WFM.GetIdleProcessDetail2",
  GetCompletedProcessDetail = "WFM.GetCompletedProcessDetail2",
  GetManualChildsProcessDetail = "WFM.GetManualChildsProcessDetail",
  GetIdleChildsProcessDetail = "WFM.GetIdleChildsProcessDetail2",
  GetCompletedChildsProcessDetail = "WFM.GetCompletedChildsProcessDetail",
  GetStageContext = "WFM.GetStageContext",
  MoveToCompleted = "WFM.Process.MoveToCompleted2",
  MoveFromCompleted = "WFM.Process.MoveFromCompleted",
  DeleteProcesses = "WFM.Process.Delete",
  RestartProcess = "WFM.RestartProcess2",
  RestartProcessWithNewData = "WFM.RestartProcessWithNewData",

  // Command tester
  GetAdaptersInfo = "AdapterInfo.GetAdaptersInfoWeb",
  SendCommand = "AdapterInfo.SendCommand",
  GetCommandTestCases = "Observer.GetCommandTestCases",
  AddCommandTestCase = "Observer.AddCommandTestCase",
  RemoveCommandTestCase = "Observer.RemoveCommandTestCase",

  // CRUD
  GenericCrudAction = "GenericCRUD.Action",
  UpdateConfigTable = "GenericCRUD.UpdateConfigTable",

  // System - Adapters Health
  ObserverAdaptersHealthGet = "Observer.GetAdaptersHealth",
  ObserverAdapterHealthDelete = "Observer.DeleteAdapterHealth",

  // System - Adapter Configuration
  ConfigAdapterTypesGet = "Config.AdapterTypes.Get",
  ConfigAdapterTypeUpsert = "Config.AdapterType.Upsert",
  ConfigAdapterTypeDelete = "Config.AdapterType.Delete",
  ConfigAdapterConfigurationGet = "Config.AdapterConfiguration.Get",
  ConfigAdapterConfigurationCreate = "Config.AdapterConfiguration.Create",
  ConfigAdapterConfigurationCreateBaseBack = "Config.AdapterConfiguration.CreateBaseBack",
  ConfigAdapterConfigurationCreateBaseFront = "Config.AdapterConfiguration.CreateBaseFront",
  ConfigAdapterConfigurationClone = "Config.AdapterConfiguration.Clone",
  ConfigAdapterConfigurationCloneInherited = "Config.AdapterConfiguration.CloneInherited",
  ConfigAdapterConfigurationUpdate = "Config.AdapterConfiguration.Update",
  ConfigAdapterConfigurationSetDefault = "Config.AdapterConfiguration.SetDefault",
  ConfigAdapterConfigurationDelete = "Config.AdapterConfiguration.Delete",

  // System - Sections
  ConfigSectionGet = "Config.Section.Get",
  ConfigSectionBaseGet = "Config.Section.GetBase",
  ConfigSectionCreate = "Config.Section.Create",
  ConfigSectionUpdate = "Config.Section.Update",
  ConfigSectionDelete = "Config.Section.Delete",
  ConfigCompletedSectionDataGet = "Config.GetCompletedSectionData",
  ConfigConfigurationGet = "Config.GetConfiguration",
  ConfigExport = "Config.Export",
  ConfigImport = "Config.Import",

  // System - Tables
  ConfigTableGetAll = "Config.Table.GetAllTables",
  ConfigTableGetMeta = "Config.Table.GetMeta",
  ConfigTableGet = "Config.Table.Get",
  ConfigTableUpsert = "Config.Table.Upsert",
  ConfigTableDelete = "Config.Table.Delete",

  // System - Errors
  ObserverCommandErrorsGet = "Observer.GetCommandErrors",
  ObserverCommandResultErrorsGet = "Observer.GetCommandResultErrors",
  ObserverEventErrorsGet = "Observer.GetEventErrors",
  ObserverWfmErrorsGet = "Observer.GetWfmErrors",
  ObserverOtherErrorsGet = "Observer.GetOtherErrors",
  ObserverResend = "Observer.Resend",
  ObserverResendWithNewData = "Observer.ResendWithNewData",
  ObserverSendCommandResult = "Observer.SendCommandResult",
  ObserverDeleteNotHandled = "Observer.DeleteNotHandled",

  // System - Permissions
  AuthGetPermissionId = "Auth.GetPermissionId",
  AuthGetPermissionTree = "Auth.GetPermissionTree",
  AuthGetPermissions = "Auth.GetPermissions",
  AuthUpsertPermissionCatalog = "Auth.UpsertPermissionCatalog",
  AuthRemovePermissionCatalog = "Auth.RemovePermissionCatalog",
  AuthUpsertPermission = "Auth.UpsertPermission",
  AuthRemovePermission = "Auth.RemovePermission",

  // System - Roles
  AuthGetRoles = "Auth.GetRoles",
  AuthGetRolePermissions = "Auth.GetRolePermissions",
  AuthUpsertRole = "Auth.UpsertRole",
  AuthRemoveRole = "Auth.RemoveRole",
  AuthAssignPermissionsToRole = "Auth.AssignPermissionsToRole",
  AuthDenyPermissionsForRole = "Auth.DenyPermissionsForRole",
  AuthRemovePermissionsFromRole = "Auth.RemovePermissionsFromRole",

  // System - Scheduler
  SchedulerInformationGet = "System.SchedulerInformationGet",
  SchedulerJobAdd = "System.SchedulerJobAdd",

  // System - History
  GetHistoryReferences = "System.GetHistoryReferences",
  GetHistoryData = "System.GetHistoryData",

  // API
  ApiUpsert = "System.WFM.API.Upsert",
  GetApiRelatedData = "System.WFM.API.GetRelatedData",
}

// --- API editor (WFM API permission per process) ---

/**
 * Handler-тип API-вызова. Соответствует HandlerType в payload
 * `System.WFM.API.Upsert` на сервере.
 */
export type ApiHandlerType = "Sync" | "Async" | "Execute";

export interface ApiRoleInfo {
  RoleId: number;
  Name: string;
  Description?: string;
}

/**
 * Ответ `System.WFM.GetApiRelatedData`:
 *  - `Roles` — все доступные роли (для мульти-селекта);
 *  - `PermissionRoles` — роли, уже назначенные этому API;
 *  - `CommandDTO` / `ResultDTO` — текущие DTO (произвольная форма JSON).
 *
 * Дополнительные поля сервер может возвращать или нет — все опциональны,
 * чтобы клиент не падал на менее богатых ответах.
 */
export interface ApiRelatedData {
  Roles: ApiRoleInfo[];
  PermissionRoles: ApiRoleInfo[];
  CommandDTO: unknown;
  ResultDTO: unknown;
  HandlerType?: ApiHandlerType;
  SaveManual?: boolean;
  SaveCompleted?: boolean;
  Description?: string;
}

/** Payload команды `System.WFM.API.Upsert`. */
export interface ApiUpsertPayload {
  MethodName: string;
  Description: string;
  HandlerType: ApiHandlerType;
  SaveManual: boolean;
  SaveCompleted: boolean;
  /** Имена (не RoleId) — серверу нужны именно имена. */
  Roles: string[];
  CommandDTO: unknown;
  ResultDTO: unknown;
}

/** Типы процесса из old-admin `ProcessTypes` enum. */
export enum ProcessType {
  Api = "api",
  Lk = "lk",
  Admin = "admin",
  Other = "other",
}

export interface CRUDModelInfo {
  Model: string;
  Action: string;
  CommandName: string;
}

export interface AdapterCommandInfo {
  Name: string;
  Json?: string;
  Dto?: string;
  ResultDto?: string;
}

export interface AdapterEventInfo {
  Name: string;
}

export interface AdaptersInfoResponse {
  Adapters: AdapterTreeNode[];
  CRUDModels?: CRUDModelInfo[];
}

export interface AdapterTreeNode {
  key: string;
  type: string;
  label: string;
  expanded: boolean;
  nodes?: AdapterTreeNode[];
  data?: {
    Level: string;
    AdapterName: string;
    AdapterType: string;
    CommandName: string;
  };
  json?: string;
  [extra: string]: unknown;
}

export interface SendCommandRequest {
  AdapterName: string;
  CommandName: string;
  CommandBody: string;
  Ttl?: string;
  Priority?: string;
  SessionId?: string;
  AuthId?: string;
}

export interface TestCase {
  Name: string;
  Description: string;
  Case: string;
  CommandName: string;
}

export interface TestCasesResponse {
  TestCases: TestCase[];
}

export interface ProcessModel {
  TypeName: string;
  Category: string;
  Origin: string;
  Branch: string;
  Name: string;
  Action: string;
  Front?: boolean;
  Back?: boolean;
  Permission?: boolean;
  Source?: boolean;
  Draft?: boolean;
  SourceCs?: string;
  ContentSha256?: string;
}

export interface GetModelsResponse {
  Models: ProcessModel[];
}

export interface Catalog {
  Name: string;
  Contents: ProcessModel[];
  Catalogs: Catalog[];
}

export interface GetProcessTreeResponse {
  Branch: string;
  Catalogs: Catalog[];
  ProcessModels: ProcessModel[];
  ActionColors: Record<string, string>;
}

export interface BranchInfo {
  Name: string;
  IsLoaded: boolean;
}

export interface GetBranchesResponse {
  Branches: BranchInfo[];
}

export interface CrudActionResponse {
  Models?: unknown[];
  Model?: Record<string, unknown>;
  TotalCount?: number;
  [extra: string]: unknown;
}

// --- Viewer ---

export interface ViewerProcessesResponse {
  Processes: ViewerProcessRow[];
  TotalCount: number;
}

export interface ViewerProcessRow {
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

export interface ViewerProcessDetailResponse {
  ProcessId: number;
  Name: string;
  Version: string;
  Priority: number;
  Stages: unknown[];
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

export interface StageContextResponse {
  Data: unknown;
}

export interface MoveProcessesResponse {
  MoveStatus: { ProcessId: number; CurrentTable: string; ErrorCode: string }[];
}

export interface DeleteProcessStatus {
  ProcessId: number;
  Deleted: boolean;
  ErrorCode?: string | null;
}

export interface DeleteProcessesResponse {
  Results: DeleteProcessStatus[];
}

// --- Viewer filters ---

export type ViewerFilterType = "Long" | "DateTime" | "String";

export interface ViewerDataFilter {
  FilterName: string;
  FieldType: ViewerFilterType;
  /** Серверный `CompareOperator` имена (Equal, Between, In, ...). */
  ComparisonOperator: string;
  Values: unknown[];
}

// --- Configurator ---

export interface ClassModel {
  Name: string;
  Body: string;
}

export interface ProcessStage {
  Type: string;
  DisplayName: string;
  Name: string;
  GetData: string;
  GetNextStage: string;
  GetErrorNextStage: string;
  ReturnStages: string[];
  Properties: Record<string, string>;
}

export interface WebPosition {
  x: number;
  y: number;
}

export interface WebLine {
  LineIn: string;
  LineOut: string;
  Dash?: boolean;
}

export interface WebStage {
  Position: WebPosition;
  Color: string;
  Lines: Record<string, WebLine>;
}

export interface WebData {
  Stages: Record<string, WebStage>;
  ShowLines?: boolean;
  ShowLineLabels?: boolean;
}

export interface WebProcess {
  Category: string;
  TypeName: string;
  Name: string;
  Namespace: string;
  Startup: string;
  ModifyTimeStamp: string;
  InitObject: ClassModel;
  Context: ClassModel;
  ProcessResult: ClassModel;
  Models: ClassModel[];
  Stages: Record<string, ProcessStage>;
  Usings: string[];
  WebData: WebData;
}

export interface GetProcessAssemblyResponse {
  Model: WebProcess;
}

export interface CreateProcessAssemblyResponse {
  Process: WebProcess;
  /**
   * Сервер возвращает массив `DiagnosticModel` (с полями Text/Message/Start/End).
   * В старых версиях могли прилетать и строки — поддерживаем оба варианта.
   */
  Errors: Array<DiagnosticModel | string>;
}

export interface UpsertProcessAssemblyResponse {
  TypeName: string;
  /** См. комментарий для `CreateProcessAssemblyResponse.Errors`. */
  Errors: Array<DiagnosticModel | string>;
}

export interface DiagnosticModel {
  Text: string;
  Message: string;
  StartLine: number;
  EndLine: number;
  StartColumn: number;
  EndColumn: number;
}

export interface GetCodeResponse {
  Code: string;
  Errors?: DiagnosticModel[];
}

export interface GetProcessSourceResponse {
  SourceCs: string;
  Origin?: string;
  Exists: boolean;
}

export interface ValidateCodeResponse {
  Errors: DiagnosticModel[];
}

export interface FormatCodeResponse {
  Code: string;
}

export interface ValidateProcessResponse {
  Errors: string[];
}

export interface CommitResponse {
  Branch: string;
  CommitHash: string;
  Names: string[];
}

export interface GetChangedModelsResponse {
  Models: ProcessModel[];
  Branch: string;
}

export interface WebGlobalModel {
  Category: string;
  TypeName: string;
  Code: string;
}

export interface GetGlobalModelsResponse {
  /** Сервер возвращает список в поле `GlobalModels` (см. `WFM.ProcessAssembly.GetGlobalModels`). */
  GlobalModels: WebGlobalModel[];
  Branch?: string;
}

/**
 * Ответ `WFM.ProcessAssembly.AddGlobalModel`
 * (см. `WFM.Configurator.Handlers.AddGlobalModelResult`).
 */
export interface AddGlobalModelResponse {
  Branch?: string;
  Errors: Array<DiagnosticModel | string>;
}

export interface LoadBranchResponse {
  Branch: string;
  Count: number;
}

export interface RemoveDraftResponse {
  TypeName: string;
}
