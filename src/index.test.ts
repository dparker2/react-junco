import { describe, expect, test } from "bun:test";
import { VERSION } from "./index";

describe("react-junco", () => {
  test("exports VERSION constant", () => {
    expect(VERSION).toBeDefined();
    expect(typeof VERSION).toBe("string");
  });

  test("VERSION matches package version", () => {
    expect(VERSION).toBe("0.1.0");
  });

  test("VERSION follows semver format", () => {
    const semverRegex = /^\d+\.\d+\.\d+$/;
    expect(VERSION).toMatch(semverRegex);
  });
});
