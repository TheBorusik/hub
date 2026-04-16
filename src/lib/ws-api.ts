import { useMemo } from "react";
import { useWebSocket, type AuthWebSocket } from "@theborusik/ws-react";
import {
  WfmCommand,
  type AdaptersInfoResponse,
  type SendCommandRequest,
  type TestCasesResponse,
  type GetModelsResponse,
  type GetBranchesResponse,
  type CrudActionResponse,
  type ViewerProcessesResponse,
  type StageContextResponse,
  type MoveProcessesResponse,
} from "./ws-api-models";

export class HubWsApi {
  constructor(private readonly ws: AuthWebSocket) {}

  async login(login: string, password: string) {
    return this.ws.login(login, password);
  }

  async logout() {
    return this.ws.logout();
  }

  async getAdaptersInfo() {
    return this.requestPayload<Record<string, never>, AdaptersInfoResponse>(
      {},
      WfmCommand.GetAdaptersInfo,
    );
  }

  async sendCommand(request: SendCommandRequest) {
    return this.requestPayload<SendCommandRequest, unknown>(
      request,
      WfmCommand.SendCommand,
      request.Ttl ?? "00:00:45",
    );
  }

  async sendRawCommand(data: Record<string, unknown>, commandBody: string, ttlOverride?: string) {
    const payload = { ...data, CommandBody: commandBody };
    const ttl = ttlOverride ?? String(data.Ttl ?? "00:00:15");
    const response = await this.ws.sendRequest(payload, WfmCommand.SendCommand, {
      ttl,
      priority: "Normal",
      timeoutMs: 120_000,
    });
    return response.Payload as Record<string, unknown>;
  }

  async getCommandTestCases(commandName: string) {
    return this.requestPayload<{ CommandName: string }, TestCasesResponse>(
      { CommandName: commandName },
      WfmCommand.GetCommandTestCases,
    );
  }

  async addCommandTestCase(
    commandName: string,
    name: string,
    description: string,
    caseJson: string,
  ) {
    return this.requestPayload(
      {
        CommandName: commandName,
        Name: name,
        Description: description,
        Case: JSON.parse(caseJson),
      },
      WfmCommand.AddCommandTestCase,
    );
  }

  async removeCommandTestCase(commandName: string, name: string) {
    return this.requestPayload(
      { CommandName: commandName, Name: name },
      WfmCommand.RemoveCommandTestCase,
    );
  }

  async getProcessModels() {
    return this.requestPayload<Record<string, never>, GetModelsResponse>(
      {},
      WfmCommand.GetModels,
    );
  }

  async getBranches() {
    return this.requestPayload<Record<string, never>, GetBranchesResponse>(
      {},
      WfmCommand.GetBranches,
    );
  }

  async getCrudModels() {
    return this.crudAction("CRUDModel", "CRUDModels", "GetAll", {});
  }

  async getModelData(modelName: string, serviceType: string) {
    return this.crudAction(modelName, serviceType, "GetAll", {});
  }

  async addRecord(modelName: string, serviceType: string, data: Record<string, unknown>) {
    return this.crudAction(modelName, serviceType, "Add", data);
  }

  async updateRecord(modelName: string, serviceType: string, data: Record<string, unknown>) {
    return this.crudAction(modelName, serviceType, "Update", { Model: data });
  }

  async deleteRecord(modelName: string, serviceType: string, keyName: string, keyValue: unknown) {
    return this.crudAction(modelName, serviceType, "Delete", { [keyName]: keyValue });
  }

  async updateConfigTable(modelName: string, data: unknown[]) {
    return this.requestPayload(
      { Model: modelName, Data: data },
      WfmCommand.UpdateConfigTable,
    );
  }

  private async crudAction(model: string, serviceType: string, action: string, data: Record<string, unknown>) {
    return this.requestPayload<Record<string, unknown>, CrudActionResponse>(
      { Model: model, ServiceType: serviceType, Action: action, Data: data },
      WfmCommand.GenericCrudAction,
      "00:00:30",
    );
  }

  // --- Viewer ---

  async getProcesses(tab: "completed" | "manual" | "idle", count: number, startProcessId?: number) {
    const commands = {
      completed: WfmCommand.GetCompletedProcesses,
      manual: WfmCommand.GetManualProcesses,
      idle: WfmCommand.GetIdleProcesses,
    } as const;
    return this.requestPayload<Record<string, unknown>, ViewerProcessesResponse>(
      { Count: count, ...(startProcessId != null ? { StartProcessId: startProcessId } : {}) },
      commands[tab],
    );
  }

