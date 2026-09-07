import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeProfile, profileInitials, emptyProfile } from "./profile";

test("invalid browser storage recovers to usable defaults", () => {
  assert.deepEqual(normalizeProfile(null), emptyProfile);
  assert.deepEqual(normalizeProfile({name:42, farm:[], crops:"Rice", workspace:"admin", notifications:"false"}), emptyProfile);
});
test("profile data preserves valid preferences and filters unsupported crops", () => {
  assert.deepEqual(normalizeProfile({name:"  A Farmer  ", farm:" West field ", crops:["Rice","Rice","Potato","Unsupported",null],workspace:"insights",notifications:false}), {name:"A Farmer",farm:"West field",crops:["Rice","Potato"],workspace:"insights",notifications:false});
  assert.equal(normalizeProfile({name:"x".repeat(1000)}).name.length,80);
});
test("avatars handle blank, single and multiple names", () => {
  assert.equal(profileInitials(""),"WF");
  assert.equal(profileInitials("Shivam"),"S");
  assert.equal(profileInitials("  Asha   Patil "),"AP");
});
