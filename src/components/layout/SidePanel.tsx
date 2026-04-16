import type { ReactNode } from "react";

interface SidePanelProps {
  title: string;
  children: ReactNode;
}

export function SidePanel({ title, children }: SidePanelProps) {
  return (
    <div className="flex flex-col h-full bg-sidebar overflow-hidden">
      <div
        className="flex items-center shrink-0 select-none uppercase tracking-wider"
        style={{
          height: 35,
          padding: "0 20px",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--color-text-muted)",
          letterSpacing: "0.04em",
        }}
      >
        {title}
      </div>
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
