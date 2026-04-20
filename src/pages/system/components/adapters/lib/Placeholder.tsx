/**
 * Текстовый плейсхолдер по центру доступной области.
 * Используется в пустых состояниях правой части `ConfigurationPanel`
 * ("выберите конфигурацию", "выберите секцию").
 *
 * Выделен в отдельный файл, чтобы не смешивать экспорт компонента с
 * константами/утилитами (правило `react-refresh/only-export-components`).
 */
export function Placeholder({ text }: { text: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "var(--color-text-muted)",
        fontSize: 12,
      }}
    >
      {text}
    </div>
  );
}