  async getProcessDetail(tab: "completed" | "manual" | "idle", processId: number, startIndex?: number) {
    const commands = {
      completed: WfmCommand.GetCompletedProcessDetail,
      manual: WfmCommand.GetManualProcessDetail,
      idle: WfmCommand.GetIdleProcessDetail,
    } as const;
    const result = await this.requestPayload<Record<string, unknown>, Record<string, unknown>>(
      { ProcessId: processId, ...(startIndex != null ? { StartIndex: startIndex } : {}) },
      commands[tab],
      "00:00:30",
    );
    return result.ProcessInfo as Record<string, unknown>;
  }

  async getChildProcesses(tab: "completed" | "manual" | "idle", parentProcessId: number) {
    const commands = {
      completed: WfmCommand.GetCompletedChildsProcessDetail,
      manual: WfmCommand.GetManualChildsProcessDetail,
      idle: WfmCommand.GetIdleChildsProcessDetail,
    } as const;
    return this.requestPayload<{ ParentProcessId: number }, Record<string, unknown>[]>(
      { ParentProcessId: parentProcessId },
      commands[tab],
    );
  }

  async getStageContext(processId: number, stageIndex: number, subject: string, tab: string) {
    return this.requestPayload<Record<string, unknown>, StageContextResponse>(
      { ProcessId: processId, StageIndex: stageIndex, Subject: subject, Tab: tab },
      WfmCommand.GetStageContext,
    );
  }

  async restartProcess(processId: number, stageIndex: number) {
    return this.requestPayload(
      { ProcessId: processId, StageIndex: stageIndex },
      WfmCommand.RestartProcess,
      "00:00:30",
    );
  }

  async restartProcessWithNewData(processId: number, stageIndex: number, data: unknown) {
    return this.requestPayload(
      { ProcessId: processId, StageIndex: stageIndex, Data: data },
      WfmCommand.RestartProcessWithNewData,
      "00:00:30",
    );
  }

  async moveToCompleted(processIds: number[]) {
    return this.requestPayload<{ ProcessIds: number[] }, MoveProcessesResponse>(
      { ProcessIds: processIds },
      WfmCommand.MoveToCompleted,
    );
  }

  async moveFromCompleted(processIds: number[]) {
    return this.requestPayload<{ ProcessIds: number[] }, MoveProcessesResponse>(
      { ProcessIds: processIds },
      WfmCommand.MoveFromCompleted,
    );
  }

  // --- System: Adapters Health ---

  async getAdaptersHealth() {
    return this.requestPayload<Record<string, never>, Record<string, unknown>>(
      {},
      WfmCommand.ObserverAdaptersHealthGet,
    );
  }

  async deleteAdapterHealth(type: string, name: string, contour: string) {
    return this.requestPayload(
      { Type: type, Name: name, Contour: contour },
      WfmCommand.ObserverAdapterHealthDelete,
    );
  }

  // --- System: Adapter Configuration ---

  async getAdapterTypes() {
    return this.requestPayload<Record<string, never>, Record<string, unknown>>(
      {},
      WfmCommand.ConfigAdapterTypesGet,
    );
  }

  async upsertAdapterType(data: Record<string, unknown>) {
    return this.requestPayload(data, WfmCommand.ConfigAdapterTypeUpsert);
  }

  async deleteAdapterType(adapterType: string) {
    return this.requestPayload(
      { AdapterType: adapterType },
      WfmCommand.ConfigAdapterTypeDelete,
    );
  }

  async getAdapterConfigurations(adapterType: string) {
    return this.requestPayload<Record<string, unknown>, Record<string, unknown>>(
      { AdapterType: adapterType },
      WfmCommand.ConfigAdapterConfigurationGet,
    );
  }

  async createAdapterConfiguration(data: Record<string, unknown>) {
    return this.requestPayload(data, WfmCommand.ConfigAdapterConfigurationCreate);
  }

  async createBaseBackConfiguration(adapterType: string) {
    return this.requestPayload(
      { AdapterType: adapterType },
      WfmCommand.ConfigAdapterConfigurationCreateBaseBack,
    );
  }

  async createBaseFrontConfiguration(adapterType: string) {
    return this.requestPayload(
      { AdapterType: adapterType },
      WfmCommand.ConfigAdapterConfigurationCreateBaseFront,
    );
  }

  async cloneConfiguration(configurationId: number, name: string) {
    return this.requestPayload(
      { ConfigurationId: configurationId, Name: name },
      WfmCommand.ConfigAdapterConfigurationClone,
    );
  }

