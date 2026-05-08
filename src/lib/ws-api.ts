import { useState } from "react";
import { useWebSocket, type AuthWebSocket } from "@theborusik/ws-react";
import {
  WfmCommand,
  type AdaptersInfoResponse,
  type AdapterInfoGetAdaptersInfoWebRequest,
  type SendCommandRequest,
  type SendCommandResponse,
  type ObserverGetCommandTestCasesRequest,
  type ObserverGetCommandTestCasesResponse,
  type ObserverAddCommandTestCaseRequest,
  type ObserverRemoveCommandTestCaseRequest,
  type ObserverAddCommandTestCaseResponse,
  type ObserverRemoveCommandTestCaseResponse,
  type GetModelsResponse,
  type WfmProcessAssemblyGetModelsRequest,
  type WfmConfiguratorGetBranchesRequest,
  type WfmConfiguratorGetBranchesResponse,
  type CrudActionResponse,
  type WfmGenericCrudActionRequest,
  type WfmGenericCrudQueryPageRequest,
  type CrudQueryPageResponse,
  type WfmGenericCrudUpdateConfigTableRequest,
  type WfmGenericCrudUpdateConfigTableResponse,
  type StageContextResponse,
  type MoveProcessesResponse,
  type DeleteProcessesResponse,
  type WfmExecuteProcessRequest,
  type HubSendRawCommandRequest,
  type WfmObserverErrorsChannel,
  type WfmObserverGetErrorsRequest,
  type WfmObserverGetErrorsResponse,
  type WfmViewerGetProcessesRequest,
  type WfmViewerGetProcessesResponse,
  type WfmViewerGetProcessDetailRequest,
  type WfmViewerGetProcessDetailResponse,
  type WfmViewerGetChildProcessesRequest,
  type WfmViewerGetChildProcessesResponse,
  type WfmGetStageContextRequest,
  type WfmRestartProcessRequest,
  type WfmRestartProcessResponse,
  type WfmRestartProcessWithNewDataRequest,
  type WfmRestartProcessWithNewDataResponse,
  type WfmMoveProcessesRequest,
  type WfmDeleteProcessesRequest,
  type WfmProcessAssemblyGetRequest,
  type WfmProcessAssemblyGetResponse,
  type WfmProcessAssemblyLoadRequest,
  type WfmProcessAssemblyLoadResponse,
  type WfmProcessAssemblyCreateRequest,
  type WfmProcessAssemblyCreateResponse,
  type WfmProcessAssemblyUpsertRequest,
  type WfmProcessAssemblyUpsertResponse,
  type WfmProcessAssemblyAddGlobalModelResponse,
  type WfmProcessAssemblyGetCodeResponse,
  type WfmProcessAssemblyGetSourceResponse,
  type WfmProcessAssemblyGetDTOResponse,
  type WfmProcessAssemblyValidateCodeResponse,
  type WfmProcessAssemblyValidateResponse,
  type WfmProcessAssemblyFormatCodeResponse,
  type WfmProcessAssemblyCommitResponse,
  type WfmProcessAssemblyGetChangedModelsResponse,
  type WfmProcessAssemblyGetGlobalModelsResponse,
  type WfmProcessAssemblyRemoveDraftResponse,
  type WfmProcessAssemblyValidateGlobalModelResponse,
  type WfmConfiguratorLoadBranchRequest,
  type WfmConfiguratorLoadBranchResponse,
  type WfmConfiguratorRefreshBranchRequest,
  type WfmConfiguratorRefreshBranchResponse,
  type WfmConfiguratorUnloadBranchRequest,
  type WfmConfiguratorUnloadBranchResponse,
  type WfmGetProcessTreeRequest,
  type WfmGetProcessTreeResponse,
  type AdapterTreeNode,
  type WfmProcessAssemblyGetApiRelatedDataRequest,
  type WfmProcessAssemblyGetApiRelatedDataResponse,
  type WfmProcessAssemblyApiUpsertRequest,
  type WfmProcessAssemblyApiUpsertResponse,
  type ApiRelatedData,
  type WfmProcessAssemblyGetChangedModelsRequest,
  type WfmProcessAssemblyRemoveDraftRequest,
  type WfmProcessAssemblyGetGlobalModelsRequest,
  type WfmProcessAssemblyAddGlobalModelRequest,
  type WfmProcessAssemblyValidateGlobalModelRequest,
  type WfmProcessAssemblyGetCodeRequest,
  type WfmProcessAssemblyGetSourceRequest,
  type WfmProcessAssemblyGetDTORequest,
  type WfmProcessAssemblyGetDependenciesRequest,
  type WfmProcessAssemblyGetDependenciesResult,
  type WfmProcessAssemblySearchByDependencyRequest,
  type WfmProcessAssemblySearchByDependencyResult,
  type WfmProcessAssemblyValidateRequest,
  type WfmProcessAssemblyValidateCodeRequest,
  type WfmProcessAssemblyFormatCodeRequest,
  type WfmProcessAssemblyCommitRequest,
  type ObserverGetAdaptersHealthRequest,
  type ObserverGetAdaptersHealthResponse,
  type ObserverDeleteAdapterHealthRequest,
  type ObserverDeleteAdapterHealthResponse,
  type ObserverResendRequest,
  type ObserverResendResponse,
  type ObserverResendWithNewDataRequest,
  type ObserverResendWithNewDataResponse,
  type ObserverSendCommandResultRequest,
  type ObserverSendCommandResultResponse,
  type ObserverDeleteNotHandledRequest,
  type ObserverDeleteNotHandledResponse,
  type AuthGetPermissionTreeRequest,
  type AuthGetPermissionTreeResponse,
  type AuthGetPermissionIdRequest,
  type AuthGetPermissionIdResponse,
  type AuthGetPermissionsRequest,
  type AuthGetPermissionsResponse,
  type AuthUpsertPermissionCatalogRequest,
  type AuthUpsertPermissionCatalogResponse,
  type AuthRemovePermissionCatalogRequest,
  type AuthRemovePermissionCatalogResponse,
  type AuthUpsertPermissionRequest,
  type AuthUpsertPermissionResponse,
  type AuthRemovePermissionRequest,
  type AuthRemovePermissionResponse,
  type AuthGetRolesRequest,
  type AuthGetRolesResponse,
  type AuthGetRolePermissionsRequest,
  type AuthGetRolePermissionsResponse,
  type AuthUpsertRoleRequest,
  type AuthUpsertRoleResponse,
  type AuthRemoveRoleRequest,
  type AuthRemoveRoleResponse,
  type AuthAssignPermissionsToRoleRequest,
  type AuthAssignPermissionsToRoleResponse,
  type AuthDenyPermissionsForRoleRequest,
  type AuthDenyPermissionsForRoleResponse,
  type AuthRemovePermissionsFromRoleRequest,
  type AuthRemovePermissionsFromRoleResponse,
  type ObserverConfigAdapterTypesGetRequest,
  type ObserverConfigAdapterTypesGetResponse,
  type ObserverConfigAdapterTypeUpsertRequest,
  type ObserverConfigAdapterTypeUpsertResponse,
  type ObserverConfigAdapterTypeDeleteRequest,
  type ObserverConfigAdapterTypeDeleteResponse,
  type ObserverConfigAdapterConfigurationGetRequest,
  type ObserverConfigAdapterConfigurationGetResponse,
  type ObserverConfigAdapterConfigurationCreateRequest,
  type ObserverConfigAdapterConfigurationCreateResponse,
  type ObserverConfigAdapterConfigurationCreateBaseFrontRequest,
  type ObserverConfigAdapterConfigurationCreateBaseFrontResponse,
  type ObserverConfigAdapterConfigurationCreateBaseBackRequest,
  type ObserverConfigAdapterConfigurationCreateBaseBackResponse,
  type ObserverConfigAdapterConfigurationCloneResponse,
  type ObserverConfigAdapterConfigurationCloneInheritedResponse,
  type ObserverConfigAdapterConfigurationUpdateResponse,
  type ObserverConfigAdapterConfigurationCloneRequest,
  type ObserverConfigAdapterConfigurationCloneInheritedRequest,
  type ObserverConfigAdapterConfigurationUpdateRequest,
  type ObserverConfigAdapterConfigurationSetDefaultRequest,
  type ObserverConfigAdapterConfigurationSetDefaultResponse,
  type ObserverConfigAdapterConfigurationDeleteRequest,
  type ObserverConfigAdapterConfigurationDeleteResponse,
  type ObserverConfigSectionGetRequest,
  type ObserverConfigSectionGetResponse,
  type ObserverConfigSectionGetBaseRequest,
  type ObserverConfigSectionGetBaseResponse,
  type ObserverConfigSectionCreateRequest,
  type ObserverConfigSectionCreateResponse,
  type ObserverConfigSectionUpdateRequest,
  type ObserverConfigSectionUpdateResponse,
  type ObserverConfigSectionDeleteRequest,
  type ObserverConfigSectionDeleteResponse,
  type ObserverConfigGetCompletedSectionDataRequest,
  type ObserverConfigGetCompletedSectionDataResponse,
  type ObserverConfigGetConfigurationByAdapterRequest,
  type ObserverConfigGetConfigurationResponse,
  type ObserverConfigExportRequest,
  type ObserverConfigExportResponse,
  type ObserverConfigImportRequest,
  type ObserverConfigImportResponse,
  type ObserverConfigTableGetAllTablesRequest,
  type ObserverConfigTableGetAllTablesResponse,
  type ObserverConfigTableGetMetaRequest,
  type ObserverConfigTableGetMetaResponse,
  type ObserverConfigTableGetRequest,
  type ObserverConfigTableGetResponse,
  type ObserverConfigTableUpsertRequest,
  type ObserverConfigTableUpsertResponse,
  type ObserverConfigTableDeleteRequest,
  type ObserverConfigTableDeleteResponse,
} from "./ws-api-models";

