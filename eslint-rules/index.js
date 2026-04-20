/**
 * Local ESLint plugin с правилами гигиены UI-кода Hub.
 *
 * Подключается из `eslint.config.js` как плагин `hub-ui`.
 *
 * Правила:
 *  - no-raw-hex: запрещает hex-цвета в строковых литералах вне design tokens.
 *  - no-magic-spacing: запрещает магические px-отступы в JSX style / style
 *    объекта (padding/margin/gap/top/left/right/bottom/width/height), мимо токенов.
 *  - no-duplicate-confirm-dialog: запрещает прямой импорт `ConfirmDialog` из
 *    UI-kit в любом коде, кроме самого `ui/ConfirmDialog/**` и корневого
 *    `App.tsx` (провайдер). Остальные должны использовать `useConfirm`.
 *  - no-monaco-theme-define: запрещает прямой вызов `monaco.editor.defineTheme`
 *    вне централизованного места (`ui/CodeEditor/**`).
 */

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const SPACING_PROPS = new Set([
  "padding",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "paddingInline",
  "paddingBlock",
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "gap",
  "rowGap",
  "columnGap",
  "top",
  "bottom",
  "left",
  "right",
]);

function filenameAllowedForHex(filename) {
  return (
    filename.includes("design-tokens") ||
    filename.includes("globals.css") ||
    filename.includes("stage-colors") ||
    filename.includes("eslint-rules") ||
    filename.includes("/__tests__/") ||
    filename.endsWith(".d.ts")
  );
}

const noRawHex = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Hex colors must live in design tokens (`design-tokens.ts`) / CSS variables / `stage-colors.ts`.",
    },
    schema: [],
    messages: {
      rawHex:
        "Hex-цвет '{{value}}' запрещён вне design tokens. Используйте `t.color.*` / CSS variable / `STAGE_TYPE_COLORS`.",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (filenameAllowedForHex(filename)) {
      return {};
    }
    function check(node, value) {
      if (typeof value !== "string") return;
      if (!HEX_COLOR_RE.test(value.trim())) return;
      context.report({ node, messageId: "rawHex", data: { value } });
    }
    return {
      Literal(node) {
        check(node, node.value);
      },
      TemplateLiteral(node) {
        if (node.expressions.length !== 0) return;
        const raw = node.quasis.map((q) => q.value.cooked).join("");
        check(node, raw);
      },
    };
  },
};

const noMagicSpacing = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow raw px spacing values in JSX `style`; use design tokens (`t.space.*` / CSS variables).",
    },
    schema: [],
    messages: {
      magicSpacing:
        "Магический отступ '{{prop}}: {{value}}' запрещён в JSX style. Используйте `t.space.*` / CSS var.",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (
      filename.includes("design-tokens") ||
      filename.includes("eslint-rules")
    ) {
      return {};
    }
    function isMagicValue(v) {
      if (typeof v === "number") return v !== 0;
      if (typeof v === "string") {
        const trimmed = v.trim();
        if (trimmed === "0" || trimmed === "0px") return false;
        return /^-?\d+(?:\.\d+)?px$/.test(trimmed);
      }
      return false;
    }
    return {
      Property(node) {
        const key = node.key;
        let name = null;
        if (key.type === "Identifier") name = key.name;
        else if (key.type === "Literal" && typeof key.value === "string")
          name = key.value;
        if (!name || !SPACING_PROPS.has(name)) return;
        const val = node.value;
        if (val.type === "Literal" && isMagicValue(val.value)) {
          context.report({
            node: val,
            messageId: "magicSpacing",
            data: { prop: name, value: String(val.value) },
          });
        }
      },
    };
  },
};

const noDuplicateConfirmDialog = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow direct import of `ConfirmDialog` outside UI-kit; use `useConfirm()` from `@/components/ui/ConfirmDialog`.",
    },
    schema: [],
    messages: {
      directImport:
        "Прямой импорт `ConfirmDialog` запрещён. Используйте `useConfirm()` из `@/components/ui/ConfirmDialog`.",
    },
  },
  create(context) {
    const filename = (
      context.filename ||
      context.getFilename() ||
      ""
    ).replace(/\\/g, "/");
    const isUiKit = filename.includes("/components/ui/ConfirmDialog/");
    const isRootApp = /\/src\/App\.tsx$/.test(filename);
    if (isUiKit || isRootApp) return {};
    return {
      ImportDeclaration(node) {
        const src = node.source.value;
        if (
          typeof src !== "string" ||
          !src.includes("components/ui/ConfirmDialog")
        ) {
          return;
        }
        for (const spec of node.specifiers) {
          if (
            spec.type === "ImportSpecifier" &&
            spec.imported &&
            spec.imported.name === "ConfirmDialog"
          ) {
            context.report({ node: spec, messageId: "directImport" });
          }
        }
      },
    };
  },
};

const noMonacoThemeDefine = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow direct `monaco.editor.defineTheme(...)`; use `ensureHubDarkTheme` in `ui/CodeEditor`.",
    },
    schema: [],
    messages: {
      define:
        "`monaco.editor.defineTheme` запрещён вне `ui/CodeEditor`. Используйте `ensureHubDarkTheme`.",
    },
  },
  create(context) {
    const filename = (
      context.filename ||
      context.getFilename() ||
      ""
    ).replace(/\\/g, "/");
    if (filename.includes("/components/ui/CodeEditor/")) return {};
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression") return;
        const prop = callee.property;
        if (!prop || prop.type !== "Identifier") return;
        if (prop.name !== "defineTheme") return;
        const obj = callee.object;
        if (
          obj.type === "MemberExpression" &&
          obj.property.type === "Identifier" &&
          obj.property.name === "editor"
        ) {
          context.report({ node, messageId: "define" });
        }
      },
    };
  },
};

export default {
  rules: {
    "no-raw-hex": noRawHex,
    "no-magic-spacing": noMagicSpacing,
    "no-duplicate-confirm-dialog": noDuplicateConfirmDialog,
    "no-monaco-theme-define": noMonacoThemeDefine,
  },
};
