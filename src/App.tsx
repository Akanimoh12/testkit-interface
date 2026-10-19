import { type KeyboardEvent, useMemo, useState, useRef, useEffect } from "react";
import { buildCommand, modules, type CommandName } from "./testkit";
import { copyToClipboard } from "./clipboard";

const descriptions: Record<CommandName, string> = {
  coverage: "Generate contract-test coverage through cargo-llvm-cov.",
  limits: "Ramp a contract input to find its practical resource ceiling.",
  audit: "Scan contract sources for common auth, arithmetic, and TTL risks.",
};

const workflowTabs = [
  { id: "coverage", label: "Coverage workflow" },
  { id: "workspace", label: "Cargo workspace" },
  { id: "limits", label: "Resource limits" },
] as const;

type WorkflowTabId = (typeof workflowTabs)[number]["id"];

interface CommandOptions {
  command: CommandName;
  path: string;
  format: "html" | "lcov" | "text";
  open: boolean;
  fn: string;
  ramp: string;
  strict: boolean;
  shell?: "bash" | "zsh" | "fish" | "sh";
}

interface SummaryRow {
  label: string;
  value: string;
}

interface DefaultRow {
  key: string;
  label: string;
  value: string;
  applied: boolean;
}

interface ComparisonRow {
  key: string;
  label: string;
  a: string;
  b: string;
  changed: boolean;
}

const installationSteps = [
  {
    title: "Install Rust",
    description: "Download and install the Rust toolchain",
    command: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh",
  },
  {
    title: "Add wasm32 target",
    description: "Install the WebAssembly compilation target",
    command: "rustup target add wasm32v1-none",
  },
  {
    title: "Install Soroban CLI",
    description: "Get the Stellar command-line tools",
    command: "cargo install stellar-cli",
  },
  {
    title: "Install cargo-llvm-cov",
    description: "Tool for generating coverage reports",
    command: "cargo install cargo-llvm-cov",
  },
  {
    title: "Clone Testkit",
    description: "Get the latest Soroban Testkit repository",
    command: "git clone https://github.com/soroban-testkit/testkit-blockchain",
  },
  {
    title: "Install Testkit CLI",
    description: "Build and install the testkit command",
    command: "cargo install --path testkit-blockchain/crates/cli",
  },
];

function summarizeConfiguration(options: CommandOptions): SummaryRow[] {
  const rows: SummaryRow[] = [{ label: "Workflow", value: options.command }];
  if (options.path) rows.push({ label: "Path", value: options.path });
  if (options.command === "coverage" && options.format) {
    rows.push({ label: "Format", value: options.format });
    if (options.open) rows.push({ label: "Open report", value: "Yes" });
  }
  if (options.command === "limits") {
    rows.push({ label: "Function", value: options.fn });
    rows.push({ label: "Ramp", value: options.ramp });
  }
  if (options.command === "audit" && options.strict) {
    rows.push({ label: "Strict mode", value: "Enabled" });
  }
  return rows;
}

function effectiveDefaults(options: CommandOptions): DefaultRow[] {
  const rows: DefaultRow[] = [];
  if (options.command === "coverage") {
    if (!options.format) {
      rows.push({ key: "format", label: "Format", value: "html", applied: true });
    }
  }
  if (options.command === "limits") {
    if (!options.path) {
      rows.push({
        key: "contract",
        label: "Contract",
        value: "target/wasm32v1-none/release/contract.wasm",
        applied: true,
      });
    }
    if (!options.fn) {
      rows.push({ key: "fn", label: "Function", value: "batch_payout", applied: true });
    }
    if (!options.ramp) {
      rows.push({ key: "ramp", label: "Ramp", value: "recipients", applied: true });
    }
  }
  if (options.command === "audit" && !options.path) {
    rows.push({ key: "path", label: "Path", value: "./src", applied: true });
  }
  return rows;
}