interface ExecuteAdapter {
  AdapterName: string;
  Level: string;
  AdapterType: string;
}

export class HubWsApi {
  constructor(private readonly ws: AuthWebSocket) {}

  private wfmExecuteAdapter: ExecuteAdapter | null = null;

  async login(login: string, password: string) {
    return this.ws.login(login, password);
  }

  async logout() {
    return this.ws.logout();
  }

  async getAdaptersInfo(request: AdapterInfoGetAdaptersInfoWebRequest = {}) {
    return this.requestPayload<AdapterInfoGetAdaptersInfoWebRequest, AdaptersInfoResponse>(
      request,
      WfmCommand.GetAdaptersInfo,
    );
  }

  async sendCommand(request: SendCommandRequest) {
    return this.requestPayload<SendCommandRequest, SendCommandResponse>(
      request,
      WfmCommand.SendCommand,
      request.Ttl ?? "00:00:45",
    );
  }

  async sendRawCommand(request: HubSendRawCommandRequest) {
    const payload = { ...request.Envelope, CommandBody: request.CommandBody };
    const ttl =
      request.TtlOverride ?? String((request.Envelope as { Ttl?: string }).Ttl ?? "00:00:15");
    const response = await this.ws.sendRequest(payload, WfmCommand.SendCommand, {
      ttl,
      priority: "Normal",
      timeoutMs: 120_000,
    });
    return response.Payload as Record<string, unknown>;
  }

