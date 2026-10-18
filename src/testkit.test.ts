import { describe, expect, it } from "vitest";
import {
  buildCommand,
  cliCompatibility,
  formatCommandLine,
  localFileGuides,
} from "./testkit";

describe("buildCommand", () => {
  it("builds a coverage command", () => {
    expect(buildCommand({ command: "coverage", path: ".", format: "html", open: true, fn: "", ramp: "", strict: false }))
      .toBe("soroban-testkit coverage . --format html --open");
  });

  it("quotes paths containing spaces", () => {
    expect(buildCommand({ command: "audit", path: "./my contract/src", format: "text", open: false, fn: "", ramp: "", strict: true }))
      .toBe('soroban-testkit audit "./my contract/src" --strict');
  });

  it("does not quote a coverage path with no spaces", () => {
    expect(buildCommand({ command: "coverage", path: "./contracts/escrow", format: "lcov", open: false, fn: "", ramp: "", strict: false }))
      .toBe("soroban-testkit coverage ./contracts/escrow --format lcov");
  });

  it("quotes a coverage path containing spaces", () => {
    expect(buildCommand({ command: "coverage", path: "./my contract", format: "html", open: false, fn: "", ramp: "", strict: false }))
      .toBe('soroban-testkit coverage "./my contract" --format html');
  });

  it("quotes the limits --contract path when it contains spaces", () => {
    expect(buildCommand({ command: "limits", path: "./target/my build/contract.wasm", format: "html", open: false, fn: "batch_payout", ramp: "recipients", strict: false }))
      .toBe('soroban-testkit limits --contract "./target/my build/contract.wasm" --fn batch_payout --ramp recipients');
  });

  it("falls back to the default contract path for limits, unquoted", () => {
    expect(buildCommand({ command: "limits", path: "", format: "html", open: false, fn: "", ramp: "", strict: false }))
      .toBe("soroban-testkit limits --contract target/wasm32v1-none/release/contract.wasm --fn batch_payout --ramp recipients");
  });

  it("does not quote an audit path with no spaces", () => {
    expect(buildCommand({ command: "audit", path: "./src", format: "text", open: false, fn: "", ramp: "", strict: false }))
      .toBe("soroban-testkit audit ./src");
  });

  it("falls back to the default audit path, unquoted, when none is given", () => {
    expect(buildCommand({ command: "audit", path: "", format: "text", open: false, fn: "", ramp: "", strict: false }))
      .toBe("soroban-testkit audit ./src");
  });

  it("quotes a path with multiple spaces as a single argument", () => {
    expect(buildCommand({ command: "audit", path: "./a b c", format: "text", open: false, fn: "", ramp: "", strict: false }))
      .toBe('soroban-testkit audit "./a b c"');
  });
});

describe("formatCommandLine", () => {
  it("returns single-line identical to buildCommand when multiline is false", () => {
    const options = {
      command: "coverage" as const,
      path: ".",
      format: "html" as const,
      open: true,
      fn: "",
      ramp: "",
      strict: false,
    };
    expect(formatCommandLine(options, false)).toBe(buildCommand(options));
  });

  it("formats multi-line coverage command with POSIX line continuations", () => {
    const formatted = formatCommandLine(
      {
        command: "coverage",
        path: "./contracts/escrow",
        format: "lcov",
        open: true,
        fn: "",
        ramp: "",
        strict: false,
      },
      true,
    );

    expect(formatted).toBe(
      [
        "soroban-testkit coverage \\",
        "  ./contracts/escrow \\",
        "  --format lcov \\",
        "  --open",
      ].join("\n"),
    );
  });

  it("formats multi-line limits command with quoted paths if needed", () => {
    const formatted = formatCommandLine(
      {
        command: "limits",
        path: "target/release/my contract.wasm",
        format: "html",
        open: false,
        fn: "execute_equal",
        ramp: "recipients",
        strict: false,
      },
      true,
    );

    expect(formatted).toBe(
      [
        "soroban-testkit limits \\",
        '  --contract "target/release/my contract.wasm" \\',
        "  --fn execute_equal \\",
        "  --ramp recipients",
      ].join("\n"),
    );
  });

  it("formats multi-line audit command with strict flag", () => {
    const formatted = formatCommandLine(
      {
        command: "audit",
        path: "./my-contract/src",
        format: "text",
        open: false,
        fn: "",
        ramp: "",
        strict: true,
      },
      true,
    );

    expect(formatted).toBe(
      [
        "soroban-testkit audit \\",
        "  ./my-contract/src \\",
        "  --strict",
      ].join("\n"),
    );
  });

  it("formats multi-line audit command without strict flag", () => {
    const formatted = formatCommandLine(
      {
        command: "audit",
        path: "./src",
        format: "text",
        open: false,
        fn: "",
        ramp: "",
        strict: false,
      },
      true,
    );

    expect(formatted).toBe(
      [
        "soroban-testkit audit \\",
        "  ./src",
      ].join("\n"),
    );
  });
});

describe("cliCompatibility", () => {
  it("provides version entries with required compatibility targets", () => {
    expect(cliCompatibility.length).toBeGreaterThanOrEqual(3);

    const current = cliCompatibility.find((c) => c.status === "Current");
    expect(current).toBeDefined();
    expect(current?.sorobanSdk).toBe("27.0.x");
    expect(current?.rustTarget).toContain("wasm32v1-none");

    for (const row of cliCompatibility) {
      expect(row.version).toBeTruthy();
      expect(row.sorobanSdk).toBeTruthy();
      expect(row.stellarCli).toBeTruthy();
      expect(row.rustTarget).toBeTruthy();
      expect(row.status).toBeTruthy();
      expect(row.notes).toBeTruthy();
    }
  });
});

describe("localFileGuides", () => {
  it("covers all commands with input/output documentation", () => {
    for (const cmd of ["coverage", "limits", "audit"] as const) {
      const guide = localFileGuides[cmd];
      expect(guide).toBeDefined();
      expect(guide.filesRead.length).toBeGreaterThan(0);
      expect(guide.filesWritten.length).toBeGreaterThan(0);
      expect(guide.offlineGuarantee).toContain("offline");
      expect(guide.resolvedPathExample("test-path")).toBeTruthy();
    }
  });
});


