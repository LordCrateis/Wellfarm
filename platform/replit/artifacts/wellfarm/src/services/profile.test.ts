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
test("profile photos accept bounded JPEG data or HTTPS URLs and reject unsafe URLs", () => {
  assert.equal(normalizeProfile({avatar:"data:image/jpeg;base64,YWJj"}).avatar,"data:image/jpeg;base64,YWJj");
  assert.equal(normalizeProfile({avatar:"https://example.com/avatar.jpg"}).avatar,"https://example.com/avatar.jpg");
  assert.equal(normalizeProfile({avatar:"http://example.com/avatar.jpg"}).avatar,undefined);
  for (const avatar of ["javascript:alert(1)", "data:image/jpeg;base64," + "A".repeat(400000)]) {
    assert.equal(normalizeProfile({avatar}).avatar, undefined);
  }
});
