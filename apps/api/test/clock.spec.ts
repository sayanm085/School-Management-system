// apps/api/test/clock.spec.ts
import { describe, expect, test } from "vitest";

import { ROLE_PERMISSIONS } from "../src/common/authz/permissions";
import { businessToday, businessYear } from "../src/common/time/clock";

describe("business clock", () => {
  test("uses the Kolkata date, not the UTC date", () => {
    // 22:30 UTC on 31 October is already 1 November in Kolkata.
    const instant = new Date("2026-10-31T22:30:00Z");
    expect(businessToday(instant)).toBe("2026-11-01");
    expect(businessYear(instant)).toBe(2026);
  });

  test("rolls the year at the Kolkata new year", () => {
    const instant = new Date("2026-12-31T18:30:00Z");
    expect(businessToday(instant)).toBe("2027-01-01");
    expect(businessYear(instant)).toBe(2027);
  });
});

describe("B2 permissions", () => {
  test("staff and section management land on the expected roles", () => {
    expect(ROLE_PERMISSIONS.headmaster).toContain("staff.edit");
    expect(ROLE_PERMISSIONS.headmaster).toContain("sections.manage");
    expect(ROLE_PERMISSIONS.clerk).toContain("staff.create");
    expect(ROLE_PERMISSIONS.clerk).toContain("staff.edit");
    expect(ROLE_PERMISSIONS.teacher).not.toContain("staff.create");
    expect(ROLE_PERMISSIONS.teacher).not.toContain("sections.manage");
    expect(ROLE_PERMISSIONS.management).not.toContain("staff.view");
  });
});
