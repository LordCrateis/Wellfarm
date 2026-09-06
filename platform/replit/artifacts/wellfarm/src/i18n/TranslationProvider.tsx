import { Children, createContext, useContext, useEffect, useMemo, cloneElement, isValidElement, type ReactNode, type ReactElement } from "react";
import { type LocaleKey } from "./locales";
import catalogs from "./messages.json";

const LocaleContext = createContext<LocaleKey>("en");
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
const dictionaries = catalogs as Record<string, Record<string, string>>;
const escapePattern = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = Object.fromEntries(Object.entries(dictionaries).map(([locale, dictionary]) => [locale,
  Object.entries(dictionary).filter(([source]) => /\{\d+\}/.test(source)).map(([source, target]) => ({
    regex: new RegExp("^" + source.split(/(\{\d+\})/).map(part => /^\{\d+\}$/.test(part) ? "(.+?)" : escapePattern(part)).join("") + "$"),
    target,
  })),
]));

export function translateText(text: string, locale: LocaleKey): string {
  if (locale === "en" || !text.trim()) return text;
  const key = normalize(text);
  const dictionary = dictionaries[locale] ?? {};
  const exact = dictionary[key];
  if (exact) return text.replace(text.trim(), exact);
  for (const { regex, target } of patterns[locale] ?? []) {
    const match = key.match(regex);
    if (match) return target.replace(/\{(\d+)\}/g, (_, index) => dictionary[normalize(match[Number(index) + 1])] ?? match[Number(index) + 1]);
  }
  // Composite labels keep values, place names, identifiers, and user input intact.
  return text.split(/(\s*[·|]\s*|\n)/).map(part => dictionary[normalize(part)] ?? part).join("");
}

export function TranslationProvider({ locale, children }: { locale: LocaleKey; children: ReactNode }) {
  useEffect(() => { document.documentElement.lang = locale === "or" ? "or" : locale; }, [locale]);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useTranslation() {
  const locale = useContext(LocaleContext);
  return useMemo(() => ({ locale, t: (text: string) => translateText(text, locale) }), [locale]);
}

// Translate presentation text at React boundaries, never DOM mutations. Preserve
// raw form values, event handlers, keys, refs and machine-readable/API properties.
export function LocalizedContent({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  function visit(node: ReactNode): ReactNode {
    if (typeof node === "string") return t(node);
    if (Array.isArray(node)) return Children.map(node, visit);
    if (!isValidElement(node)) return node;
    const element = node as ReactElement<Record<string, unknown>>;
    if (element.props.translate === "no") return element;
    const props: Record<string, unknown> = {};
    if (typeof element.type === "string") {
      for (const key of ["placeholder", "title", "alt", "aria-label"]) {
        if (typeof element.props[key] === "string") props[key] = t(element.props[key] as string);
      }
      // An option's implicit value is its English text: retain that API value.
      if (element.type === "option" && element.props.value === undefined && typeof element.props.children === "string") props.value = element.props.children;
    }
    if (element.props.children !== undefined) props.children = visit(element.props.children as ReactNode);
    return cloneElement(element, props);
  }
  return <>{visit(children)}</>;
}
