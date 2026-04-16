import { Separator } from "react-resizable-panels";

interface ResizeHandleProps {
  direction?: "horizontal" | "vertical";
}

export function ResizeHandle({ direction = "horizontal" }: ResizeHandleProps) {
  return (
    <Separator
      className={direction === "vertical" ? "resize-handle-v" : "resize-handle-h"}
    />
  );
}