function compareConfigurations(a: CommandOptions, b: CommandOptions): ComparisonRow[] {
  return [
    { key: "command", label: "Workflow", a: a.command, b: b.command, changed: a.command !== b.command },
    { key: "path", label: "Path", a: a.path, b: b.path, changed: a.path !== b.path },
    { key: "format", label: "Format", a: a.format, b: b.format, changed: a.format !== b.format },
    { key: "shell", label: "Shell", a: a.shell || "default", b: b.shell || "default", changed: a.shell !== b.shell },
  ];
}

function highlightCommand(command: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\s+|--|[^\s]+)/g;
  let match;
  let index = 0;

  while ((match = regex.exec(command)) !== null) {
    const text = match[0];
    if (/^\s+$/.test(text)) {
      parts.push(text);
    } else if (text.startsWith("--")) {
      parts.push(
        <span key={index} className="syntax-flag">
          {text}
        </span>
      );
    } else if (/^(soroban-testkit|coverage|limits|audit)$/.test(text)) {
      parts.push(
        <span key={index} className="syntax-command">
          {text}
        </span>
      );
    } else if (/^(html|lcov|text|batch_payout|recipients)$/.test(text)) {
      parts.push(
        <span key={index} className="syntax-value">
          {text}
        </span>
      );
    } else {
      parts.push(
        <span key={index} className="syntax-path">
          {text}
        </span>
      );
    }
    index++;
  }
  return parts;
}