  async cloneInheritedConfiguration(configurationId: number, name: string) {
    return this.requestPayload(
      { ConfigurationId: configurationId, Name: name },
      WfmCommand.ConfigAdapterConfigurationCloneInherited,
    );
  }

  async updateAdapterConfiguration(data: Record<string, unknown>) {
    return this.requestPayload(data, WfmCommand.ConfigAdapterConfigurationUpdate);
  }

  async setDefaultConfiguration(configurationId: number) {
    return this.requestPayload(
      { ConfigurationId: configurationId },
      WfmCommand.ConfigAdapterConfigurationSetDefault,
    );
  }

  async deleteAdapterConfiguration(configurationId: number) {
    return this.requestPayload(
      { ConfigurationId: configurationId },
      WfmCommand.ConfigAdapterConfigurationDelete,
    );
  }

  // --- System: Sections ---

  async getSections(configurationId: number) {
    return this.requestPayload<Record<string, unknown>, Record<string, unknown>>(
      { ConfigurationId: configurationId },
      WfmCommand.ConfigSectionGet,
    );
  }

  async getBaseSections() {
    return this.requestPayload<Record<string, unknown>, Record<string, unknown>>(
      {},
      WfmCommand.ConfigSectionBaseGet,
    );
  }

  async createSection(data: Record<string, unknown>) {
    return this.requestPayload(data, WfmCommand.ConfigSectionCreate);
  }

  async updateSection(data: Record<string, unknown>) {
    return this.requestPayload(data, WfmCommand.ConfigSectionUpdate);
  }

  async deleteSection(sectionId: number) {
    return this.requestPayload(
      { SectionId: sectionId },
      WfmCommand.ConfigSectionDelete,
    );
  }

  async getCompletedSectionData(sectionId: number) {
    return this.requestPayload<Record<string, unknown>, Record<string, unknown>>(
      { SectionId: sectionId },
      WfmCommand.ConfigCompletedSectionDataGet,
    );
  }

  async getFullConfiguration(adapterType: string, name: string) {
    return this.requestPayload<Record<string, unknown>, Record<string, unknown>>(
      { AdapterType: adapterType, Name: name },
      WfmCommand.ConfigConfigurationGet,
    );
  }

  async exportConfig(adapterType: string, name: string) {
    return this.requestPayload<Record<string, unknown>, Record<string, unknown>>(
      { AdapterType: adapterType, Name: name },
      WfmCommand.ConfigExport,
    );
  }

  async importConfig(data: Record<string, unknown>) {
    return this.requestPayload(data, WfmCommand.ConfigImport);
  }

  // --- System: Tables ---

  async getAllTables() {
    return this.requestPayload<Record<string, never>, Record<string, unknown>>(
      {},
      WfmCommand.ConfigTableGetAll,
    );
  }

  async getTableMeta(tableName: string) {
    return this.requestPayload<Record<string, unknown>, Record<string, unknown>>(
      { TableName: tableName },
      WfmCommand.ConfigTableGetMeta,
    );
  }

  async getTableData(tableName: string) {
    return this.requestPayload<Record<string, unknown>, Record<string, unknown>>(
      { TableName: tableName },
      WfmCommand.ConfigTableGet,
    );
  }

  async upsertTableData(tableName: string, data: Record<string, unknown>[]) {
    return this.requestPayload(
      { TableName: tableName, Data: data },
      WfmCommand.ConfigTableUpsert,
    );
  }

  async deleteTableData(tableName: string, data: Record<string, unknown>[]) {
    return this.requestPayload(
      { TableName: tableName, Data: data },
      WfmCommand.ConfigTableDelete,
    );
  }

  // --- System: Errors ---

  async getErrors(errorType: string, timestamp?: string, count?: number) {
    const commandMap: Record<string, string> = {
      wfm: WfmCommand.ObserverWfmErrorsGet,
      command: WfmCommand.ObserverCommandErrorsGet,
      event: WfmCommand.ObserverEventErrorsGet,
      result: WfmCommand.ObserverCommandResultErrorsGet,
      other: WfmCommand.ObserverOtherErrorsGet,
    };
    const cmd = commandMap[errorType] ?? WfmCommand.ObserverWfmErrorsGet;
    return this.requestPayload<Record<string, unknown>, Record<string, unknown>>(
      { ...(timestamp ? { TimeStamp: timestamp } : {}), ...(count ? { Count: count } : {}) },
      cmd,
      "00:00:30",
    );
  }

  async resendError(correlationId: string) {
    return this.requestPayload(
      { CorrelationId: correlationId },
      WfmCommand.ObserverResend,
    );
  }

