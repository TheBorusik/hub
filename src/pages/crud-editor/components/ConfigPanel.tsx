import { useState } from "react";
import { Upload } from "lucide-react";
import { useContourApi } from "@/lib/ws-api";
import type { CrudModel, CrudRecord } from "../types";

interface ConfigPanelProps {
  model: CrudModel;
  records: CrudRecord[];
}

export function ConfigPanel({ model, records }: ConfigPanelProps) {
  const api = useContourApi();
  const [pushing, setPushing] = useState(false);
  const [status, setStatus] = useState<string>("");

  if (!model.ConfigTable) return null;

  const handlePush = async () => {
    if (!api) return;
    setPushing(true);
    setStatus("");
    try {
      await api.updateConfigTable(model.Name, records);
      setStatus("Config updated");
    } catch (err) {
      setStatus("Error: " + String(err));
    } finally {
      setPushing(false);
    }
  };

  return (
    <button
      onClick={handlePush}
      disabled={pushing}
      className="toolbar-btn"
      title={status || `Push ${records.length} records to ConfigTable: ${model.ConfigTable}`}
      style={{ color: "var(--color-warning)" }}
    >
      <Upload size={16} />
    </button>
  );
}
