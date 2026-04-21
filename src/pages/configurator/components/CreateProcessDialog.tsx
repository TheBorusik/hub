import { useState, useRef, useEffect, type CSSProperties } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormRow } from "@/components/ui/FormRow";
import { ProcessType } from "@/lib/ws-api-models";
import { t as tok } from "@/lib/design-tokens";

interface CreateProcessDialogProps {
  /** Префил имени процесса (например, имя подпроцесса, которого не нашли). */
  initialName?: string;
  /**
   * Список уже занятых `Name` и `TypeName` — чтобы не создать дубль.
   */
  takenProcessNames?: Set<string>;
  takenTypeNames?: Set<string>;
  onSubmit: (args: {
    name: string;
    typeName: string;
    description: string;
    type: ProcessType;
  }) => void;
  onCancel: () => void;
}

const TYPE_OPTIONS: Array<{ value: ProcessType; label: string; hint: string }> = [
  { value: ProcessType.Api,   label: "API",   hint: "External API endpoint" },
  { value: ProcessType.Lk,    label: "LK",    hint: "Личный кабинет" },
  { value: ProcessType.Admin, label: "Admin", hint: "Admin-side process" },
  { value: ProcessType.Other, label: "Other", hint: "Generic / system" },
];

/**
 * Диалог создания нового процесса.
 *
 * Используется двумя путями:
 *  - пользователь просит открыть подпроцесс (`Edit Sub Process` / `Edit`
 *    на SubStart), а процесса с таким `Name` в репозитории/БД ещё нет;
 *  - вручную из ProcessTree / CommandPalette «Create new process…».
 *
 * `TypeName` генерируется автоматически как `Name` без точек
 * (см. `wfm-processes-crud-conventions.mdc`):
 * `App.Domain.Subdomain.Action` → `AppDomainSubdomainAction`. Пользователь
 * его не вводит — сервер генерирует такой же.
 *
 * `Type` и `Description` — для UX-согласованности со старой админкой;
 * в текущей логике создания (через `createNewProcessAssembly` PROCESS +
 * WEBDATA) они не отправляются на сервер, но передаются в `onSubmit` —
 * consumer решает, что с ними делать.
 */
export function CreateProcessDialog({
  initialName,
  takenProcessNames,
  takenTypeNames,
  onSubmit,
  onCancel,
}: CreateProcessDialogProps) {
  const [name, setName] = useState<string>(initialName ?? "");
  const [description, setDescription] = useState<string>("");
  const [type, setType] = useState<ProcessType>(ProcessType.Other);
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, []);

  const derivedTypeName = name.replace(/\./g, "");

  const handleSubmit = () => {
    const n = name.trim();
    const tn = derivedTypeName.trim();
    if (!n) { setError("Process Name is required"); return; }
    if (!tn || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(tn)) {
      setError("Process Name must translate to a valid C# identifier (after removing dots)");
      return;
    }
    if (takenProcessNames?.has(n)) {
      setError(`Process with Name "${n}" already exists`);
      return;
    }
    if (takenTypeNames?.has(tn)) {
      setError(`Class with TypeName "${tn}" already exists`);
      return;
    }
    onSubmit({ name: n, typeName: tn, description: description.trim(), type });
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "6px 8px",
    fontSize: tok.font.size.sm,
    background: tok.color.bg.editor,
    border: `1px solid ${tok.color.border.default}`,
    borderRadius: tok.radius.sm,
    color: tok.color.text.primary,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: tok.font.mono,
  };

  const selectStyle: CSSProperties = {
    ...inputStyle,
    fontFamily: "inherit",
  };

  const textareaStyle: CSSProperties = {
    ...inputStyle,
    fontFamily: "inherit",
    minHeight: 52,
    resize: "vertical",
  };

  return (
    <Modal open onClose={onCancel} size="md" initialFocus={inputRef} aria-label="Create new process">
      <Modal.Header title="Create new process" />
      <Modal.Body>
        <div style={{ fontSize: tok.font.size.xs, color: tok.color.text.muted, marginBottom: tok.space[5] }}>
          A draft process will be created and opened in a new tab. Save it to persist.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: tok.space[4] }}>
          <FormRow
            label="Process Name"
            required
            hint={
              name
                ? <>Value of <code>[Process(&quot;…&quot;)]</code>. TypeName (class): <code>{derivedTypeName || "—"}</code></>
                : <>Value of <code>[Process(&quot;…&quot;)]</code>.</>
            }
          >
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              placeholder="App.Domain.Subdomain.Action"
              style={inputStyle}
            />
          </FormRow>

          <FormRow label="Type" hint={TYPE_OPTIONS.find((o) => o.value === type)?.hint}>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ProcessType)}
              style={selectStyle}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormRow>

          <FormRow label="Description" hint="Optional.">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description…"
              rows={2}
              style={textareaStyle}
            />
          </FormRow>

          {error && (
            <div style={{ fontSize: tok.font.size.xs, color: tok.color.text.danger }}>{error}</div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button size="sm" variant="primary" onClick={handleSubmit}>Create</Button>
      </Modal.Footer>
    </Modal>
  );
}
