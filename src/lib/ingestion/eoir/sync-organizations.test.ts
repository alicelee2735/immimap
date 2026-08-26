import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLegacyKeyV1,
  buildNaturalKey,
  toOrganizationRow,
} from "./normalize";
import { buildUpdatePayload, planChanges } from "./sync-organizations";
import type { ExistingRow } from "./sync-organizations";
import type { EoirOfficeRecord } from "./types";

function record(overrides: Partial<EoirOfficeRecord> = {}): EoirOfficeRecord {
  return {
    name: "Casa Cornelia Law Center",
    officeLabel: "Principal Office",
    street: "2760 Fifth Avenue, Suite 200",
    city: "San Diego",
    state: "CA",
    zip: "92103",
    phone: "(619) 231-7788",
    dateRecognized: "01/01/00",
    expirationDate: "01/01/30",
    status: "Active",
    pendingRenewal: false,
    sourcePage: 20,
    ...overrides,
  };
}

function existing(overrides: Partial<ExistingRow> = {}): ExistingRow {
  return {
    id: "row-1",
    legacy_id: null,
    name: "Casa Cornelia Law Center",
    city: "San Diego",
    state: "CA",
    address: "2760 Fifth Avenue, Suite 200, San Diego, CA 92103",
    lat: 32.7,
    lng: -117.1,
    description: null,
    pricing: null,
    intake_status: null,
    languages: null,
    ...overrides,
  };
}

test("a record with no stored counterpart is inserted", () => {
  const { changes, duplicates } = planChanges([record()], []);

  assert.equal(changes.length, 1);
  assert.equal(changes[0].action, "insert");
  assert.equal(duplicates.length, 0);
});

test("a record already stored under its natural key is updated in place", () => {
  const value = record();
  const { changes } = planChanges(
    [value],
    [existing({ legacy_id: buildNaturalKey(value) })],
  );

  assert.equal(changes[0].action, "update");
  assert.equal(changes[0].existingId, "row-1");
});

test("a row stored under the v1 key is re-keyed, not duplicated", () => {
  const value = record();
  const { changes } = planChanges(
    [value],
    [existing({ legacy_id: buildLegacyKeyV1(value) })],
  );

  assert.equal(changes[0].action, "rekey");
  assert.equal(changes[0].existingId, "row-1");
  assert.equal(changes[0].previousKey, buildLegacyKeyV1(value));
  assert.equal(changes[0].naturalKey, buildNaturalKey(value));
});

test("only one of several colliding offices may claim the v1-keyed row; the other is blocked as an unresolved lookalike", () => {
  const first = record({ street: "2760 Fifth Avenue, Suite 200" });
  const second = record({ street: "999 Broadway" });
  assert.equal(buildLegacyKeyV1(first), buildLegacyKeyV1(second));

  const { changes, duplicates } = planChanges(
    [first, second],
    [existing({ legacy_id: buildLegacyKeyV1(first) })],
  );

  // The first office re-keys the v1 row in place. The second describes the
  // same name/city/ZIP and, with every existing row now a fuzzy candidate
  // (fix: the candidate pool is no longer limited to key-less rows), it
  // fuzzy-matches that same row and is blocked rather than silently
  // inserted as a possible duplicate — a human must confirm it is really a
  // distinct office before it lands.
  assert.deepEqual(
    changes.map((change) => change.action),
    ["rekey", "skip"],
  );
  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0].name, second.name);
});

test("key-less lookalike rows are flagged and the insert is blocked", () => {
  const value = record();
  const { changes, duplicates } = planChanges([value], [existing()]);

  // Never inserted: a human must resolve the match first.
  assert.equal(changes[0].action, "skip");
  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0].conflictsWith, "Casa Cornelia Law Center");
  assert.equal(duplicates[0].existingId, "row-1");
});

test("a lookalike is flagged and blocked even when the names are not identical", () => {
  const value = record({
    name: "California Immigration Project (CIP)",
    city: "Sacramento",
    zip: "95816",
    street: "2210 K Street, Suite 101",
  });

  const { changes, duplicates } = planChanges(
    [value],
    [
      existing({
        name: "California Immigration Project",
        city: "Sacramento",
        address: "2210 K Street, Suite 101, Sacramento, CA 95816",
      }),
    ],
  );

  assert.equal(changes[0].action, "skip");
  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0].conflictsWith, "California Immigration Project");
  assert.ok(duplicates[0].matchedOn?.includes("project"));
});

test("a lookalike is flagged and blocked even when the existing row already has a legacy_id under another scheme", () => {
  // The structural gap this guards against: a curated row keyed under one
  // scheme (e.g. `svc-*`) is not "resolved" against a different scheme
  // (`doj-ra-*`) just because it has *a* legacy_id. The fuzzy matcher must
  // still see it.
  const value = record();
  const { changes, duplicates } = planChanges(
    [value],
    [existing({ legacy_id: "svc-casa-cornelia-law-center" })],
  );

  assert.equal(changes[0].action, "skip");
  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0].existingId, "row-1");
});