  async resendWithNewData(correlationId: string, payload: unknown) {
    return this.requestPayload(
      { CorrelationId: correlationId, Payload: payload },
      WfmCommand.ObserverResendWithNewData,
    );
  }

  async sendCommandResult(correlationId: string, result: unknown, error: unknown, resultCode: string) {
    return this.requestPayload(
      { CorrelationId: correlationId, CommandResult: { Result: result, Error: error, ResultCode: resultCode } },
      WfmCommand.ObserverSendCommandResult,
    );
  }

  async deleteNotHandled(correlationIds: string[]) {
    return this.requestPayload(
      { CorrelationIds: correlationIds },
      WfmCommand.ObserverDeleteNotHandled,
    );
  }

  // --- System: Permissions ---

  async getPermissionTree() {
    return this.requestPayload<Record<string, never>, Record<string, unknown>>(
      {},
      WfmCommand.AuthGetPermissionTree,
    );
  }

  async getPermissionId() {
    return this.requestPayload<Record<string, never>, { Id: number }>(
      {},
      WfmCommand.AuthGetPermissionId,
    );
  }

  async getAllPermissions() {
    return this.requestPayload<Record<string, never>, Record<string, unknown>>(
      {},
      WfmCommand.AuthGetPermissions,
    );
  }

  async upsertPermissionCatalog(data: Record<string, unknown>) {
    return this.requestPayload(data, WfmCommand.AuthUpsertPermissionCatalog);
  }

  async removePermissionCatalog(catalogId: number) {
    return this.requestPayload(
      { CatalogId: catalogId },
      WfmCommand.AuthRemovePermissionCatalog,
    );
  }

  async upsertPermission(data: Record<string, unknown>) {
    return this.requestPayload(data, WfmCommand.AuthUpsertPermission);
  }

  async removePermission(permissionId: number) {
    return this.requestPayload(
      { PermissionId: permissionId },
      WfmCommand.AuthRemovePermission,
    );
  }

  // --- System: Roles ---

  async getRoles() {
    return this.requestPayload<Record<string, never>, Record<string, unknown>>(
      {},
      WfmCommand.AuthGetRoles,
    );
  }

  async getRolePermissions(roleId: number) {
    return this.requestPayload<Record<string, unknown>, Record<string, unknown>>(
      { RoleId: roleId },
      WfmCommand.AuthGetRolePermissions,
    );
  }

  async upsertRole(data: Record<string, unknown>) {
    return this.requestPayload(data, WfmCommand.AuthUpsertRole);
  }

  async removeRole(roleId: number) {
    return this.requestPayload(
      { RoleId: roleId },
      WfmCommand.AuthRemoveRole,
    );
  }

  async assignPermissionsToRole(roleId: number, permissionIds: number[]) {
    return this.requestPayload(
      { RoleId: roleId, PermissionIds: permissionIds },
      WfmCommand.AuthAssignPermissionsToRole,
    );
  }

  async denyPermissionsForRole(roleId: number, permissionIds: number[]) {
    return this.requestPayload(
      { RoleId: roleId, PermissionIds: permissionIds },
      WfmCommand.AuthDenyPermissionsForRole,
    );
  }

  async removePermissionsFromRole(roleId: number, permissionIds: number[]) {
    return this.requestPayload(
      { RoleId: roleId, PermissionIds: permissionIds },
      WfmCommand.AuthRemovePermissionsFromRole,
    );
  }

  async executeProcess(processName: string, initialData: unknown) {
    return this.requestPayload(
      { ProcessName: processName, InitialData: initialData },
      WfmCommand.Execute,
      "00:02:00",
      120_000,
    );
  }

  private async requestPayload<TRequest, TResponse>(
    payload: TRequest,
    type: string,
    ttl?: string,
    timeout?: number,
  ): Promise<TResponse> {
    const response = await this.ws.sendRequest(payload, type, {
      ttl: ttl ?? "00:00:45",
      priority: "Normal",
      timeoutMs: timeout ?? 10_000,
    });
    return response.Payload as TResponse;
  }
}

export function useContourApi(): HubWsApi | null {
  const { ws, isConnected, isAuthenticated } = useWebSocket();
  const ready = Boolean(ws && isConnected && isAuthenticated);
  return useMemo(
    () => (ready && ws ? new HubWsApi(ws) : null),
    [ready, ws],
  );
}

export function useContourAuth(): HubWsApi | null {
  const { ws, isConnected } = useWebSocket();
  const ready = Boolean(ws && isConnected);
  return useMemo(
    () => (ready && ws ? new HubWsApi(ws) : null),
    [ready, ws],
  );
}
