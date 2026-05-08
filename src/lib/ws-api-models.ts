import type { CrudModel } from "@/pages/crud-editor/types";

export enum WfmCommand {
    // Configurator
    GetModels = "WFM.ProcessAssembly.GetModels",
    GetChangedModels = "WFM.ProcessAssembly.GetChangedModels",
    GetProcessAssembly = "WFM.ProcessAssembly.Get",
    GetProcessAssemblySource = "WFM.ProcessAssembly.GetSource",
    GetDTO = "WFM.ProcessAssembly.GetDTO",
    GetProcessDependencies = "WFM.ProcessAssembly.GetDependencies",
    SearchProcessesByDependency = "WFM.ProcessAssembly.SearchByDependency",
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

    // Branch management (см. WFM.Configurator.*Handlers — FrontCommandName)
    GetBranches = "WFM.Configurator.GetBranches",
    LoadBranch = "WFM.Configurator.LoadBranch",
    RefreshBranch = "WFM.Configurator.RefreshBranch",
    UnloadBranch = "WFM.Configurator.UnloadBranch",

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
    GenericCrudQueryPage = "GenericCRUD.Models.QueryPage",
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

/** `AdapterInfo.GetAdaptersInfoWeb` — дерево адаптеров и команд для Command Tester. */
export interface AdapterInfoGetAdaptersInfoWebRequest {
    Level?: string | null;
}

export interface AdapterInfoGetAdaptersInfoWebResponse extends AdaptersInfoResponse {
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

/** AdapterManager.Core.Commands.SendCommand */
export interface SendCommandRequest {
    SessionFields?: Record<string, unknown>;
    CreateNewSession: boolean;
    /** `"FRONT"` | `"BACK"` */
    Level: string;
    CommandName: string;
    CommandBody: string;
    AdapterName: string;
    AdapterType: string;
    Ttl?: string;
    Priority?: string;
    SessionId?: string;
    AuthId?: string;
}

/** Успешный ответ `AdapterInfo.SendCommand` без полезной нагрузки (SAL `SendCommandResult`). */
export type SendCommandResponse = Record<string, never>;

/** Элемент `TestCases` в ответе (поле `Case` — JSON-объект, как `JObject` на сервере). */
export interface ObserverCommandTestCaseDto {
    Name: string;
    Description: string;
    Case: Record<string, unknown>;
    CommandName?: string;
}

/** `Observer.GetCommandTestCases` — сохранённые тест-кейсы команды. */
export interface ObserverGetCommandTestCasesRequest {
    CommandName: string;
}

export interface ObserverGetCommandTestCasesResponse {
    CommandName: string;
    TestCases: ObserverCommandTestCaseDto[];
}

/** `Observer.AddCommandTestCase` — добавить тест-кейс. */
export interface ObserverAddCommandTestCaseRequest {
    CommandName: string;
    Name: string;
    Description: string;
    Case: Record<string, unknown>;
}

export type ObserverAddCommandTestCaseResponse = Record<string, never>;

/** `Observer.RemoveCommandTestCase` — удалить тест-кейс по имени. */
export interface ObserverRemoveCommandTestCaseRequest {
    CommandName: string;
    Name: string;
}

export type ObserverRemoveCommandTestCaseResponse = Record<string, never>;

/**
 * Процесс в дереве конфигуратора / списках.
 * База — `WFM.Common.Models.ProcessView` + поля, которые добивает `System.WFM.Process.GetTree` / клиент.
 */
export interface ProcessModel {
    TypeName: string;
    Category: string;
    Name: string;
    Action: string;
    Front?: boolean;
    Back?: boolean;
    Permission?: boolean;
    Source?: boolean;
    Draft?: boolean;
    /** Не приходит из `GetModels`; может быть в других ответах. */
    Origin?: string;
    Branch?: string;
    SourceCs?: string;
    ContentSha256?: string;
}

/** WFM.Configurator.ProcessAssemblyGetModelsHandler — GetProcessModelsCommand / GetProcessModelsResult */
export interface WfmProcessAssemblyGetModelsRequest {
    Branch?: string | null;
}

export interface WfmProcessAssemblyGetModelsResponse {
    Branch?: string | null;
    Models: ProcessModel[];
}

/** Синоним для совместимости со старыми импортами (`GetModelsResponse`). */
export type GetModelsResponse = WfmProcessAssemblyGetModelsResponse;

export interface Catalog {
    Name: string;
    Contents: ProcessModel[];
    Catalogs: Catalog[];
}

/** `WFM.Configurator.GetProcessTree` — пустое тело запроса. */
export type WfmGetProcessTreeRequest = Record<string, never>;

export interface WfmGetProcessTreeResponse {
    Branch: string;
    Catalogs: Catalog[];
    ProcessModels: ProcessModel[];
    ActionColors: Record<string, string>;
}

/** WFM.Data.Repository.Model.BranchInfo (ответ WFM.Configurator.GetBranches). */
export interface WfmConfiguratorBranchInfo {
    Branch: string;
    TotalCount: number;
    GitCount: number;
    DraftCount: number;
}

/** Алиас для UI (ветка в селекторе конфигуратора). */
export type BranchInfo = WfmConfiguratorBranchInfo;

/** `WFM.Configurator.GetBranches` — список веток, загруженных в БД. */
export type WfmConfiguratorGetBranchesRequest = Record<string, never>;

export interface WfmConfiguratorGetBranchesResponse {
    Branches: WfmConfiguratorBranchInfo[];
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

export interface WebGlobalModel {
    Category: string;
    TypeName: string;
    Code: string;
}

export interface DiagnosticModel {
    Text: string;
    Message: string;
    StartLine: number;
    EndLine: number;
    StartColumn: number;
    EndColumn: number;
}

/** WFM.Configurator.Handlers.LoadBranchCommand / LoadBranchResult */
export interface WfmConfiguratorLoadBranchRequest {
    RepoUrl?: string | null;
    Branch?: string | null;
    SubPath?: string | null;
    Force: boolean;
}

export interface WfmConfiguratorLoadBranchResponse {
    Branch: string;
    TotalCount: number;
    Compiled: number;
    Failed: number;
    FailedNames: string[];
    FromCache: boolean;
}

export interface WfmConfiguratorRefreshBranchRequest {
    RepoUrl?: string | null;
    Branch?: string | null;
    SubPath?: string | null;
}

export interface WfmConfiguratorRefreshBranchResponse {
    Branch: string;
    Added: string[];
    Changed: string[];
    Removed: string[];
    Compiled: number;
    Failed: number;
}

/** WFM.Configurator.Handlers.UnloadBranchCommand / UnloadBranchResult */
export interface WfmConfiguratorUnloadBranchRequest {
    Branch?: string | null;
    IncludeDrafts: boolean;
}

export interface WfmConfiguratorUnloadBranchResponse {
    Branch: string;
    Success: boolean;
}

// --- WFM.Runtime: viewer / процессы (зеркало C# command/result) ---
// Порядок: для каждой команды сначала Request, сразу затем Response (или type alias на общий ответ).

/** WFM.Runtime.Handlers.DataFilter */
export interface WfmDataFilterDto {
    FilterName: string;
    FieldType: string;
    ComparisonOperator: string;
    Values: unknown[];
}

/** Строка списка процессов viewer (`Get*Processes2`). */
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

export interface WfmGetCompletedProcessesRequest {
    StartProcessId?: number | null;
    Count?: number | null;
    Filters?: WfmDataFilterDto[] | null;
}

export interface WfmGetCompletedProcessesResponse {
    Processes: ViewerProcessRow[];
    TotalCount: number;
}

/** Синоним для совместимости со старыми импортами. */
export type ViewerProcessesResponse = WfmGetCompletedProcessesResponse;

export interface WfmGetManualProcessesRequest extends WfmGetCompletedProcessesRequest {
}

export type WfmGetManualProcessesResponse = WfmGetCompletedProcessesResponse;

export interface WfmGetIdleProcessesRequest extends WfmGetCompletedProcessesRequest {
}

export type WfmGetIdleProcessesResponse = WfmGetCompletedProcessesResponse;

/** Вкладка viewer: какая из команд `Get*Processes2` / деталей / дочерних. */
export type WfmViewerProcessesTab = "completed" | "manual" | "idle";

/** Список процессов viewer: таб + те же поля, что у `WfmGetCompletedProcessesRequest`. */
export interface WfmViewerGetProcessesRequest extends WfmGetCompletedProcessesRequest {
    Tab: WfmViewerProcessesTab;
}

export type WfmViewerGetProcessesResponse = WfmGetCompletedProcessesResponse;

/** Деталь процесса viewer. */
export interface WfmViewerGetProcessDetailRequest extends WfmGetCompletedProcessDetailRequest {
    Tab: WfmViewerProcessesTab;
}

export type WfmViewerGetProcessDetailResponse = WfmGetCompletedProcessDetailResponse;

/** Дочерние процессы viewer. */
export interface WfmViewerGetChildProcessesRequest extends WfmGetChildProcessesRequest {
    Tab: WfmViewerProcessesTab;
}

export type WfmViewerGetChildProcessesResponse = WfmGetCompletedChildProcessesDetailResponse;

/** Запуск процесса через `WFM.Execute` (оболочка команды формируется в `HubWsApi`). */
export interface WfmExecuteProcessRequest {
    ProcessName: string;
    InitialData?: unknown;
    SaveCompleted?: boolean;
    SaveManual?: boolean;
}

/**
 * «Сырой» `SendCommand`: готовый envelope (кроме `CommandBody`) + тело команды строкой.
 * Используется для команд без строгого DTO на клиенте.
 */
export interface HubSendRawCommandRequest {
    /** Поля уровня `AdapterInfo.SendCommand` без `CommandBody`. */
    Envelope: Record<string, unknown>;
    CommandBody: string;
    TtlOverride?: string;
}

/** SAL.API.ExceptionDTO / InternalExceptionDTO (упрощённо для JSON). */
export interface SalExceptionDto {
    Code?: string;
    TimeStamp?: string;
    Message?: string;
    Properties?: Record<string, unknown>;
    SessionId?: string;
    CorrelationId?: string;
    OperationId?: string;
    AuthId?: number | null;
    ProcessId?: number | null;
}

export interface SalInternalExceptionDto extends SalExceptionDto {
    StackTrace?: string;
    AdapterName?: string;
    HandlerName?: string;
    ExceptionType?: string;
    InnerException?: SalInternalExceptionDto;
}

/** WFM.Runtime.Handlers.ProcessDetail */
export interface WfmProcessDetailDto {
    ProcessId: number;
    ProcessCorrelationId?: string;
    Context?: unknown;
    Session?: unknown;
    InitObject?: unknown;
    InitSession?: unknown;
    Name?: string;
    Version?: string | null;
    Type?: string | null;
    Status?: string;
    StatusTimestamp?: string;
    RegisterTimestamp?: string;
    EndTimestamp?: string | null;
    WfmElapsed?: string;
    ManualControlCause?: SalInternalExceptionDto | null;
    Result?: unknown;
    Stages?: unknown[];
    HasStages?: boolean;
    LastStageIndex?: number;
}

export interface WfmGetCompletedProcessDetailRequest {
    ProcessId: number;
    StartIndex?: number | null;
}

export interface WfmGetCompletedProcessDetailResponse {
    ProcessInfo: WfmProcessDetailDto;
}

export interface WfmGetManualProcessDetailRequest extends WfmGetCompletedProcessDetailRequest {
}

export type WfmGetManualProcessDetailResponse = WfmGetCompletedProcessDetailResponse;

export interface WfmGetIdleProcessDetailRequest extends WfmGetCompletedProcessDetailRequest {
}

export type WfmGetIdleProcessDetailResponse = WfmGetCompletedProcessDetailResponse;

export interface WfmGetChildProcessesRequest {
    ParentProcessId: number;
}

export interface WfmGetCompletedChildProcessesDetailResponse {
    ProcessInfo: WfmProcessDetailDto[];
}

export interface WfmGetStageContextRequest {
    ProcessId: number;
    StageIndex: number;
    Subject: string;
    Tab: string;
}

export interface WfmGetStageContextResponse {
    Data: unknown;
}

export type StageContextResponse = WfmGetStageContextResponse;

export interface WfmRestartProcessRequest {
    ProcessId: number;
    StageIndex?: number | null;
}

export type WfmRestartProcessResponse = Record<string, never>;

export interface WfmRestartProcessWithNewDataRequest {
    ProcessId: number;
    StageIndex?: number | null;
    Data: Record<string, unknown>;
}

export type WfmRestartProcessWithNewDataResponse = Record<string, never>;

export interface WfmMoveProcessesRequest {
    ProcessIds: number[];
}

export interface WfmMoveProcessesResponse {
    MoveStatus: { ProcessId: number; CurrentTable: string; ErrorCode: string }[];
}

export type MoveProcessesResponse = WfmMoveProcessesResponse;

export interface WfmDeleteProcessesRequest {
    ProcessIds: number[];
}

export interface WfmDeleteProcessStatus {
    ProcessId: number;
    Deleted: boolean;
    ErrorCode?: string | null;
}

export interface WfmDeleteProcessesResponse {
    Results: WfmDeleteProcessStatus[];
}

export type DeleteProcessesResponse = WfmDeleteProcessesResponse;

export type DeleteProcessStatus = WfmDeleteProcessStatus;

/** WFM.Sources.PROCESS.GenericCRUDModelsActionInitObject + поле ServiceType с клиента (не в C# init, игнорируется движком). */
export interface WfmGenericCrudActionRequest {
    Model: string;
    ServiceType: string;
    Action: string;
    Data: Record<string, unknown>;
}

export interface CrudActionResponse {
    Models?: unknown[];
    Model?: Record<string, unknown>;
    TotalCount?: number;

