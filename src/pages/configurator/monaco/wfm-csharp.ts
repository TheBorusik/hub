import type { Monaco } from "@monaco-editor/react";
import type * as MonacoNs from "monaco-editor";
import { ensureWfmDarkTheme } from "@/components/ui/CodeEditor";

/**
 * WFM C# Monaco customization: дополнительная подсветка доменных типов,
 * кастомная тема и snippets для Configurator (портировано из AncestorAdmin).
 *
 * Регистрация темы `wfm-dark` делегирована в `MonacoProvider`
 * (см. `ensureWfmDarkTheme`) — здесь только token rules.
 */

const foregroundColors = {
  Context: "e4bb2d",
  Init: "c165f3",
  Type: "3dc990",
  Command: "019aee",
  Result: "59c132",
  Error: "ea4d4d",
  Enum: "ff8400",
} as const;

const customTokenIds = [
  "InitObject",
  "InitCommand",
  "CommandResult",
  "ResultCodes",
  "ResultCode",
  "Context",
  "Command",
  "JToken",
  "JObject",
  "JArray",
  "Result",
  "Event",
  "Process",
  "Success",
  "ErrorResult",
  "Error",
  "QB",
  "DQB",
  "Session",
  "DateTime",
  "TimeSpan",
  "SalError",
  "StartDefinition",
  "EndDefinition",
  "TransformDefinition",
  "CRUDDefinition",
  "CommandDefinition",
  "EventDefinition",
  "SubDefinition",
];

const customTokens = customTokenIds.map((x) => [x, x] as const);

const themeRules: MonacoNs.editor.ITokenThemeRule[] = [
  { token: "Context", foreground: foregroundColors.Context },
  { token: "Command", foreground: foregroundColors.Command },
  { token: "InitCommand", foreground: foregroundColors.Command },
  { token: "ErrorResult", foreground: foregroundColors.Error },
  { token: "Error", foreground: foregroundColors.Error },
  { token: "Success", foreground: foregroundColors.Result },
  { token: "InitObject", foreground: foregroundColors.Command },
  { token: "SubDefinition", foreground: foregroundColors.Type },
  { token: "JToken", foreground: foregroundColors.Type },
  { token: "JObject", foreground: foregroundColors.Type },
  { token: "JArray", foreground: foregroundColors.Type },
  { token: "QB", foreground: foregroundColors.Type },
  { token: "DQB", foreground: foregroundColors.Type },
  { token: "DateTime", foreground: foregroundColors.Type },
  { token: "TimeSpan", foreground: foregroundColors.Type },
  { token: "Session", foreground: foregroundColors.Type },
  { token: "Event", foreground: foregroundColors.Result },
  { token: "Result", foreground: foregroundColors.Result },
  { token: "ResultCode", foreground: foregroundColors.Enum },
  { token: "ResultCodes", foreground: foregroundColors.Enum },
  { token: "CommandResult", foreground: foregroundColors.Result },
  { token: "SalError", foreground: foregroundColors.Type },
  { token: "Process", foreground: foregroundColors.Type },
  { token: "StartDefinition", foreground: foregroundColors.Type },
  { token: "EndDefinition", foreground: foregroundColors.Type },
  { token: "TransformDefinition", foreground: foregroundColors.Type },
  { token: "CRUDDefinition", foreground: foregroundColors.Type },
  { token: "CommandDefinition", foreground: foregroundColors.Type },
  { token: "EventDefinition", foreground: foregroundColors.Type },
];

const csharpOperators = [
  "=", "??", "||", "&&", "|", "^", "&", "==", "!=", "<=", ">=", "<<",
  "+", "-", "*", "/", "%", "!", "~", "++", "--", "+=",
  "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<=", ">>=", ">>", "=>",
];

const csharpKeywords = [
  "extern", "alias", "using", "bool", "decimal", "sbyte", "byte", "short",
  "ushort", "int", "uint", "long", "ulong", "char", "float", "double",
  "object", "dynamic", "string", "assembly", "is", "as", "ref",
  "out", "this", "base", "new", "typeof", "void", "checked", "unchecked",
  "default", "delegate", "var", "const", "if", "else", "switch", "case",
  "while", "do", "for", "foreach", "in", "break", "continue", "goto",
  "return", "throw", "try", "catch", "finally", "lock", "yield", "from",
  "let", "where", "join", "on", "equals", "into", "orderby", "ascending",
  "descending", "select", "group", "by", "namespace", "partial", "class",
  "field", "event", "method", "param", "property", "public", "protected",
  "internal", "private", "abstract", "sealed", "static", "struct", "readonly",
  "volatile", "virtual", "override", "params", "get", "set", "add", "remove",
  "operator", "true", "false", "implicit", "explicit", "interface", "enum",
  "null", "async", "await", "fixed", "sizeof", "stackalloc", "unsafe", "nameof",
  "when",
];