  async getCommandTestCases(request: ObserverGetCommandTestCasesRequest) {
    return this.requestPayload<ObserverGetCommandTestCasesRequest, ObserverGetCommandTestCasesResponse>(
      request,
      WfmCommand.GetCommandTestCases,
    );
  }

  async addCommandTestCase(request: ObserverAddCommandTestCaseRequest) {
    return this.requestPayload<ObserverAddCommandTestCaseRequest, ObserverAddCommandTestCaseResponse>(
      request,
      WfmCommand.AddCommandTestCase,
    );
  }

  async removeCommandTestCase(request: ObserverRemoveCommandTestCaseRequest) {
    return this.requestPayload<ObserverRemoveCommandTestCaseRequest, ObserverRemoveCommandTestCaseResponse>(
      request,
      WfmCommand.RemoveCommandTestCase,
    );
  }

  async getProcessModels(request: WfmProcessAssemblyGetModelsRequest = {}) {
    return this.requestPayload<WfmProcessAssemblyGetModelsRequest, GetModelsResponse>(
      request,
      WfmCommand.GetModels,
    );
  }

  async getProcessTree(request: WfmGetProcessTreeRequest = {}) {
    return this.requestPayload<WfmGetProcessTreeRequest, WfmGetProcessTreeResponse>(
      request,
      WfmCommand.GetProcessTree,
      "00:00:30",
    );
  }

  async getBranches(request: WfmConfiguratorGetBranchesRequest = {}) {
    return this.requestPayload<WfmConfiguratorGetBranchesRequest, WfmConfiguratorGetBranchesResponse>(
      request,
      WfmCommand.GetBranches,
    );
  }

  /** Универсальный `GenericCRUD.Action` — единственная точка для list/get/add/update/delete по модели. */
  async genericCrudAction(request: WfmGenericCrudActionRequest) {
    return this.requestPayload<WfmGenericCrudActionRequest, CrudActionResponse>(
      request,
      WfmCommand.GenericCrudAction,
      "00:00:30",
    );
  }

  /** Server-side paginated query with transparent search/sort. */
  async genericCrudQueryPage(request: WfmGenericCrudQueryPageRequest) {
    return this.requestPayload<WfmGenericCrudQueryPageRequest, CrudQueryPageResponse>(
      request,
      WfmCommand.GenericCrudQueryPage,
      "00:00:30",
    );
  }

  async updateConfigTable(request: WfmGenericCrudUpdateConfigTableRequest={}) {
    return this.requestPayload<WfmGenericCrudUpdateConfigTableRequest, WfmGenericCrudUpdateConfigTableResponse>(
      request,
      WfmCommand.UpdateConfigTable,
    );
  }

  // --- Viewer ---

  async getProcesses(request: WfmViewerGetProcessesRequest) {
    const commands = {
      completed: WfmCommand.GetCompletedProcesses,
      manual: WfmCommand.GetManualProcesses,
      idle: WfmCommand.GetIdleProcesses,
    } as const;
    const { Tab, ...rest } = request;
    return this.requestPayload<
      Omit<WfmViewerGetProcessesRequest, "Tab">,
      WfmViewerGetProcessesResponse
    >(rest, commands[Tab]);
  }

  async getProcessDetail(request: WfmViewerGetProcessDetailRequest) {
    const commands = {
      completed: WfmCommand.GetCompletedProcessDetail,
      manual: WfmCommand.GetManualProcessDetail,
      idle: WfmCommand.GetIdleProcessDetail,
    } as const;
    const { Tab, ...rest } = request;
    return this.requestPayload<
      Omit<WfmViewerGetProcessDetailRequest, "Tab">,
      WfmViewerGetProcessDetailResponse
    >(rest, commands[Tab], "00:00:30");
  }

  async getChildProcesses(request: WfmViewerGetChildProcessesRequest) {
    const commands = {
      completed: WfmCommand.GetCompletedChildsProcessDetail,
      manual: WfmCommand.GetManualChildsProcessDetail,
      idle: WfmCommand.GetIdleChildsProcessDetail,
    } as const;
    const { Tab, ...rest } = request;
    return this.requestPayload<
      Omit<WfmViewerGetChildProcessesRequest, "Tab">,
      WfmViewerGetChildProcessesResponse
    >(rest, commands[Tab]);
  }

  async getStageContext(request: WfmGetStageContextRequest) {
    return this.requestPayload<WfmGetStageContextRequest, StageContextResponse>(request, WfmCommand.GetStageContext);
  }

  async restartProcess(request: WfmRestartProcessRequest) {
    return this.requestPayload<WfmRestartProcessRequest, WfmRestartProcessResponse>(
      request,
      WfmCommand.RestartProcess,
      "00:00:30",
    );
  }

  async restartProcessWithNewData(request: WfmRestartProcessWithNewDataRequest) {
    return this.requestPayload<WfmRestartProcessWithNewDataRequest, WfmRestartProcessWithNewDataResponse>(
      request,
      WfmCommand.RestartProcessWithNewData,
      "00:00:30",
    );
  }

