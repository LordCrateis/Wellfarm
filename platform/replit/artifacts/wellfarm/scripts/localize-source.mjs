// One-time mechanical migration. Run with --extract for a fresh message inventory.
import ts from "../../../node_modules/typescript/lib/typescript.js";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../src");
const files = ["pages/Pages.tsx", "pages/not-found.tsx", "components/AppShell.tsx", "components/ScanResultCard.tsx", "components/Status.tsx", "components/WellfarmMap.tsx", "components/error-boundary.tsx", "components/BackLink.tsx"];
const normalize = s => s.replace(/\s+/g, " ").trim();
const messages = new Set(["Zoom in", "Zoom out", "Close", "Back to home", "Back to workspaces", "Back to field home", "Back to scan history", "Back to regional overview"]);
function add(s, visible = false) {
  s = normalize(s);
  if (!/[a-zA-Z]/.test(s) || s.length < 2 || /(?:https?:|hsl\(|className|@\/|@workspace|lucide|data-testid|<[^>]+>|^[./#]|^[a-z]+[-:][a-z]|^image\/)/.test(s)) return;
  if (/\b(?:px-|py-|mt-|mb-|flex|grid|rounded|font-|text-|bg-|border-|w-|h-)\S*/.test(s)) return;
  if (visible || s.includes(" ") || /^[A-Z][a-z]+$/.test(s) || ["low", "moderate", "high", "done", "working", "pending", "saved", "uploaded"].includes(s)) messages.add(s);
}
for (const name of [...files, "data/mock.ts", "services/adapters.ts", "services/scan-analysis.ts", "services/advisory.ts", "i18n/locales.ts"]) {
  const path = resolve(root, name);
  let source = readFileSync(path, "utf8");
  if (!process.argv.includes("--extract")) {
    source = source.replace('import { LocalizedContent } from "@/i18n/TranslationProvider";\n', "").replaceAll("<LocalizedContent>{", "").replaceAll("}</LocalizedContent>", "");
  }
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, name.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits = [];
  function visit(node) {
    if (ts.isJsxText(node)) add(node.text, true);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) add(node.text);
    if (ts.isTemplateExpression(node)) add(node.head.text + node.templateSpans.map((s, i) => `{${i}}${s.literal.text}`).join(""));
    // Wrap component return values without changing state, callbacks, or props.
    if (files.includes(name) && !source.includes('import { LocalizedContent }')) {
      let expression;
      if (ts.isReturnStatement(node)) expression = node.expression;
      if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) expression = node.body;
      if (expression && /<[A-Za-z>]/.test(expression.getText(ast))) {
        let owner = node;
        while (owner && !ts.isFunctionDeclaration(owner) && !ts.isArrowFunction(owner) && !ts.isFunctionExpression(owner)) owner = owner.parent;
        const componentName = owner?.name?.text ?? (owner && ts.isVariableDeclaration(owner.parent) ? owner.parent.name.getText(ast) : "");
        // Only wrap expressions whose top-level structure is JSX or a JSX conditional.
        let unwrapped = expression;
        while (ts.isParenthesizedExpression(unwrapped)) unwrapped = unwrapped.expression;
        if (/^[A-Z]/.test(componentName) && (ts.isJsxElement(unwrapped) || ts.isJsxSelfClosingElement(unwrapped) || ts.isJsxFragment(unwrapped) || ts.isConditionalExpression(unwrapped))) {
          edits.push([expression.getStart(ast), "<LocalizedContent>{", true], [expression.end, "}</LocalizedContent>", false]);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (!process.argv.includes("--extract") && edits.length) {
    for (const [pos, value] of edits.sort((a,b) => b[0]-a[0])) source = source.slice(0,pos)+value+source.slice(pos);
    source = 'import { LocalizedContent } from "@/i18n/TranslationProvider";\n'+source;
    source = source.replaceAll("locales[locale]", "locales.en");
    writeFileSync(path, source);
  }
}
writeFileSync(resolve(root, "i18n/messages.en.json"), JSON.stringify([...messages].sort(), null, 2)+"\n");
console.log(`Extracted ${messages.size} source messages`);
