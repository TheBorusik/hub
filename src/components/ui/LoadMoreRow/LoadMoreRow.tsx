import type { CSSProperties } from "react";
import { Loader2, ChevronDown } from "lucide-react";
import { t } from "@/lib/design-tokens";

export interface LoadMoreRowProps {
  onClick: () => void;
  loading?: boolean;
  /** Сколько элементов уже загружено. */
  loaded?: number;
  /** Всего на сервере, если известно. */
  total?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Кликабельная строка «Load more», стандартизирует пагинацию в длинных
 * списках (Viewer, ErrorsTable, GlobalModels).
 */
export function LoadMoreRow({
  onClick,
  loading = false,
  loaded,
  total,
  label = "Load more",
  className,
  style,
}: LoadMoreRowProps) {
  const completed = typeof total === "number" && typeof loaded === "number" && loaded >= total;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || completed}
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: t.space[2],
        width: "100%",
        padding: `${t.space[3]} ${t.space[4]}`,
        background: "transparent",
        border: "none",
        borderTop: `1px solid ${t.color.border.default}`,
        color: completed ? t.color.text.muted : t.color.text.link,
        fontSize: t.font.size.xs,
        cursor: loading || completed ? "default" : "pointer",
        ...style,
      }}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : !completed && <ChevronDown size={12} />}
      <span>
        {completed
          ? `All loaded (${loaded}${typeof total === "number" ? " / " + total : ""})`
          : label}
      </span>
      {!completed && typeof loaded === "number" && (
        <span style={{ color: t.color.text.muted, marginLeft: t.space[2] }}>
          {loaded}
          {typeof total === "number" ? ` / ${total}` : ""}
        </span>
      )}
    </button>
  );
}