  async moveToCompleted(request: WfmMoveProcessesRequest) {
    return this.requestPayload<WfmMoveProcessesRequest, MoveProcessesResponse>(request, WfmCommand.MoveToCompleted);
  }

  async moveFromCompleted(request: WfmMoveProcessesRequest) {
    return this.requestPayload<WfmMoveProcessesRequest, MoveProcessesResponse>(request, WfmCommand.MoveFromCompleted);
  }

  async deleteProcesses(request: WfmDeleteProcessesRequest) {
    return this.requestPayload<WfmDeleteProcessesRequest, DeleteProcessesResponse>(
      request,
      WfmCommand.DeleteProcesses,
      "00:00:30",
    );
  }

  // --- System: Adapters Health ---

  async getAdaptersHealth(request: ObserverGetAdaptersHealthRequest = {}) {
    return this.requestPayload<ObserverGetAdaptersHealthRequest, ObserverGetAdaptersHealthResponse>(
      request,
      WfmCommand.ObserverAdaptersHealthGet,
    );
  }

  async deleteAdapterHealth(request: ObserverDeleteAdapterHealthRequest) {
    return this.requestPayload<ObserverDeleteAdapterHealthRequest, ObserverDeleteAdapterHealthResponse>(
      request,
      WfmCommand.ObserverAdapterHealthDelete,
    );
  }

  // --- System: Adapter Configuration ---

  async getAdapterTypes(request: ObserverConfigAdapterTypesGetRequest = {}) {
    return this.requestPayload<ObserverConfigAdapterTypesGetRequest, ObserverConfigAdapterTypesGetResponse>(
      request,
      WfmCommand.ConfigAdapterTypesGet,
    );
  }

  async upsertAdapterType(request: ObserverConfigAdapterTypeUpsertRequest) {
    return this.requestPayload<ObserverConfigAdapterTypeUpsertRequest, ObserverConfigAdapterTypeUpsertResponse>(
      request,
      WfmCommand.ConfigAdapterTypeUpsert,
    );
  }

  async deleteAdapterType(request: ObserverConfigAdapterTypeDeleteRequest) {
    return this.requestPayload<ObserverConfigAdapterTypeDeleteRequest, ObserverConfigAdapterTypeDeleteResponse>(
      request,
      WfmCommand.ConfigAdapterTypeDelete,
    );
  }

  async getAdapterConfigurations(request: ObserverConfigAdapterConfigurationGetRequest) {
    return this.requestPayload<
      ObserverConfigAdapterConfigurationGetRequest,
      ObserverConfigAdapterConfigurationGetResponse
    >(request, WfmCommand.ConfigAdapterConfigurationGet);
  }

  async createAdapterConfiguration(request: ObserverConfigAdapterConfigurationCreateRequest) {
    return this.requestPayload<
      ObserverConfigAdapterConfigurationCreateRequest,
      ObserverConfigAdapterConfigurationCreateResponse
    >(request, WfmCommand.ConfigAdapterConfigurationCreate);
  }

  async createBaseBackConfiguration(request: ObserverConfigAdapterConfigurationCreateBaseBackRequest) {
    return this.requestPayload<
      ObserverConfigAdapterConfigurationCreateBaseBackRequest,
      ObserverConfigAdapterConfigurationCreateBaseBackResponse
    >(request, WfmCommand.ConfigAdapterConfigurationCreateBaseBack);
  }

  async createBaseFrontConfiguration(request: ObserverConfigAdapterConfigurationCreateBaseFrontRequest) {
    return this.requestPayload<
      ObserverConfigAdapterConfigurationCreateBaseFrontRequest,
      ObserverConfigAdapterConfigurationCreateBaseFrontResponse
    >(request, WfmCommand.ConfigAdapterConfigurationCreateBaseFront);
  }

  async cloneConfiguration(request: ObserverConfigAdapterConfigurationCloneRequest) {
    return this.requestPayload<
      ObserverConfigAdapterConfigurationCloneRequest,
      ObserverConfigAdapterConfigurationCloneResponse
    >(request, WfmCommand.ConfigAdapterConfigurationClone);
  }

  async cloneInheritedConfiguration(request: ObserverConfigAdapterConfigurationCloneInheritedRequest) {
    return this.requestPayload<
      ObserverConfigAdapterConfigurationCloneInheritedRequest,
      ObserverConfigAdapterConfigurationCloneInheritedResponse
    >(request, WfmCommand.ConfigAdapterConfigurationCloneInherited);
  }

  async updateAdapterConfiguration(request: ObserverConfigAdapterConfigurationUpdateRequest) {
    return this.requestPayload<
      ObserverConfigAdapterConfigurationUpdateRequest,
      ObserverConfigAdapterConfigurationUpdateResponse
    >(request, WfmCommand.ConfigAdapterConfigurationUpdate);
  }

  async setDefaultConfiguration(request: ObserverConfigAdapterConfigurationSetDefaultRequest) {
    return this.requestPayload<
      ObserverConfigAdapterConfigurationSetDefaultRequest,
      ObserverConfigAdapterConfigurationSetDefaultResponse
    >(request, WfmCommand.ConfigAdapterConfigurationSetDefault);
  }

  async deleteAdapterConfiguration(request: ObserverConfigAdapterConfigurationDeleteRequest) {
    return this.requestPayload<
      ObserverConfigAdapterConfigurationDeleteRequest,
      ObserverConfigAdapterConfigurationDeleteResponse
    >(request, WfmCommand.ConfigAdapterConfigurationDelete);
  }

