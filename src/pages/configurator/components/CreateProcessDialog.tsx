import { useState, useRef, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { t as tok } from "@/lib/design-tokens";

interface CreateProcessDialogProps {
  /** Префил имени процесса (например, имя подпроцесса, которого не нашли). */
  initialName?: string;
  /**
   * Список уже занятых `Name` и `TypeName` — чтобы не создать дубль.
   */
  takenProcessNames?: Set<string>;
  takenTypeNames?: Set<string>;
  onSubmit: (args: { name: string; typeName: string }) => void;
  onCancel: () => void;
}

/**
 * Диалог создания нового процесса.
 *
 * Используется, когда пользователь просит открыть подпроцесс
 * (`Edit Sub Process`/`Edit` на форме стейджа SubStart), но процесса
 * с таким `Name` в репозитории/БД ещё нет.
 *
 * По соглашению `TypeName` = `Name` без точек (см. `wfm-processes-crud-conventions.mdc`):
 * `App.Domain.Subdomain.Action` → `AppDomainSubdomainAction`.
 */
export function CreateProcessDialog({
  initialName,
  takenProcessNames,
  takenTypeNames,
  onSubmit,
  onCancel,
}: CreateProcessDialogProps) {
  const [name, setName] = useState<string>(initialName ?? "");
  const [typeName, setTypeName] = useState<string>(initialName ? initialName.replace(/\./g, "") : "");
  const [typeNameTouched, setTypeNameTouched] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleNameChange = (next: string) => {
    setName(next);
    setError("");
    if (!typeNameTouched) {
      setTypeName(next.replace(/\./g, ""));
    }
  };

  const handleSubmit = () => {
    const n = name.trim();
    const t = typeName.trim();
    if (!n) { setError("Process Name is required"); return; }
    if (!t) { setError("Type Name is required"); return; }
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(t)) {
      setError("Type Name must be a valid C# identifier");
      return;
    }
    if (takenProcessNames?.has(n)) {
      setError(`Process with Name "${n}" already exists`);
      return;
    }
    if (takenTypeNames?.has(t)) {
      setError(`Class with TypeName "${t}" already exists`);
      return;
    }
    onSubmit({ name: n, typeName: t });
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 8px",
    fontSize: 13,
    background: tok.color.bg.editor,
    border: `1px solid ${tok.color.border.default}`,
    borderRadius: tok.radius.sm,
    color: tok.color.text.primary,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "var(--font-mono, monospace)",
  };

  return (
    <Modal open onClose={onCancel} size="md" initialFocus={inputRef} aria-label="Create new process">
      <Modal.Header title="Create new process" />
      <Modal.Body>
        <div style={{ fontSize: 11, color: tok.color.text.muted, marginBottom: 14 }}>
          A draft process will be created and opened in a new tab. Save it to persist.
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: tok.color.text.muted, fontWeight: 600, display: "block", marginBottom: 4 }}>
            Process Name
          </label>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="App.Domain.Subdomain.Action"
            style={inputStyle}
          />
          <div style={{ fontSize: 10, color: tok.color.text.muted, marginTop: 2 }}>
            Value of <code>[Process("...")]</code>.
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: tok.color.text.muted, fontWeight: 600, display: "block", marginBottom: 4 }}>
            Type Name
          </label>
          <input
            value={typeName}
            onChange={(e) => { setTypeName(e.target.value); setTypeNameTouched(true); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="AppDomainSubdomainAction"
            style={inputStyle}
          />
          <div style={{ fontSize: 10, color: tok.color.text.muted, marginTop: 2 }}>
            C# class name. Autofilled from Name (without dots), you can override.
          </div>
        </div>

        {error && (
          <div style={{ fontSize: 11, color: "#f44336", marginTop: 2, marginBottom: 4 }}>{error}</div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button size="sm" variant="primary" onClick={handleSubmit}>Create</Button>
      </Modal.Footer>
    </Modal>
  );
}