    [extra: string]: unknown;
}

/** WFM.Sources.PROCESS.GenericCRUDModelsQueryPageInitObject + поле ServiceType с клиента. */
export interface WfmGenericCrudQueryPageRequest {
    Model: string;
    ServiceType: string;
    Limit: number;
    Offset: number;
    Search?: string;
    SortCol?: string;
    SortDir?: string;
}

export type CrudQueryPageResponse = CrudActionResponse;

/** WFM.Sources.PROCESS.GenericCRUDAdapterUpdateConfigInitObject (hub шлёт Model: string, Data: unknown[]) */
export interface WfmGenericCrudUpdateConfigTableRequest {
}

/** Ответ `UpdateConfigTable` (успех без полезной нагрузки). */
export type WfmGenericCrudUpdateConfigTableResponse = Record<string, never>;

// --- Observer: health / not handled ---

export type ObserverAdapterState = "Unknown" | "Up" | "Down" | "NotResponding";

/** ObserverFront.Commands.AdapterHealth (результат GetAdaptersHealth). */
export interface ObserverAdapterHealthDto {
    Type: string;
    Name: string;
    AdapterVersion: string;
    SalVersion: number;
    Contour: string;
    State: ObserverAdapterState | number;
    LastStateUpdateTime: string;
    StartTime?: string | null;
    DownTime?: string | null;
}

/** `Observer.GetAdaptersHealth` — снимок здоровья адаптеров из БД Observer. */
export type ObserverGetAdaptersHealthRequest = Record<string, never>;

export interface ObserverGetAdaptersHealthResponse {
    AdaptersHealth: ObserverAdapterHealthDto[];
}

export interface ObserverDeleteAdapterHealthRequest {
    Type: string;
    Name: string;
    Contour: string;
}

export type ObserverDeleteAdapterHealthResponse = Record<string, never>;

export type ObserverErrorTypes =
    | "Unknown"
    | "CommandHandler"
    | "CommandResultHandler"
    | "EventHandler"
    | "DetectionEvent"
    | number;

/** ObserverFront.Commands.ErrorOperation */
export interface ObserverErrorOperationDto {
    CorrelationId: string;
    Contour: string;
    AdapterType: string;
    AdapterName: string;
    TimeStamp: string;
    RoutingKey: string;
    ExchangeType: string;
    Exception: Record<string, unknown> | null;
    Payload: Record<string, unknown> | null;
    Headers: Record<string, unknown> | null;
    ErrorType: ObserverErrorTypes;
    WfmProcessId?: number | null;
    TransactionId?: number | null;
}

export interface ObserverGetErrorOperationsRequest {
    TimeStamp?: string | null;
    Count?: number | null;
}

export interface ObserverGetErrorOperationsResponse {
    ErrorOperations: ObserverErrorOperationDto[];
}

/** Канал ошибок в UI System → команда `Observer.*ErrorsGet`. */
export type WfmObserverErrorsChannel = "wfm" | "command" | "event" | "result" | "other";

export interface WfmObserverGetErrorsRequest extends ObserverGetErrorOperationsRequest {
    Channel: WfmObserverErrorsChannel;
}

export type WfmObserverGetErrorsResponse = ObserverGetErrorOperationsResponse;

export interface ObserverResendRequest {
    CorrelationId: string;
}

export type ObserverResendResponse = Record<string, never>;

export interface ObserverResendWithNewDataRequest {
    CorrelationId: string;
    Payload: Record<string, unknown>;
}

export type ObserverResendWithNewDataResponse = Record<string, never>;

export interface ObserverSendCommandResultRequest {
    CorrelationId: string;
    CommandResult: Record<string, unknown>;
}

export type ObserverSendCommandResultResponse = Record<string, never>;

export interface ObserverDeleteNotHandledRequest {
    CorrelationIds: string[];
}

export interface ObserverDeleteNotHandledResponse {
    Count: number;
}

// =============================================================================
// Observer — Config.* (ObserverFront.Commands.Config + Table; репозиторий observer)
// =============================================================================

/** `Config.AdapterTypes.Get` — список зарегистрированных типов адаптеров. */
export type ObserverConfigAdapterTypesGetRequest = Record<string, never>;

export interface ObserverConfigAdapterTypeInfoDto {
    AdapterType: string;
    MaxInstances: number;
    Exported: boolean;
}

export interface ObserverConfigAdapterTypesGetResponse {
    AdapterTypes: ObserverConfigAdapterTypeInfoDto[];
}

/** `Config.AdapterType.Upsert` — создать или обновить тип адаптера. */
export interface ObserverConfigAdapterTypeUpsertRequest {
    AdapterType: string;
    MaxInstances: number;
    Exported?: boolean | null;
}

export type ObserverConfigAdapterTypeUpsertResponse = Record<string, never>;

/** `Config.AdapterType.Delete` — удалить тип адаптера и связанные сущности. */
export interface ObserverConfigAdapterTypeDeleteRequest {
    AdapterType: string;
}

export type ObserverConfigAdapterTypeDeleteResponse = Record<string, never>;

/** `Config.AdapterConfiguration.Get` — конфигурации для заданного `AdapterType`. */
export interface ObserverConfigAdapterConfigurationGetRequest {
    AdapterType: string;
}

/** `Observer.Dal.DTO.Config.ConfigurationInfo` (ответ списка конфигураций). */
export interface ObserverConfigConfigurationInfoDto {
    ConfigurationId: string;
    AdapterType: string;
    Name: string;
    Description: string;
    Enabled: boolean;
    Exported: boolean;
    IsDefault: boolean;
}

export interface ObserverConfigAdapterConfigurationGetResponse {
    Configurations: ObserverConfigConfigurationInfoDto[];
}

/** `Config.AdapterConfiguration.Create` — новая конфигурация. */
export interface ObserverConfigAdapterConfigurationCreateRequest {
    AdapterType: string;
    Name: string;
    Description?: string;
    Enabled: boolean;
}

export interface ObserverConfigAdapterConfigurationCreateResponse {
    ConfigurationInfo: ObserverConfigConfigurationInfoDto;
}

/** `Config.AdapterConfiguration.CreateBaseFront` — конфигурация из базового FRONT-шаблона. */
export interface ObserverConfigAdapterConfigurationCreateBaseFrontRequest {
    AdapterType: string;
    Name: string;
    Description?: string;
    Enabled: boolean;
}

export type ObserverConfigAdapterConfigurationCreateBaseFrontResponse =
    ObserverConfigAdapterConfigurationCreateResponse;

/** `Config.AdapterConfiguration.CreateBaseBack` — конфигурация из базового BACK-шаблона. */
export interface ObserverConfigAdapterConfigurationCreateBaseBackRequest {
    AdapterType: string;
    Name: string;
    Description?: string;
    Enabled: boolean;
}

export type ObserverConfigAdapterConfigurationCreateBaseBackResponse =
    ObserverConfigAdapterConfigurationCreateResponse;

/** `Config.AdapterConfiguration.Clone` — клонирование существующей конфигурации. */
export interface ObserverConfigAdapterConfigurationCloneRequest {
    CloningConfigurationId: string;
    AdapterType: string;
    Name: string;
    Description?: string;
    Enabled: boolean;
}

export type ObserverConfigAdapterConfigurationCloneResponse = ObserverConfigAdapterConfigurationCreateResponse;

/** `Config.AdapterConfiguration.CloneInherited` — клон с унаследованными секциями. */
export interface ObserverConfigAdapterConfigurationCloneInheritedRequest {
    CloningConfigurationId: string;
    AdapterType: string;
    Name: string;
    Description?: string;
    Enabled: boolean;
}

export type ObserverConfigAdapterConfigurationCloneInheritedResponse =
    ObserverConfigAdapterConfigurationCreateResponse;

/** `Config.AdapterConfiguration.Update` — изменить метаданные конфигурации. */
export interface ObserverConfigAdapterConfigurationUpdateRequest {
    ConfigurationId: string;
    AdapterType: string;
    Name: string;
    Description: string;
    Exported: boolean;
    IsDefault: boolean;
    Enabled: boolean;
}

export type ObserverConfigAdapterConfigurationUpdateResponse = ObserverConfigAdapterConfigurationCreateResponse;

/** `Config.AdapterConfiguration.SetDefault` — пометить конфигурацию дефолтной (ответ — обновлённый список). */
export interface ObserverConfigAdapterConfigurationSetDefaultRequest {
    ConfigurationId: string;
}

export type ObserverConfigAdapterConfigurationSetDefaultResponse = ObserverConfigAdapterConfigurationGetResponse;

/** `Config.AdapterConfiguration.Delete` — удалить конфигурацию. */
export interface ObserverConfigAdapterConfigurationDeleteRequest {
    ConfigurationId: string;
}

export type ObserverConfigAdapterConfigurationDeleteResponse = Record<string, never>;

/** `Observer.Dal.Configuration.BuildRule` — правила построения секции. */
export interface ObserverConfigBuildRuleDto {
    Filters?: unknown[];
    Structure?: Record<string, unknown>;
}

/** `Observer.Dal.DTO.Config.ConfigurationSectionsInfo` */
export interface ObserverConfigConfigurationSectionInfoDto {
    SectionId: string;
    Name: string;
    DisplayName: string;
    Inherited: string;
    BuildTable: string;
    BuildRules?: ObserverConfigBuildRuleDto;
    JsonData?: unknown;
    ModifyTimeStamp: string;
    Locked: boolean;
}

/** `Config.Section.Get` — секции выбранной конфигурации. */
export interface ObserverConfigSectionGetRequest {
    ConfigurationId: string;
}

export interface ObserverConfigSectionGetResponse {
    ConfigurationSections: ObserverConfigConfigurationSectionInfoDto[];
}

/** `Config.Section.GetBase` — базовые секции шаблона. */
export type ObserverConfigSectionGetBaseRequest = Record<string, never>;

export type ObserverConfigSectionGetBaseResponse = ObserverConfigSectionGetResponse;

/** `Config.Section.Create` — создать секцию. */
export interface ObserverConfigSectionCreateRequest {
    ConfigurationId: string;
    Name: string;
    DisplayName?: string;
    Inherited?: string;
    BuildTable?: string;
    BuildRules?: ObserverConfigBuildRuleDto;
    JsonData?: unknown;
    Locked: boolean;
}

export interface ObserverConfigSectionCreateResponse {
    SectionId: string;
    Name: string;
    DisplayName: string;
    Inherited: string;
    BuildTable: string;
    BuildRules?: ObserverConfigBuildRuleDto;
    JsonData?: unknown;
    Locked: boolean;
    ModifyTimeStamp: string;
}

/** `Config.Section.Update` — обновить секцию. */
export interface ObserverConfigSectionUpdateRequest {
    SectionId: string;
    Inherited?: string;
    BuildTable?: string;
    BuildRules?: ObserverConfigBuildRuleDto;
    JsonData?: unknown;
    Name?: string;
    DisplayName?: string;
    Locked: boolean;
    LastModifyTimeStamp?: string | null;
}

export type ObserverConfigSectionUpdateResponse = ObserverConfigSectionCreateResponse;

/** `Config.Section.Delete` — удалить секцию. */
export interface ObserverConfigSectionDeleteRequest {
    SectionId: string;
}

export type ObserverConfigSectionDeleteResponse = Record<string, never>;

/** `Config.GetCompletedSectionData` — данные завершённой секции. */
export interface ObserverConfigGetCompletedSectionDataRequest {
    SectionId: string;
}

export interface ObserverConfigGetCompletedSectionDataResponse extends ObserverConfigSectionCreateResponse {
    JsonConfiguration?: unknown;
}

/** `Config.GetConfiguration` — собранный JSON конфигурации (`ConfigurationBuilder`). */
export interface ObserverConfigGetConfigurationRequest {
    ConfigurationId: string;
}

export interface ObserverConfigGetConfigurationResponse {
    JsonConfiguration: unknown;
}

/** Тот же `Config.GetConfiguration`, но по паре `AdapterType` + `Name` (как в Hub). */
export interface ObserverConfigGetConfigurationByAdapterRequest {
    AdapterType: string;
    Name: string;
}

export type ObserverConfigGetConfigurationByAdapterResponse = ObserverConfigGetConfigurationResponse;

/** `Config.Export` — выгрузка (имя + base64) для указанной конфигурации. */
export interface ObserverConfigExportRequest {
    AdapterType: string;
    Name: string;
}

export interface ObserverConfigExportResponse {
    FileName: string;
    B64Data: string;
}

/**
 * `Config.Import` — импорт конфигурации.
 * В `ObserverFront.Commands.Config` нет отдельного класса команды; оставляем произвольный объект.
 */
export type ObserverConfigImportRequest = Record<string, unknown>;

export type ObserverConfigImportResponse = Record<string, unknown>;

export interface ObserverConfigTableInfoDto {
    Name: string;
    ExportedData: boolean;
    ModifyTimeStamp: string;
}

/** `Config.Table.GetAllTables` — список табличных представлений. */
export type ObserverConfigTableGetAllTablesRequest = Record<string, never>;

export interface ObserverConfigTableGetAllTablesResponse {
    Tables: ObserverConfigTableInfoDto[];
}

export type ObserverConfigTableFieldType =
    | "Long"
    | "Decimal"
    | "DateTime"
    | "TimeStamp"
    | "Boolean"
    | "String"
    | "Object"
    | string;

export interface ObserverConfigTableFieldInfoDto {
    FieldType: ObserverConfigTableFieldType | number;
    ColumnName: string;
    ColumnOrder: number;
    FieldName: string;
    IsPrimaryKey: boolean;
}

/** `Config.Table.GetMeta` — метаданные колонок таблицы. */
export interface ObserverConfigTableGetMetaRequest {
    TableName: string;
}

export interface ObserverConfigTableGetMetaResponse {
    FieldInfos: ObserverConfigTableFieldInfoDto[];
}

/** Элемент фильтра/сортировки для `Config.Table.Get` (DapperQB DTO). */
export interface ObserverConfigDataFilterDto {
    [key: string]: unknown;
}

export interface ObserverConfigDataOrderDto {
    [key: string]: unknown;
}

/** `Config.Table.Get` — строки таблицы. */
export interface ObserverConfigTableGetRequest {
    TableName: string;
    Filters?: ObserverConfigDataFilterDto[];
    Orders?: ObserverConfigDataOrderDto[];
}

export interface ObserverConfigTableGetResponse {
    TableName: string;
    Data: Record<string, unknown>[];
}

/** `Config.Table.Upsert` — upsert строк. */
export interface ObserverConfigTableUpsertRequest {
    TableName: string;
    Data: Record<string, unknown>[];
}

export type ObserverConfigTableUpsertResponse = Record<string, never>;

/** `Config.Table.Delete` — удаление строк по ключам в `Data`. */
export interface ObserverConfigTableDeleteRequest {
    TableName: string;
    Data: Record<string, unknown>[];
}

export type ObserverConfigTableDeleteResponse = Record<string, never>;

/** `Config.Table.Insert` — вставка строк. */
export interface ObserverConfigTableInsertRequest {
    TableName: string;
    Data: Record<string, unknown>[];
}

export type ObserverConfigTableInsertResponse = Record<string, never>;

/** `Config.Table.Update` — обновление строк. */
export interface ObserverConfigTableUpdateRequest {
    TableName: string;
    Data: Record<string, unknown>[];
}

export type ObserverConfigTableUpdateResponse = Record<string, never>;

/** `Config.Table.DeleteAll` — удалить все строки таблицы. */
export interface ObserverConfigTableDeleteAllRequest {
    TableName: string;
}

export type ObserverConfigTableDeleteAllResponse = Record<string, never>;

/** `Config.Table.ClearCache` — сброс кэша таблицы. */
export interface ObserverConfigTableClearCacheRequest {
    TableName: string;
}

export type ObserverConfigTableClearCacheResponse = Record<string, never>;

// --- Auth adapter (AuthAdapter.Core.Command) ---

export type AuthPermissionTreeItemType = "Unknown" | "Catalog" | "Permission" | number;

export type AuthPermissionType = "Unknown" | "Api" | "UI" | "Event" | number;

export interface AuthPermissionSettingsDto {
    Type: AuthPermissionType;
    ConfirmationRequired: boolean;
    ApiPath?: string[];
}

export interface AuthPermissionTreeItemDto {
    Type: AuthPermissionTreeItemType;
    PermissionId?: number | null;
    CatalogId?: number | null;
    ParentId?: number | null;
    Name?: string;
    Description?: string;
    StrId?: string;
    PermissionSettings?: AuthPermissionSettingsDto;
    PermissionTree?: AuthPermissionTreeItemDto[] | null;
}

/** `Auth.GetPermissionTree` — дерево каталогов и прав. */
export type AuthGetPermissionTreeRequest = Record<string, never>;

export interface AuthGetPermissionTreeResponse {
    PermissionTree: AuthPermissionTreeItemDto[];
}

/** `Auth.GetPermissionId` — следующий свободный идентификатор permission. */
export type AuthGetPermissionIdRequest = Record<string, never>;

export interface AuthGetPermissionIdResponse {
    Id: number;
}

export type AuthPermissionAction = "Unknown" | "Allow" | "Deny" | number;

/** AuthServer.DAL.DTO.Permission */
export interface AuthPermissionDto {
    PermissionId: number;
    CatalogId?: number | null;
    Name?: string;
    Description?: string;
    StrId?: string;
    Action: AuthPermissionAction;
    PermissionSettings?: AuthPermissionSettingsDto;
}

/** `Auth.GetPermissions` — плоский список всех прав. */
export type AuthGetPermissionsRequest = Record<string, never>;

export interface AuthGetPermissionsResponse {
    Permissions: AuthPermissionDto[];
}

export interface AuthUpsertPermissionCatalogRequest {
    /** Для создания каталога можно не передавать. */
    CatalogId?: number;
    ParentId?: number | null;
    Name: string;
    Description?: string | null;
}

export type AuthUpsertPermissionCatalogResponse = Record<string, never>;

export interface AuthRemovePermissionCatalogRequest {
    CatalogId: number;
}

export type AuthRemovePermissionCatalogResponse = Record<string, never>;

export interface AuthUpsertPermissionRequest {
    /** Для нового permission можно не передавать — сервер выдаст id. */
    PermissionId?: number;
    CatalogId?: number | null;
    Name?: string | null;
    Description?: string | null;
    StrId?: string | null;
    PermissionSettings?: AuthPermissionSettingsDto | null;
}

export type AuthUpsertPermissionResponse = Record<string, never>;

export interface AuthRemovePermissionRequest {
    PermissionId: number;
}

export type AuthRemovePermissionResponse = Record<string, never>;

export interface AuthSessionSettingsDto {
    TTL?: string | null;
    AutoProlongation?: boolean | null;
    ManualProlongation?: boolean | null;
    EncryptionRequired?: boolean | null;
    ReAuthEnable?: boolean | null;
}

/** AuthServer.DAL.DTO.Role */
export interface AuthRoleDto {
    Order?: number | null;
    RoleId: number;
    Name?: string;
    Description?: string | null;
    SessionSettings?: AuthSessionSettingsDto | null;
    SessionData?: Record<string, unknown> | null;
}

/** `Auth.GetRoles` — список ролей. */
export type AuthGetRolesRequest = Record<string, never>;

export interface AuthGetRolesResponse {
    Roles: AuthRoleDto[];
}

export interface AuthGetRolePermissionsRequest {
    RoleId: number;
}

export interface AuthGetRolePermissionsResponse {
    RoleId: number;
    Permissions: AuthPermissionDto[];
}

export interface AuthUpsertRoleRequest {
    /** Для новой роли можно не передавать. */
    RoleId?: number;
    Name: string;
    Description?: string | null;
    SessionSettings?: AuthSessionSettingsDto | null;
    SessionData?: Record<string, unknown> | null;
}

export type AuthUpsertRoleResponse = Record<string, never>;

export interface AuthRemoveRoleRequest {
    RoleId: number;
}

export type AuthRemoveRoleResponse = Record<string, never>;

export interface AuthAssignPermissionsToRoleRequest {
    RoleId: number;
    PermissionIds: number[];
}

export type AuthAssignPermissionsToRoleResponse = Record<string, never>;

export interface AuthDenyPermissionsForRoleRequest {
    RoleId: number;
    PermissionIds: number[];
}

export type AuthDenyPermissionsForRoleResponse = Record<string, never>;

export interface AuthRemovePermissionsFromRoleRequest {
    RoleId: number;
    PermissionIds: number[];
}

export type AuthRemovePermissionsFromRoleResponse = Record<string, never>;

// --- WFM.ProcessAssembly.* (для каждой команды: Request сразу с Response) ---

export interface WfmProcessAssemblyGetRequest {
    Name: string;
}

export interface WfmProcessAssemblyGetResponse {
    Model: WebProcess;
}

export interface WfmProcessAssemblyLoadRequest {
    TypeName: string;
}

export type WfmProcessAssemblyLoadResponse = WfmProcessAssemblyGetResponse;

export interface WfmProcessAssemblyCreateRequest {
    Name: string;
    Code: string;
    Branch?: string | null;
    WebData?: WebData;
}

export interface WfmProcessAssemblyCreateResponse {
    /**
     * Сервер возвращает скомпилированный процесс в поле `Model`
     * (не `Process`).
     */
    Model: WebProcess;
    /**
     * Сервер возвращает массив `DiagnosticModel` (с полями Text/Message/Start/End).
     * В старых версиях могли прилетать и строки — поддерживаем оба варианта.
     */
    Errors: Array<DiagnosticModel | string>;
}

export interface WfmProcessAssemblyUpsertRequest {
    Branch?: string | null;
    Name: string;
    Category: string;
    Model: WebProcess | WebGlobalModel | WebData | Record<string, unknown>;
    CreateNew: boolean;
}

export interface WfmProcessAssemblyUpsertResponse {
    TypeName: string;
    /** См. комментарий для `WfmProcessAssemblyCreateResponse.Errors`. */
    Errors: Array<DiagnosticModel | string>;
}

export interface WfmProcessAssemblyGetApiRelatedDataRequest {
    MethodName: string;
}

/** Ответ `System.WFM.API.GetRelatedData` — совпадает с `ApiRelatedData` (поля JArray на сервере → JSON). */
export type WfmProcessAssemblyGetApiRelatedDataResponse = ApiRelatedData;

/** WFM.Sources.PROCESS.SystemWFMAPIUpsertInitObject / Success payload */
export interface WfmProcessAssemblyApiUpsertRequest {
    MethodName: string;
    Description: string;
    HandlerType: string;
    CommandDTO: unknown;
    ResultDTO: unknown;
    SaveCompleted: boolean;
    SaveManual: boolean;
    Roles: string[];
}

/** UI-форма `EditApiDialog`: то же тело, что и `WfmProcessAssemblyApiUpsertRequest` (HandlerType сужен). */
export type ApiUpsertPayload = WfmProcessAssemblyApiUpsertRequest;

export interface WfmProcessAssemblyApiUpsertResponse {
    FrontHandler?: Record<string, unknown>;
    PermissionCatalogs?: unknown;
    Permission?: Record<string, unknown>;
    PermissionRoles?: unknown;
    Roles?: string[];
    NewRoles?: unknown;
    RemoveRoles?: unknown;
}

/** `WFM.ProcessAssembly.GetChangedModels` — черновики, отличающиеся от git. */
export type WfmProcessAssemblyGetChangedModelsRequest = Record<string, never>;

export interface WfmProcessAssemblyGetChangedModelsResponse {
    Models: ProcessModel[];
    Branch: string;
}

export interface WfmProcessAssemblyRemoveDraftRequest {
    TypeName: string;
}

export interface WfmProcessAssemblyRemoveDraftResponse {
    TypeName: string;
}

/** `WFM.ProcessAssembly.GetGlobalModels` — глобальные модели ветки. */
export type WfmProcessAssemblyGetGlobalModelsRequest = Record<string, never>;

export interface WfmProcessAssemblyGetGlobalModelsResponse {
    /** Сервер возвращает список в поле `GlobalModels` (см. `WFM.ProcessAssembly.GetGlobalModels`). */
    GlobalModels: WebGlobalModel[];
    Branch?: string;
}

/**
 * Ответ `WFM.ProcessAssembly.AddGlobalModel`
 * (см. `WFM.Configurator.Handlers.AddGlobalModelResult`).
 */
export interface WfmProcessAssemblyAddGlobalModelRequest {
    GlobalModel: WebGlobalModel;
    CreateNew: boolean;
}

export interface WfmProcessAssemblyAddGlobalModelResponse {
    Branch?: string;
    Errors: Array<DiagnosticModel | string>;
}

export interface WfmProcessAssemblyValidateGlobalModelRequest {
    Model: WebGlobalModel;
}

/** Сервер для `ValidateGlobalModel` отдаёт ту же форму, что и для `ValidateCode`. */
export interface WfmProcessAssemblyValidateGlobalModelResponse {
    Errors: DiagnosticModel[];
}

export interface WfmProcessAssemblyGetCodeRequest {
    Process: WebProcess;
}

export interface WfmProcessAssemblyGetCodeResponse {
    Code: string;
    Errors?: DiagnosticModel[];
}

export interface WfmProcessAssemblyGetDTORequest {
    Name: string;
}

export interface WfmProcessAssemblyGetDTOResponse {
    CommandDTO: unknown[];
    ResultDTO: unknown[];
    CommandDTOJSchema?: unknown;
    InitialDataTemplate?: Record<string, unknown>;
}

export interface DependencyItem {
    Model?: string;
    Action?: string;
    CommandName?: string;
    EventName?: string;
    ProcessTypeName?: string;
    StageName: string;
}

export interface WfmProcessAssemblyGetDependenciesRequest {
    Name: string;
    Branch?: string | null;
}

export interface WfmProcessAssemblyGetDependenciesResult {
    CRUD: DependencyItem[];
    Commands: DependencyItem[];
    Events: DependencyItem[];
    SubProcesses: DependencyItem[];
}

export interface WfmProcessAssemblySearchByDependencyRequest {
    DepType: "crud" | "commands" | "events" | "subs";
    DepName: string;
    Branch?: string | null;
}

export interface WfmProcessAssemblySearchByDependencyResult {
    Processes: ProcessModel[];
}

export interface WfmProcessAssemblyGetSourceRequest {
    Name: string;
    Branch?: string | null;
    Origin?: string | null;
}

export interface WfmProcessAssemblyGetSourceResponse {
    SourceCs: string;
    Origin?: string;
    Exists: boolean;
}

export interface WfmProcessAssemblyValidateRequest {
    Process: WebProcess;
}

export interface WfmProcessAssemblyValidateResponse {
    Errors: string[];
}

export interface WfmProcessAssemblyValidateCodeRequest {
    Code: string;
}

export interface WfmProcessAssemblyValidateCodeResponse {
    Errors: DiagnosticModel[];
}

export interface WfmProcessAssemblyFormatCodeRequest {
    Code: string;
}

export interface WfmProcessAssemblyFormatCodeResponse {
    Code: string;
}

export interface WfmProcessAssemblyCommitRequest {
    Names: string[];
    Message: string;
}

export interface WfmProcessAssemblyCommitResponse {
    Branch: string;
    CommitHash: string;
    Names: string[];
}