  // --- System: Sections ---

  async getSections(request: ObserverConfigSectionGetRequest) {
    return this.requestPayload<ObserverConfigSectionGetRequest, ObserverConfigSectionGetResponse>(
      request,
      WfmCommand.ConfigSectionGet,
    );
  }

  async getBaseSections(request: ObserverConfigSectionGetBaseRequest = {}) {
    return this.requestPayload<ObserverConfigSectionGetBaseRequest, ObserverConfigSectionGetBaseResponse>(
      request,
      WfmCommand.ConfigSectionBaseGet,
    );
  }

  async createSection(request: ObserverConfigSectionCreateRequest) {
    return this.requestPayload<ObserverConfigSectionCreateRequest, ObserverConfigSectionCreateResponse>(
      request,
      WfmCommand.ConfigSectionCreate,
    );
  }

  async updateSection(request: ObserverConfigSectionUpdateRequest) {
    return this.requestPayload<ObserverConfigSectionUpdateRequest, ObserverConfigSectionUpdateResponse>(
      request,
      WfmCommand.ConfigSectionUpdate,
    );
  }

  async deleteSection(request: ObserverConfigSectionDeleteRequest) {
    return this.requestPayload<ObserverConfigSectionDeleteRequest, ObserverConfigSectionDeleteResponse>(
      request,
      WfmCommand.ConfigSectionDelete,
    );
  }

  async getCompletedSectionData(request: ObserverConfigGetCompletedSectionDataRequest) {
    return this.requestPayload<
      ObserverConfigGetCompletedSectionDataRequest,
      ObserverConfigGetCompletedSectionDataResponse
    >(request, WfmCommand.ConfigCompletedSectionDataGet);
  }

  async getFullConfiguration(request: ObserverConfigGetConfigurationByAdapterRequest) {
    return this.requestPayload<
      ObserverConfigGetConfigurationByAdapterRequest,
      ObserverConfigGetConfigurationResponse
    >(request, WfmCommand.ConfigConfigurationGet);
  }

  async exportConfig(request: ObserverConfigExportRequest) {
    return this.requestPayload<ObserverConfigExportRequest, ObserverConfigExportResponse>(
      request,
      WfmCommand.ConfigExport,
    );
  }

  async importConfig(request: ObserverConfigImportRequest) {
    return this.requestPayload<ObserverConfigImportRequest, ObserverConfigImportResponse>(
      request,
      WfmCommand.ConfigImport,
    );
  }

  // --- System: Tables ---

  async getAllTables(request: ObserverConfigTableGetAllTablesRequest = {}) {
    return this.requestPayload<ObserverConfigTableGetAllTablesRequest, ObserverConfigTableGetAllTablesResponse>(
      request,
      WfmCommand.ConfigTableGetAll,
    );
  }

  async getTableMeta(request: ObserverConfigTableGetMetaRequest) {
    return this.requestPayload<ObserverConfigTableGetMetaRequest, ObserverConfigTableGetMetaResponse>(
      request,
      WfmCommand.ConfigTableGetMeta,
    );
  }

  async getTableData(request: ObserverConfigTableGetRequest) {
    return this.requestPayload<ObserverConfigTableGetRequest, ObserverConfigTableGetResponse>(
      request,
      WfmCommand.ConfigTableGet,
    );
  }

  async upsertTableData(request: ObserverConfigTableUpsertRequest) {
    return this.requestPayload<ObserverConfigTableUpsertRequest, ObserverConfigTableUpsertResponse>(
      request,
      WfmCommand.ConfigTableUpsert,
    );
  }

  async deleteTableData(request: ObserverConfigTableDeleteRequest) {
    return this.requestPayload<ObserverConfigTableDeleteRequest, ObserverConfigTableDeleteResponse>(
      request,
      WfmCommand.ConfigTableDelete,
    );
  }

  // --- System: Errors ---

  async getErrors(request: WfmObserverGetErrorsRequest) {
    const commandMap: Record<WfmObserverErrorsChannel, string> = {
      wfm: WfmCommand.ObserverWfmErrorsGet,
      command: WfmCommand.ObserverCommandErrorsGet,
      event: WfmCommand.ObserverEventErrorsGet,
      result: WfmCommand.ObserverCommandResultErrorsGet,
      other: WfmCommand.ObserverOtherErrorsGet,
    };
    const { Channel, ...rest } = request;
    const cmd = commandMap[Channel] ?? WfmCommand.ObserverWfmErrorsGet;
    return this.requestPayload<Omit<WfmObserverGetErrorsRequest, "Channel">, WfmObserverGetErrorsResponse>(
      rest,
      cmd,
      "00:00:30",
    );
  }

  async resendError(request: ObserverResendRequest) {
    return this.requestPayload<ObserverResendRequest, ObserverResendResponse>(request, WfmCommand.ObserverResend);
  }

  async resendWithNewData(request: ObserverResendWithNewDataRequest) {
    return this.requestPayload<ObserverResendWithNewDataRequest, ObserverResendWithNewDataResponse>(
      request,
      WfmCommand.ObserverResendWithNewData,
    );
  }

  async sendCommandResult(request: ObserverSendCommandResultRequest) {
    return this.requestPayload<ObserverSendCommandResultRequest, ObserverSendCommandResultResponse>(
      request,
      WfmCommand.ObserverSendCommandResult,
    );
  }