test("exact same-scheme matches still short-circuit before the fuzzy matcher ever runs", () => {
  // A row already reconciled under its own scheme must never also be
  // reported as a fuzzy "duplicate" of the very record that resolves it.
  const value = record();
  const { changes, duplicates } = planChanges(
    [value],
    [existing({ legacy_id: buildNaturalKey(value) })],
  );

  assert.equal(changes[0].action, "update");
  assert.equal(duplicates.length, 0);
});

test("curated values the roster cannot know are left in place", () => {
  const row = toOrganizationRow(record(), undefined);
  const { payload, preserved } = buildUpdatePayload(
    row,
    existing({
      name: "Casa Cornelia Law Center — San Diego",
      description: "Hand-written summary of what this office actually does.",
      pricing: "Low-cost",
      intake_status: "WAITLISTED",
    }),
  );

  assert.deepEqual(preserved.sort(), [
    "description",
    "intake_status",
    "name",
    "pricing",
    "verified",
  ]);
  assert.ok(!("name" in payload));
  assert.ok(!("description" in payload));
  assert.ok(!("pricing" in payload));
  assert.ok(!("intake_status" in payload));
  assert.ok(!("verified" in payload));

  // Columns the roster is authoritative for still get written.
  assert.equal(payload.legacy_id, row.legacy_id);
  assert.equal(payload.address, row.address);
  assert.equal(payload.city, row.city);
  assert.equal(payload.lat, row.lat);
});

test("curated columns are filled when the row has nothing there", () => {
  const row = toOrganizationRow(record(), undefined);
  const { payload, preserved } = buildUpdatePayload(row, existing());

  // A stored row always has a name, so that one is held back here.
  // verified is never written on update regardless of the stored value.
  assert.deepEqual(preserved.sort(), ["name", "verified"]);
  assert.equal(payload.description, row.description);
  assert.equal(payload.pricing, row.pricing);
  assert.equal(payload.intake_status, row.intake_status);
  assert.ok(!("verified" in payload));
});

test("an empty string counts as nothing, not as a curated value", () => {
  const row = toOrganizationRow(record(), undefined);
  const { payload } = buildUpdatePayload(row, existing({ description: "" }));

  assert.equal(payload.description, row.description);
});

test("a language gap is filled with the English baseline, explicitly unconfirmed", () => {
  const row = toOrganizationRow(record(), undefined);
  const { payload, preserved } = buildUpdatePayload(row, existing());

  assert.ok(!preserved.includes("languages"));
  assert.deepEqual(payload.languages, ["English"]);
  assert.equal(payload.languages_confirmed, false);
});

test("an empty array counts as nothing, same as null, for the language gap", () => {
  const row = toOrganizationRow(record(), undefined);
  const { payload, preserved } = buildUpdatePayload(
    row,
    existing({ languages: [] }),
  );

  assert.ok(!preserved.includes("languages"));
  assert.deepEqual(payload.languages, ["English"]);
  assert.equal(payload.languages_confirmed, false);
});

test("a confirmed language list is never overwritten by the roster baseline", () => {
  const row = toOrganizationRow(record(), undefined);
  const { payload, preserved } = buildUpdatePayload(
    row,
    existing({ languages: ["English", "Spanish"] }),
  );

  assert.ok(preserved.includes("languages"));
  assert.ok(!("languages" in payload));
  assert.ok(!("languages_confirmed" in payload));
});

test("repeat runs against stored rows produce no inserts", () => {
  const records = [
    record(),
    record({ name: "Jewish Family Service of San Diego", street: "8804 Balboa Ave" }),
  ];
  const rows = records.map((value, index) =>
    existing({ id: `row-${index}`, legacy_id: buildNaturalKey(value), name: value.name }),
  );

  const { changes } = planChanges(records, rows);

  assert.ok(changes.every((change) => change.action === "update"));
});

test("new EOIR rows are inserted unverified", () => {
  const row = toOrganizationRow(record(), undefined);
  assert.equal(row.verified, false);
  assert.equal(row.org_type, "NGO");
});

test("new EOIR rows infer an English baseline, explicitly unconfirmed", () => {
  const row = toOrganizationRow(record(), undefined);
  assert.deepEqual(row.languages, ["English"]);
  assert.equal(row.languages_confirmed, false);
});

test("EOIR rows do not carry default service tags", () => {
  const row = toOrganizationRow(record(), undefined);
  assert.ok(!("services" in row));
  assert.ok(!("services_offered" in row));
});
