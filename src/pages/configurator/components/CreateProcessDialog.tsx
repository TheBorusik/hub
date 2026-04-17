import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

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
    // Пока пользователь не трогал TypeName вручную — автогенерим его из Name.
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

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}
      onMouseDown={onCancel}
    >
      <div
        style={{
          background: "var(--color-sidebar)",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          padding: "16px 20px",
          width: 420,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>
          Create new process
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 14 }}>
          A draft process will be created and opened in a new tab. Save it to persist.
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>
            Process Name
          </label>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onCancel(); }}
            placeholder="App.Domain.Subdomain.Action"
            style={{
              width: "100%",
              padding: "6px 8px",
              fontSize: 13,
              background: "var(--color-editor)",
              border: "1px solid var(--color-border)",
              borderRadius: 3,
              color: "var(--color-text-primary)",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "var(--font-mono, monospace)",
            }}
          />
          <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 2 }}>
            Value of <code>[Process("...")]</code>.
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>
            Type Name
          </label>
          <input
            value={typeName}
            onChange={(e) => { setTypeName(e.target.value); setTypeNameTouched(true); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onCancel(); }}
            placeholder="AppDomainSubdomainAction"
            style={{
              width: "100%",
              padding: "6px 8px",
              fontSize: 13,
              background: "var(--color-editor)",
              border: "1px solid var(--color-border)",
              borderRadius: 3,
              color: "var(--color-text-primary)",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "var(--font-mono, monospace)",
            }}
          />
          <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 2 }}>
            C# class name. Autofilled from Name (without dots), you can override.
          </div>
        </div>

        {error && (
          <div style={{ fontSize: 11, color: "#f44336", marginTop: 2, marginBottom: 4 }}>{error}</div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "5px 14px", fontSize: 12, borderRadius: 3,
              border: "1px solid var(--color-border)",
              background: "transparent", color: "var(--color-text-primary)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: "5px 14px", fontSize: 12, borderRadius: 3,
              border: "none",
              background: "var(--color-accent)", color: "#fff",
              cursor: "pointer",
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