  async deleteNotHandled(request: ObserverDeleteNotHandledRequest) {
    return this.requestPayload<ObserverDeleteNotHandledRequest, ObserverDeleteNotHandledResponse>(
      request,
      WfmCommand.ObserverDeleteNotHandled,
    );
  }

  // --- System: Permissions ---

  async getPermissionTree(request: AuthGetPermissionTreeRequest = {}) {
    return this.requestPayload<AuthGetPermissionTreeRequest, AuthGetPermissionTreeResponse>(
      request,
      WfmCommand.AuthGetPermissionTree,
    );
  }

  async getPermissionId(request: AuthGetPermissionIdRequest = {}) {
    return this.requestPayload<AuthGetPermissionIdRequest, AuthGetPermissionIdResponse>(
      request,
      WfmCommand.AuthGetPermissionId,
    );
  }

  async getAllPermissions(request: AuthGetPermissionsRequest = {}) {
    return this.requestPayload<AuthGetPermissionsRequest, AuthGetPermissionsResponse>(
      request,
      WfmCommand.AuthGetPermissions,
    );
  }

  async upsertPermissionCatalog(request: AuthUpsertPermissionCatalogRequest) {
    return this.requestPayload<AuthUpsertPermissionCatalogRequest, AuthUpsertPermissionCatalogResponse>(
      request,
      WfmCommand.AuthUpsertPermissionCatalog,
    );
  }

  async removePermissionCatalog(request: AuthRemovePermissionCatalogRequest) {
    return this.requestPayload<AuthRemovePermissionCatalogRequest, AuthRemovePermissionCatalogResponse>(
      request,
      WfmCommand.AuthRemovePermissionCatalog,
    );
  }

  async upsertPermission(request: AuthUpsertPermissionRequest) {
    return this.requestPayload<AuthUpsertPermissionRequest, AuthUpsertPermissionResponse>(
      request,
      WfmCommand.AuthUpsertPermission,
    );
  }

  async removePermission(request: AuthRemovePermissionRequest) {
    return this.requestPayload<AuthRemovePermissionRequest, AuthRemovePermissionResponse>(
      request,
      WfmCommand.AuthRemovePermission,
    );
  }

  // --- System: Roles ---

  async getRoles(request: AuthGetRolesRequest = {}) {
    return this.requestPayload<AuthGetRolesRequest, AuthGetRolesResponse>(request, WfmCommand.AuthGetRoles);
  }

  async getRolePermissions(request: AuthGetRolePermissionsRequest) {
    return this.requestPayload<AuthGetRolePermissionsRequest, AuthGetRolePermissionsResponse>(
      request,
      WfmCommand.AuthGetRolePermissions,
    );
  }

  async upsertRole(request: AuthUpsertRoleRequest) {
    return this.requestPayload<AuthUpsertRoleRequest, AuthUpsertRoleResponse>(request, WfmCommand.AuthUpsertRole);
  }

  async removeRole(request: AuthRemoveRoleRequest) {
    return this.requestPayload<AuthRemoveRoleRequest, AuthRemoveRoleResponse>(request, WfmCommand.AuthRemoveRole);
  }

  async assignPermissionsToRole(request: AuthAssignPermissionsToRoleRequest) {
    return this.requestPayload<AuthAssignPermissionsToRoleRequest, AuthAssignPermissionsToRoleResponse>(
      request,
      WfmCommand.AuthAssignPermissionsToRole,
    );
  }

  async denyPermissionsForRole(request: AuthDenyPermissionsForRoleRequest) {
    return this.requestPayload<AuthDenyPermissionsForRoleRequest, AuthDenyPermissionsForRoleResponse>(
      request,
      WfmCommand.AuthDenyPermissionsForRole,
    );
  }

  async removePermissionsFromRole(request: AuthRemovePermissionsFromRoleRequest) {
    return this.requestPayload<AuthRemovePermissionsFromRoleRequest, AuthRemovePermissionsFromRoleResponse>(
      request,
      WfmCommand.AuthRemovePermissionsFromRole,
    );
  }

  // --- Configurator: Process Assembly ---

  async getProcessAssembly(request: WfmProcessAssemblyGetRequest) {
    return this.requestPayload<WfmProcessAssemblyGetRequest, WfmProcessAssemblyGetResponse>(
      request,
      WfmCommand.GetProcessAssembly,
      "00:00:30",
    );
  }

  async loadProcessAssembly(request: WfmProcessAssemblyLoadRequest) {
    return this.requestPayload<WfmProcessAssemblyLoadRequest, WfmProcessAssemblyLoadResponse>(
      request,
      WfmCommand.LoadProcessAssembly,
      "00:00:30",
    );
  }

  async createProcessAssembly(request: WfmProcessAssemblyCreateRequest) {
    return this.requestPayload<WfmProcessAssemblyCreateRequest, WfmProcessAssemblyCreateResponse>(
      request,
      WfmCommand.Create,
      "00:01:00",
      60_000,
    );
  }

  async upsertProcessAssembly(request: WfmProcessAssemblyUpsertRequest) {
    return this.requestPayload<WfmProcessAssemblyUpsertRequest, WfmProcessAssemblyUpsertResponse>(
      request,
      WfmCommand.Upsert,
      "00:01:00",
      60_000,
    );
  }

  // --- WFM API permission editor (Edit API dialog) ---