const languageDefinition = {
  defaultToken: "",
  tokenPostfix: ".cs",
  brackets: [
    { open: "{", close: "}", token: "delimiter.curly" },
    { open: "[", close: "]", token: "delimiter.square" },
    { open: "(", close: ")", token: "delimiter.parenthesis" },
    { open: "<", close: ">", token: "delimiter.angle" },
  ],
  keywords: csharpKeywords,
  namespaceFollows: ["namespace", "using"],
  operators: csharpOperators,
  symbols: /[=><!~?:&|+\-*/^%]+/,
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
  tokenizer: {
    root: [
      ...customTokens,
      [/@?[a-zA-Z_]\w*/, {
        cases: {
          "@namespaceFollows": { token: "keyword.$0", next: "@namespace" },
          "@keywords": { token: "keyword.$0", next: "@qualified" },
          "@default": { token: "identifier", next: "@qualified" },
        },
      }],
      { include: "@whitespace" },
      [/}/, {
        cases: {
          "$S2==interpolatedstring": { token: "string.quote", next: "@pop" },
          "$S2==litinterpstring": { token: "string.quote", next: "@pop" },
          "@default": "@brackets",
        },
      }],
      [/[{}()[\]]/, "@brackets"],
      [/[<>](?!@symbols)/, "@brackets"],
      [/@symbols/, {
        cases: {
          "@operators": "delimiter",
          "@default": "",
        },
      }],
      [/[0-9_]*\.[0-9_]+([eE][-+]?\d+)?[fFdD]?/, "number.float"],
      [/0[xX][0-9a-fA-F_]+/, "number.hex"],
      [/0[bB][01_]+/, "number.hex"],
      [/[0-9_]+/, "number"],
      [/[;,.]/, "delimiter"],
      [/"([^"\\]|\\.)*$/, "string.invalid"],
      [/"/, { token: "string.quote", next: "@string" }],
      [/\$@"/, { token: "string.quote", next: "@litinterpstring" }],
      [/@"/, { token: "string.quote", next: "@litstring" }],
      [/\$"/, { token: "string.quote", next: "@interpolatedstring" }],
      [/'[^\\']'/, "string"],
      [/(')(@escapes)(')/, ["string", "string.escape", "string"]],
      [/'/, "string.invalid"],
    ],
    qualified: [
      [/[a-zA-Z_][\w]*/, {
        cases: {
          "@keywords": { token: "keyword.$0" },
          "@default": "identifier",
        },
      }],
      [/\./, "delimiter"],
      ["", "", "@pop"],
    ],
    namespace: [
      { include: "@whitespace" },
      [/[A-Z]\w*/, "namespace"],
      [/[.=]/, "delimiter"],
      ["", "", "@pop"],
    ],
    comment: [
      [/[^/*]+/, "comment"],
      ["\\*/", "comment", "@pop"],
      [/[/*]/, "comment"],
    ],
    string: [
      [/[^\\"]+/, "string"],
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],
      [/"/, { token: "string.quote", next: "@pop" }],
    ],
    litstring: [
      [/[^"]+/, "string"],
      [/""/, "string.escape"],
      [/"/, { token: "string.quote", next: "@pop" }],
    ],
    litinterpstring: [
      [/[^"{]+/, "string"],
      [/""/, "string.escape"],
      [/{{/, "string.escape"],
      [/}}/, "string.escape"],
      [/{/, { token: "string.quote", next: "root.litinterpstring" }],
      [/"/, { token: "string.quote", next: "@pop" }],
    ],
    interpolatedstring: [
      [/[^\\"{]+/, "string"],
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],
      [/{{/, "string.escape"],
      [/}}/, "string.escape"],
      [/{/, { token: "string.quote", next: "root.interpolatedstring" }],
      [/"/, { token: "string.quote", next: "@pop" }],
    ],
    whitespace: [
      [/^[ \t\v\f]*#((r)|(load))(?=\s)/, "directive.csx"],
      [/^[ \t\v\f]*#\w.*$/, "namespace.cpp"],
      [/[ \t\v\f\r\n]+/, ""],
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"],
    ],
  },
} as unknown as MonacoNs.languages.IMonarchLanguage;

export const WFM_CSHARP_SNIPPETS: Array<{ name: string; text: string; doc: string }> = [
  { name: "join", text: "Join(${1:arr}, x => x.${2:leftId}, y => y.${3:rightId}, (x, y) => ((JObject)x).AddOrUpdate(\"${4:prop}\", (${5:type})${6:value}));", doc: "Join" },
  { name: "where", text: "Where(x => x.${1:left} == ${2:right});", doc: "Where" },
  { name: "select", text: "Select(x => ${1:value});", doc: "Select" },
  { name: "jo", text: "JObject.FromObject(new {\n\t$0\n});\n", doc: "JObject.FromObject" },
  { name: "ja", text: "JArray.FromObject(new []{\n\t$0\n});\n", doc: "JArray.FromObject" },
  { name: "remove", text: "Remove(\"${1:name}\");", doc: "JObject.Remove" },
  { name: "addOrUpdate", text: "AddOrUpdate(\"${1:name}\" , ${2:value});", doc: "JObject.AddOrUpdate" },
  { name: "castjo", text: "((JObject)${1:value});", doc: "Cast JObject" },
  { name: "castja", text: "((JArray)${1:value});", doc: "Cast JArray" },
  { name: "$", text: "$\"{${1:value}}\"", doc: "string interpolation" },
  { name: "salError", text: "Error = SalError.CreateDto(\"${1:code}\",\"${2:message}\");", doc: "salError" },
  { name: "successTry", text: "try\n{\n\t${1:value}\n}\ncatch (Exception e)\n{\n\treturn Failed;\n}\n", doc: "try/catch" },
  { name: "re", text: "ReturnProperties = new [] {\n\t\"${1:value}\"\n});\n", doc: "ReturnProperties" },
  { name: "qbc", text: "QB.Condition(\"${1:type}\" , \"${2:name}\" ,\"${3:compare}\",${4:value}),", doc: "QB.Condition" },
  { name: "qbg", text: "QB.Group(\"${1:compare}\" , new [] {\n\t${2:value}\n}),\n", doc: "QB.Group" },
  { name: "qbf", text: "QB.Filter(\"${1:compare}\" , new [] {\n\t${2:value}\n});\n", doc: "QB.Filter" },
  { name: "qbo", text: "QB.OrderBy(\"${1:name}\" , ${2:desc});", doc: "QB.OrderBy" },
  { name: "dqbc", text: "DQB.Condition(\"${1:name}\" ,\"${2:compare}\",${3:value}),", doc: "DQB.Condition" },
  { name: "dqbg", text: "DQB.Group(new [] {\n\t${1:value}\n}),\n", doc: "DQB.Group" },
  { name: "dqbf", text: "DQB.Filters( new [] {\n\t${1:value}\n});\n", doc: "DQB.Filters" },
  { name: "dqbo", text: "DQB.OrderData(\"${1:name}\" , ${2:desc});", doc: "DQB.OrderData" },
  { name: "crudData", text: "var body = new {\n\t${1:value}\n};\n\nreturn new CRUDData(body);\n", doc: "CRUDData" },
  { name: "commandData", text: "var body = new {\n\t${1:value}\n};\n\nreturn new CommandData(body);\n", doc: "CommandData" },
  { name: "subData", text: "var body = new {\n\t${1:value}\n};\n\nreturn new SubData(body);\n", doc: "SubData" },
  { name: "eventData", text: "var body = new {\n\t${1:value}\n};\n\nreturn new EventData(body);\n", doc: "EventData" },
  { name: "successResult", text: "return new SuccessResult(new {ProcessResultName} {\n\t${1:value}\n});\n", doc: "SuccessResult — {ProcessResultName} подставляется автоматически" },
  { name: "failedResult", text: "return Failed((JObject)Error);", doc: "FailedResult" },
  { name: "prop", text: "public ${2:object} ${1:name} { get; set; }\n", doc: "prop" },
];

export const WFM_KEYWORDS: string[] = [
  "ReturnProperties", "Operator",
  "Context", "Command", "CommandResult", "InitCommand", "InitObject", "Sub",
  "JObject", "JArray", "Session",
  "Result", "ResultCode", "ResultCodes", "Success", "Error", "Descriptor", "Event",
  "Equal", "NotEqual", "LessThan", "LessThanOrEqual", "GreaterThan", "GreaterThanOrEqual",
  "StartsWith", "Contains", "EndsWith", "Regex", "RegexCase",
  "NotStartsWith", "NotContains", "NotEndsWith", "NotRegex", "NotRegexCase",
  "In", "NotIn", "Between", "NotBetween", "IsNull", "IsNotNull",
  "JsonIn", "JsonNotIn",
  "And", "Or",
];

let languageRegistered = false;

export function registerWfmCSharpLanguage(monaco: Monaco): void {
  if (languageRegistered) return;
  monaco.languages.setMonarchTokensProvider("csharp", languageDefinition);
  languageRegistered = true;
}

export function defineWfmTheme(monaco: Monaco): void {
  ensureWfmDarkTheme(monaco, themeRules);
}

export interface WfmCompletionContext {
  stageNames: string[];
  currentStageName: string;
  processResultName: string;
}

/**
 * Map<modelUri, contextGetter>: позволяет регистрировать completion
 * provider один раз глобально, а контекст (имена стейджей, processResultName)
 * подбирать per-editor по URI его модели.
 */
const editorContexts = new Map<string, () => WfmCompletionContext>();
let completionProviderRegistered = false;

function registerGlobalCompletionProvider(monaco: Monaco): void {
  if (completionProviderRegistered) return;
  monaco.languages.registerCompletionItemProvider("csharp", {
    // Только "." — для цепочек вызовов. Пробел/новая строка НЕ должны триггерить
    // показ snippets (иначе Enter случайно принимает первый вариант).
    triggerCharacters: ["."],
    provideCompletionItems: (model: MonacoNs.editor.ITextModel, position: MonacoNs.Position) => {
      const getCtx = editorContexts.get(model.uri.toString());
      if (!getCtx) {
        return { suggestions: [] };
      }

      const word = model.getWordUntilPosition(position);
      const range: MonacoNs.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const ctx = getCtx();

      const returnSuggestions: MonacoNs.languages.CompletionItem[] = ctx.stageNames
        .filter((n) => n && n !== ctx.currentStageName)
        .map((n) => ({
          label: `return ${n};`,
          kind: monaco.languages.CompletionItemKind.Reference,
          insertText: `return ${n};`,
          documentation: `Переход к стейджу "${n}"`,
          range,
          sortText: `0_${n}`,
        }));

      const snippetSuggestions: MonacoNs.languages.CompletionItem[] = WFM_CSHARP_SNIPPETS.map((s) => ({
        label: s.name,
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: s.text.replace(/\{ProcessResultName\}/g, ctx.processResultName),
        documentation: s.doc,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
      }));

      const keywordSuggestions: MonacoNs.languages.CompletionItem[] = WFM_KEYWORDS.map((kw) => ({
        label: kw,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: kw,
        range,
      }));

      return {
        suggestions: [...returnSuggestions, ...snippetSuggestions, ...keywordSuggestions],
      };
    },
  });
  completionProviderRegistered = true;
}

export function setupWfmCSharp(monaco: Monaco): void {
  registerWfmCSharpLanguage(monaco);
  defineWfmTheme(monaco);
  registerGlobalCompletionProvider(monaco);
}

export function attachWfmContext(
  modelUri: string,
  getContext: () => WfmCompletionContext,
): () => void {
  editorContexts.set(modelUri, getContext);
  return () => {
    editorContexts.delete(modelUri);
  };
}

// ============================================================================
// Editor actions (hotkeys, привязанные к конкретному editor instance)
// ============================================================================

export interface StageEditorActionCallbacks {
  /** Shift+Alt+F — отформатировать текущий код. Вернуть новый текст или null. */
  onFormat?: (code: string) => Promise<string | null>;
  /**
   * Alt+Enter — по строке `return <Name>;`:
   * - если стейдж `Name` существует — открыть его в новой табе;
   * - если нет — открыть AddStageDialog с предзаполненным именем.
   */
  onStageRefFromReturn?: (stageName: string) => void;
  /**
   * Ctrl+Alt+Enter — по строке вида `Context.Foo` / `InitObject.Foo` /
   * `ProcessResult.Foo` — открыть редактор модели и свойство (создать если нет).
   */
  onCreateProperty?: (modelKind: "Context" | "InitObject" | "ProcessResult", propName: string) => void;
  /** Ctrl+Alt+R — вставить `ReturnProperties` из колонок CRUD-модели. */
  onInsertReturnProperties?: (editor: MonacoNs.editor.ICodeEditor) => void;
  /** Ctrl+Alt+P — вставить `InitObjectStructure` подпроцесса. */
  onInsertInitObjectStructure?: (editor: MonacoNs.editor.ICodeEditor) => void;
}

function parseReturnStageName(line: string): string | null {
  const m = /return\s+(\w+)\s*;/.exec(line);
  return m ? m[1] : null;
}

function parsePropertyAccess(line: string, column: number): { kind: "Context" | "InitObject" | "ProcessResult"; prop: string } | null {
  // Находим все совпадения "Kind.Prop" и выбираем то, что содержит column
  const re = /(Context|InitObject|ProcessResult)\.(\w+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line)) !== null) {
    const start = match.index + 1; // monaco columns 1-based
    const end = start + match[0].length;
    if (column >= start && column <= end) {
      return { kind: match[1] as "Context" | "InitObject" | "ProcessResult", prop: match[2] };
    }
  }
  return null;
}

export function registerStageEditorActions(
  editor: MonacoNs.editor.IStandaloneCodeEditor,
  monaco: Monaco,
  getCallbacks: () => StageEditorActionCallbacks,
): MonacoNs.IDisposable[] {
  const disposables: MonacoNs.IDisposable[] = [];

  // Shift+Alt+F — format
  disposables.push(editor.addAction({
    id: "wfm.format",
    label: "WFM: Format C#",
    keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
    run: async (ed) => {
      const cb = getCallbacks().onFormat;
      if (!cb) return;
      const value = ed.getValue();
      const formatted = await cb(value);
      if (formatted != null && formatted !== value) {
        ed.setValue(formatted);
      }
    },
  }));

  // Alt+Enter — create or open stage from `return <Name>;`
  disposables.push(editor.addAction({
    id: "wfm.stageFromReturn",
    label: "WFM: Create/Open stage from `return`",
    keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.Enter],
    run: (ed) => {
      const pos = ed.getPosition();
      const model = ed.getModel();
      if (!pos || !model) return;
      const line = model.getLineContent(pos.lineNumber);
      const stageName = parseReturnStageName(line);
      if (!stageName) return;
      getCallbacks().onStageRefFromReturn?.(stageName);
    },
  }));

  // Ctrl+Alt+Enter — Create Property for Context.X / InitObject.X / ProcessResult.X
  disposables.push(editor.addAction({
    id: "wfm.createProperty",
    label: "WFM: Create Property",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.Enter],
    run: (ed) => {
      const pos = ed.getPosition();
      const model = ed.getModel();
      if (!pos || !model) return;
      const line = model.getLineContent(pos.lineNumber);
      const parsed = parsePropertyAccess(line, pos.column);
      if (!parsed) return;
      getCallbacks().onCreateProperty?.(parsed.kind, parsed.prop);
    },
  }));

  // Ctrl+Alt+R — insert ReturnProperties from CRUD model columns
  disposables.push(editor.addAction({
    id: "wfm.insertReturnProperties",
    label: "WFM: Insert ReturnProperties",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyR],
    run: (ed) => {
      getCallbacks().onInsertReturnProperties?.(ed);
    },
  }));

  // Ctrl+Alt+P — insert InitObjectStructure for sub-process
  disposables.push(editor.addAction({
    id: "wfm.insertInitObjectStructure",
    label: "WFM: Insert InitObject Structure",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyP],
    run: (ed) => {
      getCallbacks().onInsertInitObjectStructure?.(ed);
    },
  }));

  return disposables;
}

/**
 * Утилита для вставки текста в текущую позицию редактора
 * (для Ctrl+Alt+R / Ctrl+Alt+P после получения ответа с сервера).
 */
export function insertTextAtCursor(
  editor: MonacoNs.editor.IStandaloneCodeEditor,
  text: string,
): void {
  const pos = editor.getPosition();
  if (!pos) return;
  editor.executeEdits("wfm-insert", [
    {
      range: {
        startLineNumber: pos.lineNumber,
        endLineNumber: pos.lineNumber,
        startColumn: pos.column,
        endColumn: pos.column,
      },
      text,
      forceMoveMarkers: true,
    },
  ]);
  editor.focus();
}
