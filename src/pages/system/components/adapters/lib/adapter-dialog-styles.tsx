/**
 * Совместимость с HMR: после переноса стилей и `tryFormatJson` в `.ts` старые
 * сессии иногда продолжают запрашивать модуль по пути `*.tsx` → 404.
 * Реэкспорт устраняет это без дублирования кода.
 */
export {
  cancelBtnStyle,
  dialogStyle,
  inputStyle,
  labelStyle,
  overlayBg,
  primaryBtnStyle,
  tryFormatJson,
} from "./adapter-dialog-styles.ts";
