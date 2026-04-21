import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Group, Panel } from "react-resizable-panels";
import { AlertCircle, CheckCircle2, FileJson2, Wand2 } from "lucide-react";
import type { HubWsApi } from "@/lib/ws-api";
import type {
  ApiHandlerType,
  ApiRoleInfo,
  ApiUpsertPayload,
} from "@/lib/ws-api-models";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { FormRow } from "@/components/ui/FormRow";
import type { CodeEditorMarker } from "@/components/ui/CodeEditor";
import { EditorPanel } from "@/components/ui/EditorPanel";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { useAutoSaveLayout } from "@/hooks/useAutoSaveLayout";
import { useHotkey } from "@/hooks/useHotkey";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/providers/ToastProvider";
import { useNotifications } from "@/providers/NotificationsProvider";
import { t } from "@/lib/design-tokens";
import { RoleMultiSelect } from "./RoleMultiSelect";

export interface EditApiDialogProps {
  api: HubWsApi;
  /** Значение `[Process("…")]` (used as MethodName). */
  processName: string;
  /** C# class name. */
  processTypeName: string;
  onClose: () => void;
  /** Вызывается после успешного сохранения (например, для refresh списка). */
  onSaved?: () => void;
}

const HANDLER_TYPES: ApiHandlerType[] = ["Sync", "Async", "Execute"];

const DEFAULT_COMMAND_DTO = JSON.stringify(
  [{ Name: "Name", Type: "string", IsRequired: true }],
  null,
  2,
);

const DEFAULT_RESULT_DTO = JSON.stringify(
  [{ Name: "Result", Type: "object", Properties: [{ Name: "Success", Type: "boolean" }] }],
  null,
  2,
);

interface JsonState {
  text: string;
  parsed: unknown;
  error: { message: string; line: number; column: number } | null;
}

