export enum WfmCommand {
  // Configurator
  GetModels = "WFM.ProcessAssembly.GetModels",
  GetChangedModels = "WFM.ProcessAssembly.GetChangedModels",
  Upsert = "WFM.ProcessAssembly.Upsert",
  Create = "WFM.ProcessAssembly.Create",
  Validate = "WFM.ProcessAssembly.Validate",
  ValidateCode = "WFM.ProcessAssembly.ValidateCode",
  FormatCode = "WFM.ProcessAssembly.FormatCode",
  GetCode = "WFM.ProcessAssembly.GetCode",
  Commit = "WFM.ProcessAssembly.Commit",

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
  MoveToCompleted = "WFM.Process.MoveToCompleted",
  MoveFromCompleted = "WFM.Process.MoveFromCompleted",
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
}

export interface AdaptersInfoResponse {
  Adapters: AdapterTreeNode[];
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
  SourceCs?: string;
  ContentSha256?: string;
}

export interface GetModelsResponse {
  Models: ProcessModel[];
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
