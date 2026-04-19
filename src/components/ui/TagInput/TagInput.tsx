import { useRef, useState, type KeyboardEvent, type CSSProperties } from "react";
import { X } from "lucide-react";
import { t } from "@/lib/design-tokens";

export interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  /** Разделители, после которых текущий ввод конвертится в tag. default: [",", "Enter"]. */
  separators?: string[];
  /** Не дублировать теги. default: true. */
  dedupe?: boolean;
  /** Максимум тегов (0 = без лимита). */
  max?: number;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  /** aria-label для инпута. */
  "aria-label"?: string;
}

/**
 * Компонент для списка строк-тегов (например, Usings, Headers, Ids-фильтр).
 * Enter / запятая — создаёт тег; Backspace на пустом инпуте — удаляет последний.
 */
export function TagInput({
  value,
  onChange,
  placeholder,
  separators = [",", "Enter"],
  dedupe = true,
  max = 0,
  disabled,
  className,
  style,
  "aria-label": ariaLabel,
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (max > 0 && value.length >= max) return;
    if (dedupe && value.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...value, trimmed]);
    setDraft("");
  };

  const removeAt = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (separators.includes(e.key)) {
      e.preventDefault();
      commit(draft);
      return;
    }
    if (e.key === "Backspace" && !draft && value.length > 0) {
      e.preventDefault();
      removeAt(value.length - 1);
    }
  };

  return (
    <div
      className={className}
      onClick={() => inputRef.current?.focus()}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: t.space[2],
        minHeight: t.component.input.height,
        padding: `${t.space[1]} ${t.space[2]}`,
        background: t.color.bg.editor,
        border: `1px solid ${t.color.border.default}`,
        borderRadius: t.radius.md,
        cursor: disabled ? "default" : "text",
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      {value.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: t.space[1],
            background: t.color.bg.accentSoft,
            color: t.color.text.primary,
            borderRadius: t.radius.sm,
            padding: `1px 4px 1px 6px`,
            fontSize: t.font.size.xs,
          }}
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeAt(i);
              }}
              aria-label={`Remove ${tag}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                color: t.color.text.muted,
                cursor: "pointer",
                padding: 0,
                width: 14,
                height: 14,
              }}
            >
              <X size={10} />
            </button>
          )}
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => commit(draft)}
        disabled={disabled}
        placeholder={value.length === 0 ? placeholder : undefined}
        aria-label={ariaLabel}
        style={{
          flex: 1,
          minWidth: 80,
          height: 20,
          padding: 0,
          border: "none",
          background: "transparent",
          outline: "none",
          fontSize: t.font.size.sm,
          color: t.color.text.primary,
        }}
      />
    </div>
  );
}
