import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeProfile, profileInitials, emptyProfile } from "./profile";

test("invalid browser storage recovers to usable defaults", () => {
  assert.deepEqual(normalizeProfile(null), emptyProfile);
  assert.deepEqual(normalizeProfile({name:42, farm:[], crops:"Rice", workspace:"admin", notifications:"false"}), emptyProfile);
});
test("profile data preserves valid preferences and filters unsupported crops", () => {
  assert.deepEqual(normalizeProfile({firstName:" A ",lastName:" Farmer ",city:" Pune ",name:"  A Farmer  ", farm:" West field ", crops:["Rice","Rice","Potato","Unsupported",null],workspace:"insights",notifications:false}), {firstName:"A",lastName:"Farmer",city:"Pune",name:"A Farmer",farm:"West field",crops:["Rice","Potato"],workspace:"insights",notifications:false});
  assert.equal(normalizeProfile({name:"x".repeat(1000)}).name.length,80);
});
test("avatars handle blank, single and multiple names", () => {
  assert.equal(profileInitials(""),"WF");
  assert.equal(profileInitials("Shivam"),"S");
  assert.equal(profileInitials("  Asha   Patil "),"AP");
});
test("profile photos accept bounded JPEG data and reject remote or executable URLs", () => {
  assert.equal(normalizeProfile({avatar:"data:image/jpeg;base64,YWJj"}).avatar,"data:image/jpeg;base64,YWJj");
  for (const avatar of ["https://example.com/a.jpg", "javascript:alert(1)", "data:image/jpeg;base64," + "A".repeat(400000)]) {
    assert.equal(normalizeProfile({avatar}).avatar, undefined);
  }
});
