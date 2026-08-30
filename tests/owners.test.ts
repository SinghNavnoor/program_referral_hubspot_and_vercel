import { describe, expect, it } from "vitest";
import {
  ownerEmailFromName,
  resolveProgramOwner,
} from "../src/hubspot/owners.js";

describe("ownerEmailFromName", () => {
  it("uses first initial and last token", () => {
    expect(ownerEmailFromName("Jack Jones Smith")).toBe("jsmith@example.org");
    expect(ownerEmailFromName("Alex Rivera")).toBe("arivera@example.org");
  });

  it("keeps a hyphenated last name", () => {
    expect(ownerEmailFromName("ROBIN ORTIZ-VEGA")).toBe(
      "rortiz-vega@example.org"
    );
  });

  it("passes through a label that is already an email", () => {
    expect(ownerEmailFromName("jblake@example.org")).toBe(
      "jblake@example.org"
    );
    expect(ownerEmailFromName("intake@example.org")).toBe(
      "intake@example.org"
    );
  });
});

describe("resolveProgramOwner", () => {
  it("maps HubSpot owner id to the label and derived email", () => {
    expect(resolveProgramOwner("10000001")).toEqual({
      name: "Alex Rivera",
      email: "arivera@example.org",
    });
    expect(resolveProgramOwner("10000002")).toEqual({
      name: "Sam Chen",
      email: "schen@example.org",
    });
  });

  it("returns undefined for an unknown owner id", () => {
    expect(resolveProgramOwner("0")).toBeUndefined();
  });
});