  /**
   * Запросить контекст для `EditApiDialog` по процессу:
   * доступные роли, уже назначенные, текущие Command/Result DTO и пр.
   * Порт `WfmService.getApiRelatedData` из old-admin.
   */
  async getApiRelatedData(request: WfmProcessAssemblyGetApiRelatedDataRequest): Promise<ApiRelatedData> {
    return this.requestPayload<WfmProcessAssemblyGetApiRelatedDataRequest, WfmProcessAssemblyGetApiRelatedDataResponse>(
      request,
      WfmCommand.GetApiRelatedData,
      "00:00:30",
    );
  }

  /**
   * Сохранить настройки API для процесса: Roles (имена), Command/Result DTO,
   * handler-тип, SaveManual/SaveCompleted.
   * Порт `WfmService.upsertApi` из old-admin.
   */
  async upsertApi(request: WfmProcessAssemblyApiUpsertRequest): Promise<WfmProcessAssemblyApiUpsertResponse> {
    return this.requestPayload<WfmProcessAssemblyApiUpsertRequest, WfmProcessAssemblyApiUpsertResponse>(
      request,
      WfmCommand.ApiUpsert,
      "00:01:00",
      60_000,
    );
  }

  async getProcessCode(request: WfmProcessAssemblyGetCodeRequest) {
    return this.requestPayload<WfmProcessAssemblyGetCodeRequest, WfmProcessAssemblyGetCodeResponse>(
      request,
      WfmCommand.GetCode,
      "00:01:00",
      60_000,
    );
  }

  async getProcessSource(request: WfmProcessAssemblyGetSourceRequest) {
    return this.requestPayload<WfmProcessAssemblyGetSourceRequest, WfmProcessAssemblyGetSourceResponse>(
      request,
      WfmCommand.GetProcessAssemblySource,
      "00:00:30",
    );
  }

  async getProcessDTO(request: WfmProcessAssemblyGetDTORequest) {
    return this.requestPayload<WfmProcessAssemblyGetDTORequest, WfmProcessAssemblyGetDTOResponse>(
      request,
      WfmCommand.GetDTO,
      "00:00:30",
    );
  }

  async getProcessDependencies(request: WfmProcessAssemblyGetDependenciesRequest) {
    return this.requestPayload<WfmProcessAssemblyGetDependenciesRequest, WfmProcessAssemblyGetDependenciesResult>(
      request,
      WfmCommand.GetProcessDependencies,
      "00:00:30",
    );
  }

  async searchProcessesByDependency(request: WfmProcessAssemblySearchByDependencyRequest) {
    return this.requestPayload<WfmProcessAssemblySearchByDependencyRequest, WfmProcessAssemblySearchByDependencyResult>(
      request,
      WfmCommand.SearchProcessesByDependency,
      "00:00:30",
    );
  }

  async validateProcess(request: WfmProcessAssemblyValidateRequest) {
    return this.requestPayload<WfmProcessAssemblyValidateRequest, WfmProcessAssemblyValidateResponse>(
      request,
      WfmCommand.Validate,
      "00:01:00",
      60_000,
    );
  }

  async validateCode(request: WfmProcessAssemblyValidateCodeRequest) {
    return this.requestPayload<WfmProcessAssemblyValidateCodeRequest, WfmProcessAssemblyValidateCodeResponse>(
      request,
      WfmCommand.ValidateCode,
      "00:00:30",
    );
  }

  async formatCode(request: WfmProcessAssemblyFormatCodeRequest) {
    return this.requestPayload<WfmProcessAssemblyFormatCodeRequest, WfmProcessAssemblyFormatCodeResponse>(
      request,
      WfmCommand.FormatCode,
      "00:00:30",
    );
  }

  async commitProcessAssembly(request: WfmProcessAssemblyCommitRequest) {
    return this.requestPayload<WfmProcessAssemblyCommitRequest, WfmProcessAssemblyCommitResponse>(
      request,
      WfmCommand.Commit,
      "00:01:00",
      60_000,
    );
  }

  async getChangedModels(request: WfmProcessAssemblyGetChangedModelsRequest = {}) {
    return this.requestPayload<WfmProcessAssemblyGetChangedModelsRequest, WfmProcessAssemblyGetChangedModelsResponse>(
      request,
      WfmCommand.GetChangedModels,
    );
  }

  async removeDraft(request: WfmProcessAssemblyRemoveDraftRequest) {
    return this.requestPayload<WfmProcessAssemblyRemoveDraftRequest, WfmProcessAssemblyRemoveDraftResponse>(
      request,
      WfmCommand.RemoveDraft,
    );
  }

  async getGlobalModels(request: WfmProcessAssemblyGetGlobalModelsRequest = {}) {
    return this.requestPayload<WfmProcessAssemblyGetGlobalModelsRequest, WfmProcessAssemblyGetGlobalModelsResponse>(
      request,
      WfmCommand.GetGlobalModels,
    );
  }

  async addGlobalModel(request: WfmProcessAssemblyAddGlobalModelRequest) {
    return this.requestPayload<WfmProcessAssemblyAddGlobalModelRequest, WfmProcessAssemblyAddGlobalModelResponse>(
      request,
      WfmCommand.AddGlobalModel,
      "00:00:30",
    );
  }

  async validateGlobalModel(request: WfmProcessAssemblyValidateGlobalModelRequest) {
    return this.requestPayload<WfmProcessAssemblyValidateGlobalModelRequest, WfmProcessAssemblyValidateGlobalModelResponse>(
      request,
      WfmCommand.ValidateGlobalModel,
      "00:00:30",
    );
  }

