export type CommandName = "coverage" | "limits" | "audit";
export type OptionalArgKey = "format" | "open" | "strict";

export interface CommandOptions {
  command: CommandName;
  path: string;
  format: "html" | "lcov" | "text";
  open: boolean;
  fn: string;
  ramp: string;
  strict: boolean;
  optionalArgOrder?: OptionalArgKey[];
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

const getOptionalArgOrder = (options: CommandOptions): OptionalArgKey[] => {
  if (options.command === "coverage") {
    return options.optionalArgOrder && options.optionalArgOrder.length > 0
      ? options.optionalArgOrder
      : ["format", "open"];
  }

  if (options.command === "audit") {
    return options.optionalArgOrder && options.optionalArgOrder.length > 0
      ? options.optionalArgOrder
      : ["strict"];
  }

  return [];
};

const buildOptionalArgs = (options: CommandOptions): string[] => {
  const order = getOptionalArgOrder(options);
  const args: string[] = [];

  for (const key of order) {
    if (key === "format") {
      args.push(`--format ${options.format}`);
    }
    if (key === "open") {
      if (options.open) args.push("--open");
    }
    if (key === "strict") {
      if (options.strict) args.push("--strict");
    }
  }

  return args;
};

export function buildCommand(options: CommandOptions): string {
  if (options.command === "coverage") {
    return [
      "soroban-testkit coverage",
      options.path && quote(options.path),
      ...buildOptionalArgs(options),
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (options.command === "limits") {
    return [
      "soroban-testkit limits",
      "--contract",
      quote(options.path || "target/wasm32v1-none/release/contract.wasm"),
      "--fn",
      options.fn || "batch_payout",
      "--ramp",
      options.ramp || "recipients",
    ].join(" ");
  }

  return [
    "soroban-testkit audit",
    quote(options.path || "./src"),
    ...buildOptionalArgs(options),
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
    const args = [
      "soroban-testkit coverage",
      ...(options.path ? [`  ${quote(options.path)}`] : []),
      ...(options.format ? [`  --format ${options.format}`] : []),
      ...(options.open ? ["  --open"] : []),
    ];

    return args.join("\n");
  }

  if (options.command === "limits") {
    const contractPath = quote(
      options.path || "target/wasm32v1-none/release/contract.wasm",
    );
    const fn = options.fn || "batch_payout";
    const ramp = options.ramp || "recipients";

    return [
      "soroban-testkit limits",
      `  --contract ${contractPath}`,
      `  --fn ${fn}`,
      `  --ramp ${ramp}`,
    ].join("\n");
  }

  const auditPath = quote(options.path || "./src");
  const args = [
    "soroban-testkit audit",
    `  ${auditPath}`,
    ...(options.strict ? ["  --strict"] : []),
  ];

  return args.join("\n");
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
