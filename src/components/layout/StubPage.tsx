import type { ElementType } from "react";

interface StubPageProps {
  icon: ElementType;
  title: string;
  description: string;
  phase: string;
}

export function StubPage({ icon: Icon, title, description, phase }: StubPageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full" style={{ gap: 12, color: "var(--color-text-muted)" }}>
      <Icon size={36} strokeWidth={1} />
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)" }}>{title}</h2>
      <p style={{ fontSize: 13, maxWidth: 340, textAlign: "center" }}>{description}</p>
      <span
        style={{
          fontSize: 11,
          padding: "2px 8px",
          background: "var(--color-surface-400)",
          border: "1px solid var(--color-border)",
        }}
      >
        {phase}
      </span>
    </div>
  );
}