  // --- Configurator: Branch ---

  async loadBranch(request: WfmConfiguratorLoadBranchRequest) {
    return this.requestPayload<WfmConfiguratorLoadBranchRequest, WfmConfiguratorLoadBranchResponse>(
      request,
      WfmCommand.LoadBranch,
      "00:02:00",
      120_000,
    );
  }

  async refreshBranch(request: WfmConfiguratorRefreshBranchRequest = {}) {
    return this.requestPayload<WfmConfiguratorRefreshBranchRequest, WfmConfiguratorRefreshBranchResponse>(
      request,
      WfmCommand.RefreshBranch,
      "00:02:00",
      120_000,
    );
  }

  async unloadBranch(request: WfmConfiguratorUnloadBranchRequest) {
    return this.requestPayload<WfmConfiguratorUnloadBranchRequest, WfmConfiguratorUnloadBranchResponse>(
      request,
      WfmCommand.UnloadBranch,
    );
  }

  async executeProcess(request: WfmExecuteProcessRequest) {
    const adp = await this.resolveWfmExecuteAdapter();
    const body = JSON.stringify({
      ProcessName: request.ProcessName,
      InitialData: request.InitialData ?? {},
      SaveCompleted: request.SaveCompleted ?? true,
      SaveManual: request.SaveManual ?? true,
    });
    return this.sendRawCommand({
      Envelope: {
        Level: adp.Level,
        AdapterName: adp.AdapterName,
        AdapterType: adp.AdapterType,
        CommandName: "WFM.Execute",
        SessionFields: {},
        CreateNewSession: true,
        Ttl: "00:02:00",
      },
      CommandBody: body,
      TtlOverride: "00:02:00",
    });
  }

  private async resolveWfmExecuteAdapter(): Promise<ExecuteAdapter> {
    if (this.wfmExecuteAdapter) return this.wfmExecuteAdapter;
    const info = await this.getAdaptersInfo({});
    let found: ExecuteAdapter | null = null;
    const walk = (nodes: AdapterTreeNode[]) => {
      for (const n of nodes) {
        if (found) return;
        if (n.type === "command" && n.data?.CommandName === "WFM.Execute") {
          found = {
            AdapterName: n.data.AdapterName,
            Level: n.data.Level,
            AdapterType: n.data.AdapterType,
          };
          return;
        }
        if (n.nodes) walk(n.nodes);
      }
    };
    walk(info.Adapters ?? []);
    if (!found) {
      throw new Error("Command 'WFM.Execute' not found in adapters info.");
    }
    this.wfmExecuteAdapter = found;
    return found;
  }

  private async requestPayload<TRequest, TResponse extends object>(
    payload: TRequest,
    type: string,
    ttl?: string,
    timeout?: number,
  ): Promise<TResponse> {
    const response = await this.ws.sendRequest<TRequest, TResponse>(payload, type, {
      ttl: ttl ?? "00:00:45",
      priority: "Normal",
      timeoutMs: timeout ?? 10_000,
    });
    return response.Payload;
  }
}

/**
 * API-клиент для текущего контура.
 *
 * Возвращает:
 *   - `HubWsApi` когда `isConnected && isAuthenticated`;
 *   - **последний известный** `HubWsApi` во время временных потерь
 *     (`isConnected=false` при reconnect или `isAuthenticated=false` при
 *     reauth) — чтобы компоненты не размонтировались из-за `api === null`.
 *     Вызовы на таком api будут падать с "WebSocket not connected" —
 *     consumer'ы должны сами решать, что делать. WebSocketOverlays поверх
 *     приложения в это время не даёт пользователю кликать.
 *   - `null` только если ws ещё **никогда** не был готов (первый mount
 *     провайдера).
 *
 * Реализация: храним `{ api, ws }` в useState и обновляем его синхронно
 * в рендере (derived state pattern), только когда ws-ссылка поменялась
 * и находимся в ready-состоянии. В обычных потерях isAuthenticated=false
 * ссылка ws та же → api не пересоздаётся и возвращается старый, а
 * компоненты в дереве не видят api=null.
 */
export function useContourApi(): HubWsApi | null {
  const { ws, isConnected, isAuthenticated } = useWebSocket();
  const ready = Boolean(ws && isConnected && isAuthenticated);
  const [cache, setCache] = useState<{ ws: AuthWebSocket; api: HubWsApi } | null>(null);

  // Derived state on prop change: при появлении нового ws (контур сменился
  // или первый ready после mount) — синхронно пересоздаём api и кэшируем.
  if (ready && ws && cache?.ws !== ws) {
    setCache({ ws, api: new HubWsApi(ws) });
  }

  return cache?.api ?? null;
}

/**
 * API для неавторизованных вызовов (login/logout). В отличие от
 * `useContourApi`, не требует `isAuthenticated`, но всё ещё ждёт
 * `isConnected` — без сокета login невозможен.
 *
 * Эта обёртка всегда возвращает свежий api, чтобы login/logout работали
 * только когда сокет реально открыт.
 */
export function useContourAuth(): HubWsApi | null {
  const { ws, isConnected } = useWebSocket();
  const [cache, setCache] = useState<{ ws: AuthWebSocket; api: HubWsApi } | null>(null);

  if (isConnected && ws && cache?.ws !== ws) {
    setCache({ ws, api: new HubWsApi(ws) });
  }
  if (!isConnected && cache) {
    setCache(null);
  }

  return cache?.api ?? null;
}
