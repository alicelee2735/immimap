/**
 * Flags organization names that look like street addresses rather than legal
 * entity names. Used by the EOIR sync as a review signal — never to block a
 * write or rewrite a stored name.
 *
 * Matches:
 *  - any digit
 *  - the words "Extension" or "Suite"
 *  - street suffixes used by `normalizeStreet` plus the common set called out
 *    for this check (Street/St, Avenue/Ave, Road/Rd, Boulevard/Blvd,
 *    Drive/Dr, Lane/Ln, Court/Ct, Place/Pl, Way, Highway/Hwy)
 *
 * Short suffixes (St, Dr, Ct, Pl, Way) also fire on genuine names
 * ("St. Mary's", "Make the Road"). That is expected: a reviewer decides.
 */

export type AddressLikeReason = "digit" | "extension" | "suite" | "street_suffix";

const STREET_SUFFIX =
  /\b(?:streets?|st|str|avenues?|ave|roads?|rd|boulevards?|blvd|drives?|dr|lanes?|ln|courts?|ct|places?|pl|ways?|highways?|hwy)\b\.?/i;

export function addressLikeNameReasons(name: string): AddressLikeReason[] {
  const reasons: AddressLikeReason[] = [];
  if (/\d/.test(name)) reasons.push("digit");
  if (/\bextension\b/i.test(name)) reasons.push("extension");
  if (/\b(?:suite|ste)\b\.?/i.test(name)) reasons.push("suite");
  if (STREET_SUFFIX.test(name)) reasons.push("street_suffix");
  return reasons;
}

export function isAddressLikeName(name: string): boolean {
  return addressLikeNameReasons(name).length > 0;
}