export default function App() {
  const [command, setCommand] = useState<CommandName>("coverage");
  const [path, setPath] = useState(".");
  const [format, setFormat] = useState<"html" | "lcov" | "text">("html");
  const [open, setOpen] = useState(true);
  const [fn, setFn] = useState("batch_payout");
  const [ramp, setRamp] = useState("recipients");
  const [strict, setStrict] = useState(true);
  const [shell, setShell] = useState<"bash" | "zsh" | "fish" | "sh">("bash");
  const [copied, setCopied] = useState(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [moduleFilter, setModuleFilter] = useState("");
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowTabId>("coverage");
  const [compareOpen, setCompareOpen] = useState(false);
  const [configB, setConfigB] = useState<CommandOptions | null>(null);
  const [coverageGuideOpen, setCoverageGuideOpen] = useState(false);
  const [auditGuideOpen, setAuditGuideOpen] = useState(false);
  const comparePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e as any).ctrlKey || (e as any).metaKey) {
        switch ((e as any).key) {
          case "1":
            (document.getElementById("top") as HTMLElement)?.scrollIntoView({ behavior: "smooth" });
            break;
          case "2":
            (document.getElementById("install") as HTMLElement)?.scrollIntoView({ behavior: "smooth" });
            break;
          case "3":
            (document.getElementById("modules") as HTMLElement)?.scrollIntoView({ behavior: "smooth" });
            break;
          case "4":
            (document.getElementById("commands") as HTMLElement)?.scrollIntoView({ behavior: "smooth" });
            break;
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown as any);
    return () => document.removeEventListener("keydown", handleKeyDown as any);
  }, []);

  const options = useMemo<CommandOptions>(
    () => ({ command, path, format, open, fn, ramp, strict, shell }),
    [command, path, format, open, fn, ramp, strict, shell]
  );

  const generated = useMemo(() => buildCommand(options), [options]);
  const summaryRows = useMemo(() => summarizeConfiguration(options), [options]);
  const defaultRows = useMemo(() => effectiveDefaults(options), [options]);
  const appliedDefaults = defaultRows.filter((row) => row.applied).length;
  const configBCommand = useMemo(() => (configB ? buildCommand(configB) : ""), [configB]);
  const comparisonRows = useMemo(
    () => (configB ? compareConfigurations(options, configB) : []),
    [options, configB]
  );

  useEffect(() => {
    if (compareOpen && comparePanelRef.current) {
      comparePanelRef.current.focus();
    }
  }, [compareOpen]);

  const filteredModules = useMemo(() => {
    const q = moduleFilter.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      ([name, description]) =>
        name.toLowerCase().includes(q) || description.toLowerCase().includes(q)
    );
  }, [moduleFilter]);

  const copy = async () => {
    await copyToClipboard(generated);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const copyStep = async (index: number, stepCommand: string) => {
    await copyToClipboard(stepCommand);
    setCopiedStep(index);
    window.setTimeout(() => setCopiedStep(null), 1600);
  };

  const toggleComparison = () => {
    if (!compareOpen) {
      setConfigB({ ...options });
    }
    setCompareOpen(!compareOpen);
  };

  const updateConfigB = (updates: Partial<CommandOptions>) => {
    if (configB) {
      setConfigB({ ...configB, ...updates });
    }
  };

  const handleWorkflowKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const lastIndex = workflowTabs.length - 1;
    const nextIndex =
      event.key === "ArrowRight"
        ? (currentIndex + 1) % workflowTabs.length
        : event.key === "ArrowLeft"
          ? (currentIndex - 1 + workflowTabs.length) % workflowTabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? lastIndex
              : currentIndex;

    if (nextIndex !== currentIndex) {
      event.preventDefault();
      const nextTab = workflowTabs[nextIndex];
      setActiveWorkflow(nextTab.id);
      const button = document.getElementById(`workflow-tab-${nextTab.id}`) as HTMLButtonElement | null;
      button?.focus();
    }
  };

  const fieldClasses = "field-input";

  return (
    <main>
      <nav>
        <a className="brand" href="#top" aria-label="Soroban Testkit home">
          <span className="brand-mark">S</span>
          <span>Soroban Testkit</span>
        </a>
        <div className="nav-links" aria-label="Main navigation">
          <a href="#install">Install</a>
          <a href="#modules">Modules</a>
          <a href="#commands">Commands</a>
          <a href="https://github.com/soroban-testkit/testkit-blockchain">GitHub ↗</a>
        </div>
      </nav>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">Contract testing, without the repeated scaffolding</p>
          <h1>
            Break the contract
            <br />
            before users do.
          </h1>
          <p className="lede">
            Build precise Soroban tests with deterministic environments, adversarial money inputs, typed event
            assertions, and ledger-time control.
          </p>
          <div className="actions">
            <a className="button primary" href="#commands">
              Build a command
            </a>
            <a className="button secondary" href="#modules">
              Explore modules
            </a>
          </div>
        </div>
        <div className="terminal" aria-label="Example Soroban test">
          <div className="terminal-top">
            <i />
            <i />
            <i />
            <span>escrow_test.rs</span>
          </div>
          <pre>
            <code>
              <span className="muted">use</span> soroban_testkit::prelude::*;{"\n\n"}
              <span className="muted">let</span> env = TestEnv::new();{"\n"}
              <span className="muted">let</span> token = env.token();{"\n"}
              <span className="muted">let</span> buyer = env.address();{"\n\n"}
              token.mint(&buyer, <b>100</b>);{"\n"}
              token.assert_balance(&buyer, <b>100</b>);
            </code>
          </pre>
          <div className="pass">✓ test result: ok</div>
        </div>
      </section>

      <section className="install" id="install" aria-labelledby="install-heading">
        <header>
          <p className="eyebrow">First-time setup</p>
          <h2 id="install-heading">From a clean machine to your first command.</h2>
          <p className="install-intro">
            Six ordered steps install the Testkit CLI and its prerequisites. Every step runs locally and keeps
            contract tests deterministic and offline.
          </p>
        </header>
        <ol className="install-steps">
          {installationSteps.map((step, index) => (
            <li key={step.title} className="install-step">
              <span className="install-step-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <div className="install-command">
                <code>{step.command}</code>
                <button
                  type="button"
                  aria-label={`Copy step ${index + 1} command`}
                  onClick={() => copyStep(index, step.command)}
                >
                  {copiedStep === index ? "Copied" : "Copy"}
                </button>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="modules" id="modules">
        <header>
          <p className="eyebrow">One prelude. Seven focused modules.</p>
          <h2>Everything a serious contract test needs.</h2>
          <div className="module-filter-bar">
            <label htmlFor="module-search" className="sr-only">
              Filter modules
            </label>
            <input
              id="module-search"
              type="search"
              className="module-filter-input"
              placeholder="Filter modules by name or description..."
              value={moduleFilter}
              onChange={(event) => setModuleFilter(event.target.value)}
              aria-label="Filter modules"
            />
            {moduleFilter && (
              <button
                type="button"
                className="module-filter-clear"
                onClick={() => setModuleFilter("")}
                aria-label="Clear module filter"
              >
                Clear
              </button>
            )}
          </div>
        </header>

        {filteredModules.length > 0 ? (
          <div className="module-grid" id="module-grid">
            {filteredModules.map(([name, description], index) => (
              <article key={name}>
                <span>0{index + 1}</span>
                <h3>{name}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="module-empty-state" role="status" aria-live="polite">
            <div className="module-empty-icon" aria-hidden="true">
              ∅
            </div>
            <h3>No modules match &ldquo;{moduleFilter}&rdquo;</h3>
            <p>No testing modules found matching your filter criteria. Try adjusting your search term.</p>
            <button
              type="button"
              className="button secondary"
              onClick={() => setModuleFilter("")}
            >
              Reset filter
            </button>
          </div>
        )}
      </section>

      <section className="docs" aria-label="Soroban workflow documentation">
        <div className="docs-header">
          <p className="eyebrow">Prerequisites & tutorials</p>
          <h2>Supported Rust and Soroban prerequisites</h2>
        </div>

        <div className="requirements">
          <ul>
            <li>
              <strong>Rust:</strong> Rust &gt;= 1.84 with the <code>wasm32v1-none</code> target installed.
            </li>
            <li>
              <strong>Soroban SDK:</strong> soroban-sdk 27.0.x for current contract builds and tests.
            </li>
            <li>
              <strong>Stellar CLI:</strong> stellar-cli &gt;= 22.0.0 when you need local contract deploy or
              inspect flows.
            </li>
            <li>
              <strong>Build environment:</strong> Cargo workspace with a stable contract crate and optional
              `cargo llvm-cov` for coverage reports.
            </li>
          </ul>
        </div>

        <div className="workflow-tabs" role="tablist" aria-label="Soroban workflow docs">
          {workflowTabs.map((tab, index) => (
            <button
              key={tab.id}
              id={`workflow-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeWorkflow === tab.id}
              aria-controls={`workflow-panel-${tab.id}`}
              tabIndex={activeWorkflow === tab.id ? 0 : -1}
              className={activeWorkflow === tab.id ? "active" : ""}
              onClick={() => setActiveWorkflow(tab.id)}
              onKeyDown={(event) => handleWorkflowKeyDown(event, index)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {workflowTabs.map((tab) => (
          <div
            key={tab.id}
            id={`workflow-panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`workflow-tab-${tab.id}`}
            hidden={activeWorkflow !== tab.id}
            className="workflow-panel"
          >
            {tab.id === "coverage" && (
              <>
                <h3>Coverage workflow</h3>
                <p>
                  Start in the contract workspace, install the LLVM coverage tooling, and run every relevant
                  Rust test before exporting HTML or LCOV reports.
                </p>
                <pre>
                  <code>
                    cargo llvm-cov --workspace --all-features --html{"\n"}
                    cargo llvm-cov --workspace --lcov --output-path lcov.info
                  </code>
                </pre>
              </>
            )}
            {tab.id === "workspace" && (
              <>
                <h3>Cargo workspace layout</h3>
                <p>Keep each Soroban contract crate in a single workspace with shared dependencies and explicit workspace members.</p>
                <pre>
                  <code>
                    [workspace]{"\n"}
                    members = [{"\n"}
                    {"  "}"contracts/asset",{"\n"}
                    {"  "}"contracts/escrow",{"\n"}
                    {"  "}"contracts/auction",{"\n"}
                    ]{"\n"}
                    resolver = "2"
                  </code>
                </pre>
              </>
            )}
            {tab.id === "limits" && (
              <>
                <h3>Resource limits workflow</h3>
                <p>
                  Compile once, then sweep the function and ramp argument to find the practical limit for
                  batch_payout or any other entrypoint.
                </p>
                <pre>
                  <code>
                    soroban-testkit limits \{"\n"}
                    {"  "}--contract target/wasm32v1-none/release/contract.wasm \{"\n"}
                    {"  "}--fn batch_payout \{"\n"}
                    {"  "}--ramp recipients
                  </code>
                </pre>
              </>
            )}
          </div>
        ))}
      </section>

      <section className="commands" id="commands">
        <div className="command-copy">
          <p className="eyebrow">CLI workbench</p>
          <h2>From intent to command.</h2>
          <p>Configure a supported Testkit workflow and copy the exact command to your terminal.</p>
          <div className="command-tabs" role="tablist" aria-label="Command workflow selector">
            {(["coverage", "limits", "audit"] as const).map((name) => (
              <button
                key={name}
                className={command === name ? "active" : ""}
                onClick={() => setCommand(name)}
                aria-pressed={command === name}
              >
                {name}
              </button>
            ))}
          </div>
          <p className="description">{descriptions[command]}</p>

          <section className="summary-card" aria-labelledby="command-summary-heading">
            <h3 id="command-summary-heading">Command summary</h3>
            <p className="summary-workflow">{command}</p>
            <dl className="summary-settings">
              {summaryRows.map((row) => (
                <div className="summary-row" key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="summary-note">
              Updates live from the builder. Values marked (default) apply when a field is left empty.
            </p>
          </section>

          <button
            type="button"
            className="comparison-toggle"
            aria-expanded={compareOpen}
            aria-controls="comparison-panel"
            onClick={toggleComparison}
          >
            Compare two configurations
          </button>
        </div>
        <div className="builder">
          <label>
            <div className="field-header">
              <span>Project or contract path</span>
              <span className="badge badge-required">Required</span>
            </div>
            <div className="field-with-clear">
              <input
                className={fieldClasses}
                value={path}
                onChange={(event) => setPath(event.target.value)}
                aria-label="Project or contract path"
                aria-required="true"
              />
              {path && (
                <button
                  type="button"
                  className="clear-field-button"
                  onClick={() => setPath("")}
                  aria-label="Clear"
                >
                  Clear
                </button>
              )}
            </div>
          </label>
          {command === "coverage" && (
            <>
              <label>
                <div className="field-header">
                  <span>Report format</span>
                  <span className="badge badge-optional">Optional</span>
                </div>
                <select value={format} onChange={(event) => setFormat(event.target.value as typeof format)}>
                  <option>html</option>
                  <option>lcov</option>
                  <option>text</option>
                </select>
              </label>
              <label className="check">
                <span className="check-content">
                  <input type="checkbox" checked={open} onChange={(event) => setOpen(event.target.checked)} />
                  <span>Open report when complete</span>
                </span>
                <span className="badge badge-optional">Optional</span>
              </label>
            </>
          )}
          {command === "limits" && (
            <div className="row">
              <label>
                <div className="field-header">
                  <span>Function</span>
                  <span className="badge badge-required">Required</span>
                </div>
                <div className="field-with-clear">
                  <input
                    className={fieldClasses}
                    value={fn}
                    onChange={(event) => setFn(event.target.value)}
                    aria-label="Function"
                    aria-required="true"
                  />
                  {fn && (
                    <button
                      type="button"
                      className="clear-field-button"
                      onClick={() => setFn("")}
                      aria-label="Clear"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </label>
              <label>
                <div className="field-header">
                  <span>Ramp parameter</span>
                  <span className="badge badge-required">Required</span>
                </div>
                <div className="field-with-clear">
                  <input
                    className={fieldClasses}
                    value={ramp}
                    onChange={(event) => setRamp(event.target.value)}
                    aria-label="Ramp parameter"
                    aria-required="true"
                  />
                  {ramp && (
                    <button
                      type="button"
                      className="clear-field-button"
                      onClick={() => setRamp("")}
                      aria-label="Clear"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </label>
            </div>
          )}
          {command === "audit" && (
            <label className="check">
              <span className="check-content">
                <input type="checkbox" checked={strict} onChange={(event) => setStrict(event.target.checked)} />
                <span>Fail on warnings</span>
              </span>
              <span className="badge badge-optional">Optional</span>
            </label>
          )}

          <label>
            <div className="field-header">
              <span>Shell target</span>
              <span className="badge badge-optional">Optional</span>
            </div>
            <select value={shell} onChange={(event) => setShell(event.target.value as typeof shell)}>
              <option value="bash">Bash</option>
              <option value="zsh">Zsh</option>
              <option value="fish">Fish</option>
              <option value="sh">POSIX sh</option>
            </select>
          </label>

          <section className="defaults-preview" aria-labelledby="defaults-preview-heading">
            <div className="defaults-preview-header">
              <h3 id="defaults-preview-heading">Effective defaults</h3>
              {defaultRows.length > 0 && (
                <span className="defaults-count">
                  {appliedDefaults} of {defaultRows.length} applied
                </span>
              )}
            </div>
            {defaultRows.length === 0 ? (
              <p className="defaults-empty">
                This workflow has no empty-field fallbacks. The copied command uses the values you set above,
                exactly.
              </p>
            ) : (
              <dl className="defaults-list">
                {defaultRows.map((row) => (
                  <div className="defaults-row" key={row.key}>
                    <dt>{row.label}</dt>
                    <dd>
                      <code>{row.applied ? `(empty) → ${row.value}` : row.value}</code>
                      <span className={`badge ${row.applied ? "badge-required" : "badge-optional"}`}>
                        {row.applied ? "Default applied" : "From your input"}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <div className="output">
            <code>{highlightCommand(generated)}</code>
            <button onClick={copy}>{copied ? "Copied" : "Copy"}</button>
          </div>
        </div>

        {compareOpen && configB && (
          <section
            className="comparison"
            id="comparison-panel"
            ref={comparePanelRef}
            tabIndex={-1}
            aria-labelledby="comparison-heading"
          >
            <div className="comparison-header">
              <h3 id="comparison-heading">Compare two configurations</h3>
              <p>
                Configuration A is the workbench above. Edit configuration B and the table marks every setting
                that differs; both commands update as you type.
              </p>
            </div>

            <fieldset className="comparison-config">
              <legend>Configuration B</legend>
              <div className="row">
                <label>
                  <div className="field-header">
                    <span>Workflow</span>
                  </div>
                  <select
                    value={configB.command}
                    onChange={(event) => updateConfigB({ command: event.target.value as CommandName })}
                  >
                    <option value="coverage">coverage</option>
                    <option value="limits">limits</option>
                    <option value="audit">audit</option>
                  </select>
                </label>
                <label>
                  <div className="field-header">
                    <span>Project or contract path</span>
                    <span className="badge badge-required">Required</span>
                  </div>
                  <input
                    value={configB.path}
                    onChange={(event) => updateConfigB({ path: event.target.value })}
                    aria-required="true"
                  />
                </label>
              </div>
              {configB.command === "coverage" && (
                <div className="row">
                  <label>
                    <div className="field-header">
                      <span>Report format</span>
                      <span className="badge badge-optional">Optional</span>
                    </div>
                    <select
                      value={configB.format}
                      onChange={(event) => updateConfigB({ format: event.target.value as CommandOptions["format"] })}
                    >
                      <option>html</option>
                      <option>lcov</option>
                      <option>text</option>
                    </select>
                  </label>
                  <label className="check">
                    <span className="check-content">
                      <input
                        type="checkbox"
                        checked={configB.open}
                        onChange={(event) => updateConfigB({ open: event.target.checked })}
                      />
                      <span>Open report when complete</span>
                    </span>
                    <span className="badge badge-optional">Optional</span>
                  </label>
                </div>
              )}
              {configB.command === "limits" && (
                <div className="row">
                  <label>
                    <div className="field-header">
                      <span>Function</span>
                      <span className="badge badge-required">Required</span>
                    </div>
                    <input
                      value={configB.fn}
                      onChange={(event) => updateConfigB({ fn: event.target.value })}
                      aria-required="true"
                    />
                  </label>
                  <label>
                    <div className="field-header">
                      <span>Ramp parameter</span>
                      <span className="badge badge-required">Required</span>
                    </div>
                    <input
                      value={configB.ramp}
                      onChange={(event) => updateConfigB({ ramp: event.target.value })}
                      aria-required="true"
                    />
                  </label>
                </div>
              )}
              {configB.command === "audit" && (
                <label className="check">
                  <span className="check-content">
                    <input
                      type="checkbox"
                      checked={configB.strict}
                      onChange={(event) => updateConfigB({ strict: event.target.checked })}
                    />
                    <span>Fail on warnings</span>
                  </span>
                  <span className="badge badge-optional">Optional</span>
                </label>
              )}
              <label>
                <div className="field-header">
                  <span>Shell target</span>
                  <span className="badge badge-optional">Optional</span>
                </div>
                <select value={configB.shell || "bash"} onChange={(event) => updateConfigB({ shell: event.target.value as typeof shell })}>
                  <option value="bash">Bash</option>
                  <option value="zsh">Zsh</option>
                  <option value="fish">Fish</option>
                  <option value="sh">POSIX sh</option>
                </select>
              </label>
              <button
                type="button"
                className="button secondary comparison-sync"
                onClick={() => setConfigB({ ...options })}
              >
                Match B to A
              </button>
            </fieldset>

            <div className="comparison-table-wrap" role="region" aria-label="Configuration differences" tabIndex={0}>
              <table
                className="comparison-table"
                aria-label="Setting comparison between configuration A and configuration B"
              >
                <thead>
                  <tr>
                    <th scope="col">Setting</th>
                    <th scope="col">Configuration A</th>
                    <th scope="col">Configuration B</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.key} data-changed={row.changed}>
                      <th scope="row">{row.label}</th>
                      <td>{row.a}</td>
                      <td>{row.b}</td>
                      <td>
                        {row.changed ? (
                          <span className="badge badge-required">Changed</span>
                        ) : (
                          <span className="comparison-status">Matches</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="comparison-commands">
              <div>
                <h4>Configuration A command</h4>
                <pre className="comparison-command">
                  <code>{highlightCommand(generated)}</code>
                </pre>
              </div>
              <div>
                <h4>Configuration B command</h4>
                <pre className="comparison-command">
                  <code>{highlightCommand(configBCommand)}</code>
                </pre>
              </div>
            </div>
          </section>
        )}
      </section>

      <section className="guides" aria-label="Workflow guides">
        <article className="guide-card">
          <div className="guide-header">
            <h3>Coverage report guide</h3>
            <button
              type="button"
              className="guide-toggle"
              aria-expanded={coverageGuideOpen}
              aria-controls="coverage-guide-panel"
              onClick={() => setCoverageGuideOpen((open) => !open)}
            >
              {coverageGuideOpen ? "Hide guide" : "Show guide"}
            </button>
          </div>
          {coverageGuideOpen && (
            <div id="coverage-guide-panel" className="guide-panel">
              <ol>
                <li>Start with the local project path so the tool can read the crate and tests in context.</li>
                <li>
                  Choose HTML output when you want a visual report and open it immediately after generation.
                </li>
                <li>
                  Read branch and line coverage together: low execution density usually explains weak confidence
                  more than raw percentages.
                </li>
                <li>
                  Use the report to prioritize untested edge cases before shipping a contract update.
                </li>
              </ol>
            </div>
          )}
        </article>

        <article className="guide-card">
          <div className="guide-header">
            <h3>Audit workflow tutorial</h3>
            <button
              type="button"
              className="guide-toggle"
              aria-expanded={auditGuideOpen}
              aria-controls="audit-guide-panel"
              onClick={() => setAuditGuideOpen((open) => !open)}
            >
              {auditGuideOpen ? "Hide tutorial" : "Show tutorial"}
            </button>
          </div>
          {auditGuideOpen && (
            <div id="audit-guide-panel" className="guide-panel">
              <ol>
                <li>Point the audit at the contract source directory or workspace root most relevant to the change.</li>
                <li>
                  Review auth and storage access warnings first; they often explain failure modes and privilege
                  issues.
                </li>
                <li>
                  Use the strict mode toggle when you want warning-level findings to block release readiness.
                </li>
                <li>
                  Pair each finding with a focused regression test before finalizing the deployment checklist.
                </li>
              </ol>
            </div>
          )}
        </article>
      </section>

      <footer>
        <span>Built for the Stellar developer ecosystem.</span>
        <span>Apache-2.0</span>
      </footer>
    </main>
  );
}
