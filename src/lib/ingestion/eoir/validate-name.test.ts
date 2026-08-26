import assert from "node:assert/strict";
import test from "node:test";

import { addressLikeNameReasons, isAddressLikeName } from "./validate-name";

test("a legal entity name is not flagged", () => {
  assert.equal(isAddressLikeName("Church World Service NC"), false);
  assert.deepEqual(addressLikeNameReasons("Catholic Charities of Sacramento, Inc."), []);
});

test("the Durham nested-office parse is flagged", () => {
  const name = "504 West Chapel Hill Street/Durham NC Extension Office";
  assert.equal(isAddressLikeName(name), true);
  assert.deepEqual(addressLikeNameReasons(name).sort(), [
    "digit",
    "extension",
    "street_suffix",
  ]);
});

test("Extension, Suite, and digits each flag independently", () => {
  assert.deepEqual(addressLikeNameReasons("Durham NC Extension Office"), ["extension"]);
  assert.deepEqual(addressLikeNameReasons("Main Suite Legal Aid"), ["suite"]);
  assert.deepEqual(addressLikeNameReasons("Hope 4Immigrants a NJ Nonprofit Corporation"), [
    "digit",
  ]);
});

test("street suffixes listed for this check are flagged", () => {
  for (const name of [
    "117 South Crest Drive",
    "West Main Street",
    "Azle Avenue Baptist Church",
    "Jericho Road Ministries, Inc.",
    "101 N. Avenue N - Lubbock Extension Office",
  ]) {
    assert.equal(isAddressLikeName(name), true, name);
  }
});
