import assert from "node:assert/strict";
import test from "node:test";

import { parseRosterFallback, parseRosterPrimary } from "./parse-roster";
import type { PdfLine } from "./pdf-text";

function line(text: string, x = 40, page = 1): PdfLine {
  return {
    page,
    y: 100,
    runs: [{ text, x, y: 100, width: Math.max(text.length * 5, 10) }],
    text,
  };
}

function heading(text: string): PdfLine {
  return line(text, 300);
}

test("nested extension offices inherit the parent organization's legal name", () => {
  const lines = [
    heading("NORTH CAROLINA"),
    heading("Durham"),
    line("Church World Service NC 09/04/15 08/04/26 Active"),
    line("Principal Office"),
    line("504 West Chapel Hill Street, Suite 106"),
    line("Durham, NC 27701"),
    line("(919) 680-3585"),
    line("Active"),
    line("504 West Chapel Hill Street/Durham NC Extension Office"),
    line("504 West Chapel Hill Street, Suite 106"),
    line("Durham, NC 27701"),
    line("(919) 680-4310"),
  ];

  const parsed = parseRosterPrimary(lines);
  assert.equal(parsed.records.length, 2);

  assert.equal(parsed.records[0].name, "Church World Service NC");
  assert.equal(parsed.records[0].officeLabel, "Principal Office");
  assert.equal(parsed.records[0].street, "504 West Chapel Hill Street, Suite 106");
  assert.equal(parsed.records[0].phone, "(919) 680-3585");

  assert.equal(parsed.records[1].name, "Church World Service NC");
  assert.equal(
    parsed.records[1].officeLabel,
    "504 West Chapel Hill Street/Durham NC Extension Office",
  );
  assert.equal(parsed.records[1].street, "504 West Chapel Hill Street, Suite 106");
  assert.equal(parsed.records[1].phone, "(919) 680-4310");
  assert.notEqual(
    parsed.records[1].name,
    "504 West Chapel Hill Street/Durham NC Extension Office",
  );
});

test("an extension office that already prints the legal name keeps it", () => {
  const lines = [
    heading("ALABAMA"),
    heading("Montgomery"),
    line("Catholic Social Services Archdiocese of Mobile 09/09/25 09/09/31 Active"),
    line("Montgomery Extension Office"),
    line("4455 Narrow Lane Road"),
    line("Montgomery, AL 36116"),
    line("(334) 288-8890"),
  ];

  const parsed = parseRosterPrimary(lines);
  assert.equal(parsed.records.length, 1);
  assert.equal(
    parsed.records[0].name,
    "Catholic Social Services Archdiocese of Mobile",
  );
  assert.equal(parsed.records[0].officeLabel, "Montgomery Extension Office");
});

test("a following organization does not inherit the previous parent's name", () => {
  const lines = [
    heading("NORTH CAROLINA"),
    heading("Durham"),
    line("Church World Service NC 09/04/15 08/04/26 Active"),
    line("Principal Office"),
    line("504 West Chapel Hill Street, Suite 106"),
    line("Durham, NC 27701"),
    line("(919) 680-3585"),
    line("504 West Chapel Hill Street/Durham NC Extension Office"),
    line("504 West Chapel Hill Street, Suite 106"),
    line("Durham, NC 27701"),
    line("(919) 680-4310"),
    line("InStepp Inc. 10/03/16 03/12/26* (Pending Renewal) Active"),
    line("Principal Office"),
    line("3326 Durham-Chapel Hill Boulevard"),
    line("Durham, NC 27707"),
    line("(919) 680-8000"),
  ];

  const parsed = parseRosterPrimary(lines);
  assert.equal(parsed.records.length, 3);
  assert.equal(parsed.records[1].name, "Church World Service NC");
  assert.equal(parsed.records[2].name, "InStepp Inc.");
  assert.equal(parsed.records[2].officeLabel, "Principal Office");
});

test("fallback parser also inherits the parent name for nested extension offices", () => {
  const lines = [
    line("Church World Service NC 09/04/15 08/04/26 Active"),
    line("Principal Office"),
    line("504 West Chapel Hill Street, Suite 106"),
    line("Durham, NC 27701"),
    line("(919) 680-3585"),
    line("504 West Chapel Hill Street/Durham NC Extension Office"),
    line("504 West Chapel Hill Street, Suite 106"),
    line("Durham, NC 27701"),
    line("(919) 680-4310"),
  ];

  const parsed = parseRosterFallback(lines);
  assert.equal(parsed.records.length, 2);
  assert.equal(parsed.records[0].name, "Church World Service NC");
  assert.equal(parsed.records[1].name, "Church World Service NC");
  assert.equal(
    parsed.records[1].officeLabel,
    "504 West Chapel Hill Street/Durham NC Extension Office",
  );
});