function parseJsonState(text: string): JsonState {
  if (!text.trim()) {
    return { text, parsed: null, error: null };
  }
  try {
    return { text, parsed: JSON.parse(text), error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Попытка выдернуть "position N" из нативной ошибки V8
    // и перевести её в строку/колонку — для декоративного маркера.
    const posMatch = /position (\d+)/.exec(message);
    let line = 1;
    let column = 1;
    if (posMatch) {
      const pos = Number(posMatch[1]);
      const before = text.slice(0, pos);
      const lastNl = before.lastIndexOf("\n");
      line = before.split("\n").length;
      column = lastNl === -1 ? pos + 1 : pos - lastNl;
    }
    return { text, parsed: null, error: { message, line, column } };
  }
}

function stringifyForInitial(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string") {
    // Старый бек мог прислать уже строку — попробуем её распарсить,
    // чтобы форматировать красиво; если не вышло — покажем как есть.
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
}

/**
 * Редактор WFM API permission для процесса.
 *
 * Порт `EditApiDialogComponent` из old-admin
 * (`configurator/process/edit-api-dialog/`). Визуально перекроен под
 * стилистику hub / VS Code:
 *   - <Modal size="xl"> с focus-trap, Esc, return focus;
 *   - Dirty guard на Esc/backdrop → нативный <ConfirmDialog>;
 *   - Handler Type как select, Save Manual / Save Completed как <Toggle>;
 *   - Roles — <RoleMultiSelect> (chips + dropdown picker);
 *   - Command/Result DTO — два <CodeEditor language="json" theme="hub-dark">
 *     в горизонтальном react-resizable-panels Group с живой JSON-валидацией
 *     через `markers` (ошибка подсвечивается по строке/колонке);
 *   - Ctrl+S = Save, Shift+Alt+F внутри каждого редактора = Format JSON;
 *   - Сохранение → ToastProvider + NotificationsProvider (reveal → reopen).
 */
export function EditApiDialog({
  api,
  processName,
  processTypeName,
  onClose,
  onSaved,
}: EditApiDialogProps) {
  const toast = useToast();
  const notifications = useNotifications();
  const confirm = useConfirm();

  // --- Загрузка контекста ----------------------------------------------------
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<ApiRoleInfo[]>([]);

  // --- Форма -----------------------------------------------------------------
  const [handlerType, setHandlerType] = useState<ApiHandlerType>("Execute");
  const [saveManual, setSaveManual] = useState<boolean>(true);
  const [saveCompleted, setSaveCompleted] = useState<boolean>(true);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [rolesTouched, setRolesTouched] = useState<boolean>(false);
  const [commandJson, setCommandJson] = useState<JsonState>(() =>
    parseJsonState(DEFAULT_COMMAND_DTO),
  );
  const [resultJson, setResultJson] = useState<JsonState>(() =>
    parseJsonState(DEFAULT_RESULT_DTO),
  );
  const [saving, setSaving] = useState<boolean>(false);

  // Снапшот «начального» состояния — чтобы детектить dirty для unsaved-guard.
  const initialRef = useRef<{
    handlerType: ApiHandlerType;
    saveManual: boolean;
    saveCompleted: boolean;
    selectedRoleIds: number[];
    commandText: string;
    resultText: string;
  } | null>(null);

  // --- Resizable layout для редакторов --------------------------------------
  const editorsLayout = useAutoSaveLayout(`api-dialog-editors-${processTypeName}`);

  // --- Хоткеи: Ctrl+S = Save, глобально пока dialog открыт ------------------
  useHotkey("mod+s", () => { void handleSubmit(); }, {
    enabled: !saving && !loading,
    ignoreWhenTyping: false,
  });

  // --- Изначальная загрузка --------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    api.getApiRelatedData(processName)
      .then((data) => {
        if (cancelled) return;
        console.debug("[EditApiDialog] getApiRelatedData response:", data);
        setAvailableRoles(data.Roles);
        const pickedIds = data.PermissionRoles.map((r) => r.RoleId);
        setSelectedRoleIds(pickedIds);
        const commandText = stringifyForInitial(data.CommandDTO, DEFAULT_COMMAND_DTO);
        const resultText = stringifyForInitial(data.ResultDTO, DEFAULT_RESULT_DTO);
        setCommandJson(parseJsonState(commandText));
        setResultJson(parseJsonState(resultText));
        const ht: ApiHandlerType = data.HandlerType ?? "Execute";
        const sm = typeof data.SaveManual === "boolean" ? data.SaveManual : true;
        const sc = typeof data.SaveCompleted === "boolean" ? data.SaveCompleted : true;
        setHandlerType(ht);
        setSaveManual(sm);
        setSaveCompleted(sc);
        initialRef.current = {
          handlerType: ht,
          saveManual: sm,
          saveCompleted: sc,
          selectedRoleIds: pickedIds,
          commandText,
          resultText,
        };
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [api, processName]);

  // --- Derived state ---------------------------------------------------------
  const dirty = useMemo(() => {
    const init = initialRef.current;
    if (!init) return false;
    if (init.handlerType !== handlerType) return true;
    if (init.saveManual !== saveManual) return true;
    if (init.saveCompleted !== saveCompleted) return true;
    if (init.selectedRoleIds.length !== selectedRoleIds.length) return true;
    const a = new Set(init.selectedRoleIds);
    for (const id of selectedRoleIds) if (!a.has(id)) return true;
    if (init.commandText !== commandJson.text) return true;
    if (init.resultText !== resultJson.text) return true;
    return false;
  }, [handlerType, saveManual, saveCompleted, selectedRoleIds, commandJson.text, resultJson.text]);

  const rolesInvalid = rolesTouched && selectedRoleIds.length === 0;
  const canSave = !loading && !saving &&
    selectedRoleIds.length > 0 &&
    commandJson.error === null &&
    resultJson.error === null;

  // --- Actions ---------------------------------------------------------------
  const handleRequestClose = useCallback(() => {
    if (saving) return;
    if (!dirty) { onClose(); return; }
    void confirm({
      title: "Discard changes?",
      message: "You have unsaved API changes. Discard them?",
      confirmLabel: "Discard",
      tone: "danger",
      onConfirm: () => { onClose(); },
    });
  }, [confirm, dirty, onClose, saving]);

  const handleFormat = useCallback((which: "command" | "result") => {
    const current = which === "command" ? commandJson : resultJson;
    const setter = which === "command" ? setCommandJson : setResultJson;
    if (!current.text.trim()) return;
    try {
      const parsed = JSON.parse(current.text);
      const formatted = JSON.stringify(parsed, null, 2);
      setter({ text: formatted, parsed, error: null });
    } catch {
      toast.push("warning", `Cannot format: invalid JSON in ${which === "command" ? "Command" : "Result"} DTO`);
    }
  }, [commandJson, resultJson, toast]);

  const handleSelectedRolesToNames = useCallback((): string[] => {
    const byId = new Map(availableRoles.map((r) => [r.RoleId, r.Name] as const));
    const names: string[] = [];
    for (const id of selectedRoleIds) {
      const n = byId.get(id);
      if (n) names.push(n);
    }
    return names;
  }, [availableRoles, selectedRoleIds]);

  const handleSubmit = useCallback(async () => {
    setRolesTouched(true);
    if (!canSave) return;
    const payload: ApiUpsertPayload = {
      MethodName: processName,
      Description: processName,
      HandlerType: handlerType,
      SaveManual: saveManual,
      SaveCompleted: saveCompleted,
      Roles: handleSelectedRolesToNames(),
      CommandDTO: commandJson.parsed,
      ResultDTO: resultJson.parsed,
    };
    setSaving(true);
    try {
      await api.upsertApi(payload);
      toast.push("success", `API updated · ${processName}`, { duration: 2500 });
      notifications.push("success", `API updated · ${processName}`, {
        body: `Roles (${payload.Roles.length}): ${payload.Roles.join(", ") || "—"}`,
        source: `configurator.api:${processTypeName}`,
        toast: false,
      });
      // После успешного save новая форма становится «начальной».
      initialRef.current = {
        handlerType,
        saveManual,
        saveCompleted,
        selectedRoleIds,
        commandText: commandJson.text,
        resultText: resultJson.text,
      };
      onSaved?.();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.push("error", `API save failed · ${msg}`, { duration: 4000 });
    } finally {
      setSaving(false);
    }
  }, [
    api, canSave, commandJson, handlerType, handleSelectedRolesToNames,
    notifications, onClose, onSaved, processName, processTypeName,
    resultJson, saveCompleted, saveManual, selectedRoleIds, toast,
  ]);

  // --- Markers для Monaco ---------------------------------------------------
  const commandMarkers: CodeEditorMarker[] = useMemo(() => {
    if (!commandJson.error) return [];
    return [{
      severity: "error",
      message: commandJson.error.message,
      startLineNumber: commandJson.error.line,
      startColumn: commandJson.error.column,
      endLineNumber: commandJson.error.line,
      endColumn: commandJson.error.column + 1,
      source: "json",
    }];
  }, [commandJson.error]);

  const resultMarkers: CodeEditorMarker[] = useMemo(() => {
    if (!resultJson.error) return [];
    return [{
      severity: "error",
      message: resultJson.error.message,
      startLineNumber: resultJson.error.line,
      startColumn: resultJson.error.column,
      endLineNumber: resultJson.error.line,
      endColumn: resultJson.error.column + 1,
      source: "json",
    }];
  }, [resultJson.error]);

  // --- Render ---------------------------------------------------------------
  const inputStyle: CSSProperties = {
    width: "100%",
    padding: `${t.space[2]} ${t.space[3]}`,
    fontSize: t.font.size.sm,
    background: t.color.bg.editor,
    border: `1px solid ${t.color.border.default}`,
    borderRadius: t.radius.md,
    color: t.color.text.primary,
    outline: "none",
    boxSizing: "border-box",
    height: t.component.input.height,
  };

  return (
    <Modal
      open
      onClose={handleRequestClose}
      size="xl"
      dismissible={!saving}
      aria-label={`Edit API — ${processName}`}
      style={{ height: "80vh", display: "flex", flexDirection: "column" }}
    >
      <Modal.Header title={`Edit API · ${processName}`}>
        <span style={{ fontSize: t.font.size.xs, color: t.color.text.muted, fontFamily: t.font.mono }}>
          {processTypeName}
        </span>
      </Modal.Header>
      <Modal.Body style={{ flex: 1, display: "flex", flexDirection: "column", gap: t.space[5], padding: t.space[5], overflow: "hidden" }}>
        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: t.color.text.muted, fontSize: t.font.size.sm }}>
            Loading…
          </div>
        ) : loadError ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: t.color.text.danger, fontSize: t.font.size.sm }}>
            {loadError}
          </div>
        ) : (
          <>
            {/* Top row: method/process/handler + toggles */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 180px auto auto",
                gap: t.space[5],
                alignItems: "end",
              }}
            >
              <FormRow label="Method Name">
                <input type="text" value={processName} readOnly style={{ ...inputStyle, opacity: 0.7 }} />
              </FormRow>
              <FormRow label="Process Name">
                <input type="text" value={processTypeName} readOnly style={{ ...inputStyle, opacity: 0.7 }} />
              </FormRow>
              <FormRow label="Handler Type" required>
                <select
                  value={handlerType}
                  onChange={(e) => setHandlerType(e.target.value as ApiHandlerType)}
                  style={inputStyle}
                >
                  {HANDLER_TYPES.map((ht) => (
                    <option key={ht} value={ht}>{ht}</option>
                  ))}
                </select>
              </FormRow>
              <div style={{ display: "flex", flexDirection: "column", gap: t.space[1] }}>
                <span style={{ fontSize: t.font.size.xs, color: t.color.text.muted }}>Save Manual</span>
                <Toggle
                  aria-label="Save Manual"
                  checked={saveManual}
                  onChange={(e) => setSaveManual(e.target.checked)}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: t.space[1] }}>
                <span style={{ fontSize: t.font.size.xs, color: t.color.text.muted }}>Save Completed</span>
                <Toggle
                  aria-label="Save Completed"
                  checked={saveCompleted}
                  onChange={(e) => setSaveCompleted(e.target.checked)}
                />
              </div>
            </div>

            {/* Roles */}
            <FormRow
              label="Roles"
              required
              error={rolesInvalid ? "At least one role must be selected" : undefined}
              hint={!rolesInvalid ? `${selectedRoleIds.length} / ${availableRoles.length} selected` : undefined}
            >
              <div onBlur={() => setRolesTouched(true)}>
                <RoleMultiSelect
                  value={selectedRoleIds}
                  options={availableRoles}
                  onChange={(next) => { setSelectedRoleIds(next); setRolesTouched(true); }}
                  invalid={rolesInvalid}
                  aria-label="Roles"
                />
              </div>
            </FormRow>

            {/* DTO editors */}
            <div style={{ flex: 1, minHeight: 260, display: "flex", flexDirection: "column" }}>
              <Group
                orientation="horizontal"
                id={`api-dialog-editors-${processTypeName}`}
                {...editorsLayout}
              >
                <Panel id="command-dto" minSize="200px">
                  <DtoEditorPane
                    title="Command DTO"
                    json={commandJson}
                    markers={commandMarkers}
                    onChange={(text) => setCommandJson(parseJsonState(text))}
                    onFormat={() => handleFormat("command")}
                    pathKey={`api-command-${processTypeName}`}
                  />
                </Panel>
                <ResizeHandle direction="horizontal" />
                <Panel id="result-dto" minSize="200px">
                  <DtoEditorPane
                    title="Result DTO"
                    json={resultJson}
                    markers={resultMarkers}
                    onChange={(text) => setResultJson(parseJsonState(text))}
                    onFormat={() => handleFormat("result")}
                    pathKey={`api-result-${processTypeName}`}
                  />
                </Panel>
              </Group>
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <span style={{ flex: 1, color: t.color.text.muted, fontSize: t.font.size.xs }}>
          {dirty && !saving && "Unsaved changes — Ctrl+S to save"}
        </span>
        <Button size="sm" variant="secondary" onClick={handleRequestClose} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" onClick={() => { void handleSubmit(); }} disabled={!canSave}>
          {saving ? "Saving…" : "Upsert"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

interface DtoEditorPaneProps {
  title: string;
  json: JsonState;
  markers: CodeEditorMarker[];
  onChange: (text: string) => void;
  onFormat: () => void;
  pathKey: string;
}

function DtoEditorPane({ title, json, markers, onChange, onFormat, pathKey }: DtoEditorPaneProps) {
  const valid = json.error === null;
  return (
    <EditorPanel
      title={title}
      icon={<FileJson2 size={13} />}
      badge={
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: t.space[1],
            fontSize: t.font.size.xs,
            color: valid ? t.color.text.success : t.color.text.danger,
          }}
        >
          {valid ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
          {valid ? "Valid JSON" : "Invalid JSON"}
        </span>
      }
      actions={[
        {
          id: "format",
          icon: <Wand2 size={12} />,
          title: "Format JSON",
          hotkey: "Shift+Alt+F",
          onClick: onFormat,
        },
      ]}
      language="json"
      theme="hub-dark"
      value={json.text}
      onChange={onChange}
      path={pathKey}
      markers={markers}
      markerOwner="api-dto"
      aria-label={title}
      options={{ tabSize: 2, insertSpaces: true, minimap: { enabled: false } }}
    />
  );
}
