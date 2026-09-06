import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { TranslationProvider, LocalizedContent, translateText } from "./TranslationProvider";
import { BackLink } from "../components/BackLink";
import { languageNames, type LocaleKey } from "./locales";
import catalogs from "./messages.json";
import messages from "./messages.en.json";

test("every advertised language has every source message and preserves interpolation slots", () => {
  for (const locale of Object.keys(languageNames).filter(key => key !== "en")) {
    const dictionary = catalogs[locale as keyof typeof catalogs] as Record<string, string>;
    for (const source of messages) {
      assert.ok(dictionary[source]?.trim(), `${locale}: missing ${source}`);
      const slots = (text: string) => (text.match(/\{\d+\}/g) ?? []).sort();
      assert.deepEqual(slots(dictionary[source]), slots(source), `${locale}: ${source}`);
    }
  }
});

test("localized dropdowns retain API values, and accessibility labels translate", () => {
  for (const locale of Object.keys(catalogs) as LocaleKey[]) {
    const html = renderToStaticMarkup(<TranslationProvider locale={locale}><LocalizedContent>
      <select aria-label="Affected part" defaultValue="Leaf"><option>Leaf</option><option>Stem</option></select>
      <input placeholder="Anything else you noticed?" defaultValue="my own words" />
      <span translate="no">Rice</span>
    </LocalizedContent></TranslationProvider>);
    assert.match(html, /value="Leaf" selected=""/);
    assert.match(html, /value="Stem"/);
    assert.match(html, /value="my own words"/);
    assert.match(html, /translate="no">Rice</);
    assert.ok(!html.includes('aria-label="Affected part"'), locale);
    assert.ok(!html.includes('placeholder="Anything else you noticed?"'), locale);
  }
});

test("dynamic labels translate without changing identifiers or numbers", () => {
  const hi = catalogs.hi;
  assert.equal(translateText("Rice scan", "hi"), hi["{0} scan"].replace("{0}", hi.Rice));
  assert.equal(translateText("WF-24041", "hi"), "WF-24041");
  assert.equal(translateText("87%", "hi"), "87%");
  assert.equal(translateText("Leaf · Vegetative", "hi"), `${hi.Leaf} · ${hi.Vegetative}`);
  assert.equal(translateText("  Scan a crop  ", "en"), "  Scan a crop  ");
});

test("back links work on direct entry without external browser history", () => {
  for (const [path, target] of [
    ["/farmer/history/record-id", "/farmer/history"],
    ["/farmer/history", "/farmer"],
    ["/farmer/scan", "/farmer"],
    ["/insights/district/cuttack", "/insights"],
    ["/insights/intelligence", "/insights"],
    ["/farmer", "/workspaces"],
    ["/transparency", "/"],
  ]) {
    const html = renderToStaticMarkup(<Router ssrPath={path}><BackLink /></Router>);
    assert.ok(html.includes(`href="${target}"`), path);
  }
});
