import { describe, expect, it } from "vitest";
import { ageFromDateOfBirth, resolveAge } from "../src/age.js";

describe("ageFromDateOfBirth", () => {
  it("computes whole years as of a given date", () => {
    expect(ageFromDateOfBirth("2000-06-15", new Date("2026-08-17"))).toBe(26);
    expect(ageFromDateOfBirth("2000-08-17", new Date("2026-08-17"))).toBe(26);
    expect(ageFromDateOfBirth("2000-08-18", new Date("2026-08-17"))).toBe(25);
  });

  it("accepts HubSpot epoch milliseconds", () => {
    const dob = Date.UTC(1998, 0, 1);
    expect(ageFromDateOfBirth(String(dob), new Date("2026-01-01"))).toBe(28);
  });

  it("returns undefined for empty or invalid values", () => {
    expect(ageFromDateOfBirth("", new Date("2026-01-01"))).toBeUndefined();
    expect(ageFromDateOfBirth("n/a", new Date("2026-01-01"))).toBeUndefined();
  });
});

describe("resolveAge", () => {
  it("uses a numeric Age (Calculated) value when present", () => {
    expect(
      resolveAge({ ageCalculated: "22", dateOfBirth: "2000-01-01" }, new Date("2026-01-01"))
    ).toBe("22");
  });

  it("falls back to Date of Birth when Age (Calculated) is a date", () => {
    expect(
      resolveAge(
        { ageCalculated: "2000-06-15", dateOfBirth: "2000-06-15" },
        new Date("2026-08-17")
      )
    ).toBe("26");
  });

  it("falls back to Date of Birth when Age (Calculated) is empty", () => {
    expect(
      resolveAge(
        { ageCalculated: "", dateOfBirth: "1990-01-01" },
        new Date("2026-01-01")
      )
    ).toBe("36");
  });
});
