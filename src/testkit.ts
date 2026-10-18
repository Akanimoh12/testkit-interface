export type CommandName = "coverage" | "limits" | "audit";

export interface CommandOptions {
  command: CommandName;
  path: string;
  format: "html" | "lcov" | "text";
  open: boolean;
  fn: string;
  ramp: string;
  strict: boolean;
}

export const modules = [
  ["core", "Deterministic environments and addresses"],
  ["ledger", "Time, sequence, and clock control"],
  ["money", "Adversarial values and conservation checks"],
  ["events", "Typed capture and event assertions"],
  ["tokens", "Stellar Asset Contract test doubles"],
  ["auth", "Privilege and authorization matrices"],
  ["ttl", "Storage lifetime and expiry simulation"],
] as const;

const quote = (value: string) => (value.includes(" ") ? `"${value}"` : value);

/**
 * Values `buildCommand` substitutes when a field is left empty. Exported so
 * the workbench can preview the effective command before copying it.
 */
export const fallbackValues = {
  limitsContract: "target/wasm32v1-none/release/contract.wasm",
  limitsFunction: "batch_payout",
  limitsRamp: "recipients",
  auditPath: "./src",
} as const;

export function buildCommand(options: CommandOptions): string {
  if (options.command === "coverage") {
    return [
      "soroban-testkit coverage",
      options.path && quote(options.path),
      `--format ${options.format}`,
      options.open && "--open",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (options.command === "limits") {
    return [
      "soroban-testkit limits",
      "--contract",
      quote(options.path || fallbackValues.limitsContract),
      "--fn",
      options.fn || fallbackValues.limitsFunction,
      "--ramp",
      options.ramp || fallbackValues.limitsRamp,
    ].join(" ");
  }

  return [
    "soroban-testkit audit",
    quote(options.path || fallbackValues.auditPath),
    options.strict && "--strict",
  ]
    .filter(Boolean)
    .join(" ");
}

export function formatCommandLine(
  options: CommandOptions,
  multiline = false,
): string {
  if (!multiline) {
    return buildCommand(options);
  }

  if (options.command === "coverage") {
    const args: string[] = [];
    if (options.path) args.push(quote(options.path));
    args.push(`--format ${options.format}`);
    if (options.open) args.push("--open");

    if (args.length === 0) {
      return "soroban-testkit coverage";
    }

    return [
      "soroban-testkit coverage \\",
      ...args.map((arg, index) => `  ${arg}${index < args.length - 1 ? " \\" : ""}`),
    ].join("\n");
  }

  if (options.command === "limits") {
    const contractPath = quote(options.path || fallbackValues.limitsContract);
    const fn = options.fn || fallbackValues.limitsFunction;
    const ramp = options.ramp || fallbackValues.limitsRamp;

    return [
      "soroban-testkit limits \\",
      `  --contract ${contractPath} \\`,
      `  --fn ${fn} \\`,
      `  --ramp ${ramp}`,
    ].join("\n");
  }

  // audit
  const auditPath = quote(options.path || fallbackValues.auditPath);
  if (options.strict) {
    return [
      "soroban-testkit audit \\",
      `  ${auditPath} \\`,
      "  --strict",
    ].join("\n");
  }

  return ["soroban-testkit audit \\", `  ${auditPath}`].join("\n");
}

export interface EffectiveDefaultRow {
  key: "path" | "fn" | "ramp";
  label: string;
  input: string;
  value: string;
  applied: boolean;
}

/**
 * Lists the fields of the active workflow whose empty input falls back to a
 * default, with the value the generated command will actually use.
 */
export function effectiveDefaults(options: CommandOptions): EffectiveDefaultRow[] {
  if (options.command === "limits") {
    return [
      {
        key: "path",
        label: "Contract artifact",
        input: options.path,
        value: options.path || fallbackValues.limitsContract,
        applied: options.path === "",
      },
      {
        key: "fn",
        label: "Function",
        input: options.fn,
        value: options.fn || fallbackValues.limitsFunction,
        applied: options.fn === "",
      },
      {
        key: "ramp",
        label: "Ramp parameter",
        input: options.ramp,
        value: options.ramp || fallbackValues.limitsRamp,
        applied: options.ramp === "",
      },
    ];
  }

  if (options.command === "audit") {
    return [
      {
        key: "path",
        label: "Project path",
        input: options.path,
        value: options.path || fallbackValues.auditPath,
        applied: options.path === "",
      },
    ];
  }

  return [];
}

export interface SettingSummaryRow {
  label: string;
  value: string;
}

/**
 * Human-readable recap of the settings the active workflow will run with.
 * Falls back to the same defaults `buildCommand` applies, marked "(default)".
 */
export function summarizeConfiguration(
  options: CommandOptions,
): SettingSummaryRow[] {
  if (options.command === "coverage") {
    return [
      { label: "Project or contract path", value: options.path || "(omitted)" },
      { label: "Report format", value: options.format },
      { label: "Open report when complete", value: options.open ? "On" : "Off" },
    ];
  }

  if (options.command === "limits") {
    return [
      {
        label: "Contract artifact",
        value: options.path || `${fallbackValues.limitsContract} (default)`,
      },
      {
        label: "Function",
        value: options.fn || `${fallbackValues.limitsFunction} (default)`,
      },
      {
        label: "Ramp parameter",
        value: options.ramp || `${fallbackValues.limitsRamp} (default)`,
      },
    ];
  }

  return [
    {
      label: "Project path",
      value: options.path || `${fallbackValues.auditPath} (default)`,
    },
    { label: "Fail on warnings", value: options.strict ? "On" : "Off" },
  ];
}

export interface ComparisonRow {
  key: string;
  label: string;
  a: string;
  b: string;
  changed: boolean;
}

/**
 * Compares two configurations setting by setting. Rows are included when the
 * setting applies to either side; sides that do not use the setting read
 * "n/a" and empty values read "(empty)".
 */
export function compareConfigurations(
  a: CommandOptions,
  b: CommandOptions,
): ComparisonRow[] {
  const usesCoverage = a.command === "coverage" || b.command === "coverage";
  const usesLimits = a.command === "limits" || b.command === "limits";
  const usesAudit = a.command === "audit" || b.command === "audit";

  const fields: Array<{
    key: string;
    label: string;
    applicable: boolean;
    value: (options: CommandOptions) => string;
  }> = [
    { key: "command", label: "Workflow", applicable: true, value: (o) => o.command },
    {
      key: "path",
      label: "Project or contract path",
      applicable: true,
      value: (o) => o.path || "(empty)",
    },
    {
      key: "format",
      label: "Report format",
      applicable: usesCoverage,
      value: (o) => (o.command === "coverage" ? o.format : "n/a"),
    },
    {
      key: "open",
      label: "Open report when complete",
      applicable: usesCoverage,
      value: (o) => (o.command === "coverage" ? (o.open ? "On" : "Off") : "n/a"),
    },
    {
      key: "fn",
      label: "Function",
      applicable: usesLimits,
      value: (o) => (o.command === "limits" ? o.fn || "(empty)" : "n/a"),
    },
    {
      key: "ramp",
      label: "Ramp parameter",
      applicable: usesLimits,
      value: (o) => (o.command === "limits" ? o.ramp || "(empty)" : "n/a"),
    },
    {
      key: "strict",
      label: "Fail on warnings",
      applicable: usesAudit,
      value: (o) => (o.command === "audit" ? (o.strict ? "On" : "Off") : "n/a"),
    },
  ];

  return fields
    .filter((field) => field.applicable)
    .map((field) => {
      const aValue = field.value(a);
      const bValue = field.value(b);
      return {
        key: field.key,
        label: field.label,
        a: aValue,
        b: bValue,
        changed: aValue !== bValue,
      };
    });
}

export interface CliCompatibility {
  version: string;
  sorobanSdk: string;
  stellarCli: string;
  rustTarget: string;
  status: "Current" | "Supported" | "Upcoming";
  notes: string;
}

export const cliCompatibility: readonly CliCompatibility[] = [
  {
    version: "v0.2.0",
    sorobanSdk: "27.0.x",
    stellarCli: ">= 22.0.0",
    rustTarget: "wasm32v1-none (Rust >= 1.84)",
    status: "Current",
    notes:
      "AuthMatrix multi-actor enforcement, auth-mocked limits ramp, SAC heuristic mocking, cargo-llvm-cov integration.",
  },
  {
    version: "v0.1.0",
    sorobanSdk: "22.x - 26.x",
    stellarCli: ">= 21.0.0",
    rustTarget: "wasm32-unknown-unknown / wasm32v1-none",
    status: "Supported",
    notes:
      "Deterministic TestEnv, ledger timestamp/sequence warping, conservation balance checks, AST source code audit scanner.",
  },
  {
    version: "v0.3.0",
    sorobanSdk: "28.0.x+",
    stellarCli: ">= 23.0.0",
    rustTarget: "wasm32v1-none (Rust 2024)",
    status: "Upcoming",
    notes:
      "Extended persistent TTL storage simulation, multi-contract cross-call limits ramp, and gas telemetry export.",
  },
];

export interface InstallStep {
  title: string;
  description: string;
  command: string;
}

/**
 * First-time installation workflow, mirrored from the CLI documentation in
 * `testkit-blockchain`. Ordered: each step builds on the previous one.
 */
export const installationSteps: readonly InstallStep[] = [
  {
    title: "Add the WebAssembly target",
    description:
      "Testkit probes compiled contracts on the pinned Rust stable toolchain, so the wasm32v1-none target has to be present.",
    command: "rustup target add wasm32v1-none",
  },
  {
    title: "Install the soroban-testkit CLI",
    description:
      "Installs the companion binary from crates.io. From a workspace checkout, install the local crate instead with: cargo install --path crates/cli --locked",
    command: "cargo install soroban-testkit-cli --locked",
  },
  {
    title: "Install the coverage wrapper",
    description:
      "The coverage workflow shells out to cargo-llvm-cov, which Testkit calls but does not bundle. Skip this step if you only use limits or audit.",
    command: "cargo install cargo-llvm-cov",
  },
  {
    title: "Add the crate to your contract",
    description:
      "Adds Testkit as a dev-dependency so contract tests can import the prelude and the focused testing modules.",
    command: "cargo add --dev soroban-testkit",
  },
  {
    title: "Verify the installation",
    description:
      "Confirms the binary resolves on your PATH and lists the supported subcommands.",
    command: "soroban-testkit --help",
  },
  {
    title: "Build your first command",
    description:
      "The workbench below generates coverage, limits, and audit commands, previews every default that will be applied, and copies the exact line to your terminal.",
    command: "soroban-testkit coverage . --format html --open",
  },
];

export interface LocalFileGuide {
  command: CommandName;
  title: string;
  summary: string;
  defaultPath: string;
  resolvedPathExample: (path: string) => string;
  filesRead: string[];
  filesWritten: string[];
  offlineGuarantee: string;
}

export const localFileGuides: Record<CommandName, LocalFileGuide> = {
  coverage: {
    command: "coverage",
    title: "Contract Coverage (cargo-llvm-cov)",
    summary:
      "Instruments contract crates and runs local test suites to compute exact source and branch coverage.",
    defaultPath: ".",
    resolvedPathExample: (p) => (p || ".").replace(/\/$/, "") + "/Cargo.toml",
    filesRead: [
      "Cargo.toml / Cargo.lock (crate dependencies and test harness)",
      "src/**/*.rs (contract source files)",
      "tests/**/*.rs (integration test suites)",
    ],
    filesWritten: [
      "target/llvm-cov/html/** (interactive report when --format html)",
      "target/llvm-cov/lcov.info (coverage trace when --format lcov)",
      "None (stdout summary only when --format text)",
    ],
    offlineGuarantee:
      "Execution is 100% offline. No contract bytecode or source files are ever transmitted remotely.",
  },
  limits: {
    command: "limits",
    title: "Resource Limit Ramp (soroban-testkit limits)",
    summary:
      "Probes compiled WASM bytecode across stepped parameter values to find exact instruction and memory boundaries.",
    defaultPath: "target/wasm32v1-none/release/contract.wasm",
    resolvedPathExample: (p) =>
      p || "target/wasm32v1-none/release/contract.wasm",
    filesRead: [
      "Pre-compiled contract WebAssembly bytecode (.wasm artifact)",
      "Local function export table and symbol signatures",
    ],
    filesWritten: [
      "None (metrics and resource ceilings stream directly to terminal stdout)",
    ],
    offlineGuarantee:
      "100% offline. Probes execute in isolated local child processes using in-memory mock ledger state with zero network RPC calls.",
  },
  audit: {
    command: "audit",
    title: "Static Source Audit (soroban-testkit audit)",
    summary:
      "Performs AST-level static security checks for authentication gating, arithmetic safety, and TTL state.",
    defaultPath: "./src",
    resolvedPathExample: (p) => (p || "./src").replace(/\/$/, "") + "/*.rs",
    filesRead: [
      "Rust source files (*.rs) in the specified project directory",
      "Syntax trees for require_auth, arithmetic operations, and storage keys",
    ],
    filesWritten: [
      "None (findings and warning locations stream directly to terminal stdout)",
    ],
    offlineGuarantee:
      "100% offline, read-only and non-destructive. Source code is parsed locally without external telemetry.",
  },
};

