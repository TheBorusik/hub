import { useState, useRef, useCallback, useEffect, useMemo } from "react";

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label: string;
  placeholder?: string;
  readOnly?: boolean;
}

export function AutocompleteInput({
  value,
  onChange,
  options,
  label,
  placeholder,
  readOnly,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filtered = useMemo(() => {
    if (!inputValue) return options;
    const lc = inputValue.toLowerCase();
    const matches = options.filter((o) => o.toLowerCase().includes(lc));
    // Если ни одна опция не совпадает с тем, что напечатано — всё равно показываем
    // весь список, чтобы пользователь видел доступные варианты (иначе выпадашка
    // просто не открывается и кажется, что автокомплита «нет»).
    return matches.length > 0 ? matches : options;
  }, [options, inputValue]);

  const handleSelect = useCallback(
    (val: string) => {
      setInputValue(val);
      onChange(val);
      setOpen(false);
    },
    [onChange],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setInputValue(v);
      setOpen(true);
      onChange(v);
    },
    [onChange],
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as HTMLElement)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <span
        style={{
          fontSize: 11,
          color: "var(--color-text-muted)",
          fontWeight: 600,
          marginBottom: 2,
          display: "block",
        }}
      >
        {label}
      </span>
      <input
        ref={inputRef}
        style={{
          width: "100%",
          background: "var(--color-surface-400)",
          border: "1px solid var(--color-border)",
          borderRadius: 3,
          padding: "4px 8px",
          fontSize: 12,
          color: "var(--color-text-primary)",
          outline: "none",
          boxSizing: "border-box",
        }}
        value={inputValue}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && !readOnly && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            maxHeight: 220,
            overflow: "auto",
            background: "var(--color-sidebar)",
            border: "1px solid var(--color-border)",
            borderRadius: "0 0 4px 4px",
            zIndex: 100,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {filtered.map((opt) => (
            <div
              key={opt}
              style={{
                padding: "4px 8px",
                fontSize: 12,
                cursor: "pointer",
                color: opt === value ? "var(--color-accent)" : "var(--color-text-primary)",
                background: opt === value ? "rgba(14,99,156,0.1)" : "transparent",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-list-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = opt === value ? "rgba(14,99,156,0.1)" : "transparent"; }}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(opt);
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
