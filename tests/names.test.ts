import { describe, expect, it } from "vitest";
import { splitClientName } from "../src/names.js";

describe("splitClientName", () => {
  it("splits a typical first + last name", () => {
    expect(splitClientName("Jane Doe")).toEqual({
      firstName: "Jane",
      lastName: "Doe",
    });
  });

  it("keeps extra tokens on the last name", () => {
    expect(splitClientName("Maria de la Cruz")).toEqual({
      firstName: "Maria",
      lastName: "de la Cruz",
    });
  });

  it("handles a single token", () => {
    expect(splitClientName("Prince")).toEqual({
      firstName: "Prince",
      lastName: "",
    });
  });
});
