import { SyntaxStyle } from "@opentui/core";
import { THEME } from "./theme";

const MARKDOWN_PATTERNS = [
  /^#{1,6}\s/m,
  /```[\s\S]*?```/,
  /^```/m,
  /`[^`\n]+`/,
  /\*\*[^*\n]+\*\*/,
  /__[^_\n]+__/,
  /(?:^|[^*])\*[^*\n]+\*(?:[^*]|$)/m,
  /^\s*[-*+]\s/m,
  /^\s*\d+\.\s/m,
  /\[[^\]]+\]\([^)]+\)/,
  /^>\s/m,
  /^\|.+\|/m,
  /^---+$/m,
];

export function isMarkdown(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  return MARKDOWN_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function createOutputSyntaxStyle(): SyntaxStyle {
  return SyntaxStyle.fromStyles({
    default: { fg: THEME.text },

    // Markdown markup
    "markup.heading": { fg: THEME.accent, bold: true },
    "markup.heading.1": { fg: THEME.accent, bold: true },
    "markup.heading.2": { fg: THEME.accent, bold: true },
    "markup.strong": { fg: THEME.text, bold: true },
    "markup.italic": { fg: THEME.text, italic: true },
    "markup.raw": { fg: THEME.link, bg: THEME.inputBg },
    "markup.raw.block": { fg: THEME.text, bg: THEME.inputBg },
    "markup.link": { fg: THEME.link, underline: true },
    "markup.link.url": { fg: THEME.link, underline: true },
    "markup.link.label": { fg: THEME.link, underline: true },
    "markup.quote": { fg: THEME.textDim, italic: true },
    "markup.list": { fg: THEME.text },
    "markup.strikethrough": { fg: THEME.textDim },

    // Code syntax highlighting (Tree-sitter token scopes)
    keyword: { fg: "#FF7B72", bold: true },
    "keyword.import": { fg: "#FF7B72", bold: true },
    "keyword.operator": { fg: "#FF7B72" },
    "keyword.function": { fg: "#FF7B72", bold: true },
    "keyword.return": { fg: "#FF7B72", bold: true },
    "keyword.conditional": { fg: "#FF7B72", bold: true },
    "keyword.repeat": { fg: "#FF7B72", bold: true },
    string: { fg: THEME.link },
    "string.escape": { fg: "#79C0FF" },
    comment: { fg: THEME.textDim, italic: true },
    number: { fg: "#79C0FF" },
    "number.float": { fg: "#79C0FF" },
    boolean: { fg: "#79C0FF" },
    constant: { fg: "#79C0FF" },
    function: { fg: "#D2A8FF" },
    "function.call": { fg: "#D2A8FF" },
    "function.method": { fg: "#D2A8FF" },
    "function.method.call": { fg: "#D2A8FF" },
    "function.builtin": { fg: "#D2A8FF" },
    type: { fg: THEME.accent },
    "type.builtin": { fg: THEME.accent },
    constructor: { fg: THEME.accent },
    variable: { fg: THEME.text },
    "variable.member": { fg: "#79C0FF" },
    "variable.builtin": { fg: "#79C0FF" },
    "variable.parameter": { fg: THEME.text },
    property: { fg: "#79C0FF" },
    label: { fg: THEME.textDim },
    operator: { fg: "#FF7B72" },
    punctuation: { fg: THEME.text },
    "punctuation.bracket": { fg: THEME.text },
    "punctuation.delimiter": { fg: "#C9C9C9" },
    "punctuation.special": { fg: THEME.textDim },
    module: { fg: THEME.accent },
  });
}
