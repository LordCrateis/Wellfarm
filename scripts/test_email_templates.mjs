import assert from "node:assert/strict";
import { emailTemplates } from "../supabase/email-templates/templates.mjs";

const expected = ["confirmation", "recovery", "magic_link", "invite", "email_change", "reauthentication"];
assert.deepEqual(Object.keys(emailTemplates), expected);

for (const [name, template] of Object.entries(emailTemplates)) {
  assert.ok(template.subject.length > 8 && template.subject.length < 70, `${name} needs a concise subject`);
  assert.match(template.html, /Wellfarm/);
  assert.match(template.html, /No marketing, no tracking/);
  assert.doesNotMatch(template.html, /<img\b/i, `${name} should not depend on remote images`);
  assert.doesNotMatch(template.html, /https?:\/\/(?!api\.supabase\.com)/i, `${name} should not add tracking or marketing links`);
}

assert.match(emailTemplates.confirmation.html, /{{ \.Token }}/);
assert.match(emailTemplates.reauthentication.html, /{{ \.Token }}/);
for (const name of ["recovery", "magic_link", "invite", "email_change"]) {
  assert.match(emailTemplates[name].html, /{{ \.ConfirmationURL }}/);
}

console.log("Wellfarm email template checks passed.");
