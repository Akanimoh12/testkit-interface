import { useEffect, useMemo, useState } from "react";
import {
  buildCommand,
  formatCommandLine,
  modules,
  type CommandName,
  type OptionalArgKey,
} from "./testkit";
import { copyToClipboard } from "./clipboard";

const descriptions: Record<CommandName, string> = {
  coverage: "Generate contract-test coverage through cargo-llvm-cov.",
  limits: "Ramp a contract input to find its practical resource ceiling.",
  audit: "Scan contract sources for common auth, arithmetic, and TTL risks.",
};

const defaultCoverageOrder: OptionalArgKey[] = ["format", "open"];

export default function App() {
  const [command, setCommand] = useState<CommandName>("coverage");
  const [path, setPath] = useState(".");
  const [format, setFormat] = useState<"html" | "lcov" | "text">("html");
  const [open, setOpen] = useState(true);
  const [fn, setFn] = useState("batch_payout");
  const [ramp, setRamp] = useState("recipients");
  const [strict, setStrict] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [moduleFilter, setModuleFilter] = useState("");
  const [coverageOrder, setCoverageOrder] = useState<OptionalArgKey[]>(defaultCoverageOrder);
  const [multilineEditor, setMultilineEditor] = useState(false);
  const [advancedCommand, setAdvancedCommand] = useState("");

  const options = useMemo<CommandOptions>(
    () => ({ command, path, format, open, fn, ramp, strict }),
    [command, path, format, open, fn, ramp, strict],
  );

  const generated = useMemo(() => buildCommand(options), [options]);

  const summaryRows = useMemo(() => summarizeConfiguration(options), [options]);
  const defaultRows = useMemo(() => effectiveDefaults(options), [options]);
  const appliedDefaults = defaultRows.filter((row) => row.applied).length;
  const configBCommand = useMemo(
    () => (configB ? buildCommand(configB) : ""),
    [configB],
  );
  const comparisonRows = useMemo(
    () => (configB ? compareConfigurations(options, configB) : []),
    [options, configB],
  );

  useEffect(() => {
    if (compareOpen) {
      comparePanelRef.current?.focus();
    }
  }, [compareOpen]);

  const filteredModules = useMemo(() => {
    const q = moduleFilter.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      ([name, description]) =>
        name.toLowerCase().includes(q) || description.toLowerCase().includes(q),
    );
  }, [moduleFilter]);

  const copy = async () => {
    await copyToClipboard(generated);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleWorkflowKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
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
          <h1>Break the contract<br />before users do.</h1>
          <p className="lede">
            Build precise Soroban tests with deterministic environments, adversarial
            money inputs, typed event assertions, and ledger-time control.
          </p>
          <div className="actions">
            <a className="button primary" href="#commands">Build a command</a>
            <a className="button secondary" href="#modules">Explore modules</a>
          </div>
        </div>
        <div className="terminal" aria-label="Example Soroban test">
          <div className="terminal-top"><i /><i /><i /><span>escrow_test.rs</span></div>
          <pre><code><span className="muted">use</span> soroban_testkit::prelude::*;{"\n\n"}<span className="muted">let</span> env = TestEnv::new();{"\n"}<span className="muted">let</span> token = env.token();{"\n"}<span className="muted">let</span> buyer = env.address();{"\n\n"}token.mint(&buyer, <b>100</b>);{"\n"}token.assert_balance(&buyer, <b>100</b>);</code></pre>
          <div className="pass">✓ test result: ok</div>
        </div>
      </section>

      <section className="install" id="install" aria-labelledby="install-heading">
        <header>
          <p className="eyebrow">First-time setup</p>
          <h2 id="install-heading">From a clean machine to your first command.</h2>
          <p className="install-intro">
            Six ordered steps install the Testkit CLI and its prerequisites. Every
            step runs locally and keeps contract tests deterministic and offline.
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
            <label htmlFor="module-search" className="sr-only">Filter modules</label>
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
                <span>0{index + 1}</span><h3>{name}</h3><p>{description}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="module-empty-state" role="status" aria-live="polite">
            <div className="module-empty-icon" aria-hidden="true">∅</div>
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
            <li><strong>Rust:</strong> Rust &gt;= 1.84 with the <code>wasm32v1-none</code> target installed.</li>
            <li><strong>Soroban SDK:</strong> soroban-sdk 27.0.x for current contract builds and tests.</li>
            <li><strong>Stellar CLI:</strong> stellar-cli &gt;= 22.0.0 when you need local contract deploy or inspect flows.</li>
            <li><strong>Build environment:</strong> Cargo workspace with a stable contract crate and optional `cargo llvm-cov` for coverage reports.</li>
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
                <p>Start in the contract workspace, install the LLVM coverage tooling, and run every relevant Rust test before exporting HTML or LCOV reports.</p>
                <pre><code>cargo llvm-cov --workspace --all-features --html
cargo llvm-cov --workspace --lcov --output-path lcov.info</code></pre>
              </>
            )}
            {tab.id === "workspace" && (
              <>
                <h3>Cargo workspace layout</h3>
                <p>Keep each Soroban contract crate in a single workspace with shared dependencies and explicit workspace members.</p>
                <pre><code>[workspace]
members = [
  "contracts/asset",
  "contracts/escrow",
  "contracts/auction",
]
resolver = "2"</code></pre>
              </>
            )}
            {tab.id === "limits" && (
              <>
                <h3>Resource limits workflow</h3>
                <p>Compile once, then sweep the function and ramp argument to find the practical limit for batch_payout or any other entrypoint.</p>
                <pre><code>soroban-testkit limits \
  --contract target/wasm32v1-none/release/contract.wasm \
  --fn batch_payout \
  --ramp recipients</code></pre>
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
              Updates live from the builder. Values marked (default) apply when a
              field is left empty.
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
            <input
              value={path}
              onChange={(event) => setPath(event.target.value)}
              aria-required="true"
            />
          </label>
          {command === "coverage" && <>
            <div className="field-group">
              <div className="field-header">
                <span>Optional arguments</span>
                <span className="badge badge-optional">Reorder</span>
              </div>
              <div className="argument-order-list" aria-label="Optional argument order">
                {[
                  { key: "format" as const, label: "Format", summary: "--format html" },
                  { key: "open" as const, label: "Open report", summary: "--open" },
                ].map((arg, index, all) => {
                  const selected = coverageOrder.includes(arg.key);
                  const currentIndex = coverageOrder.indexOf(arg.key);
                  return (
                    <div key={arg.key} className="argument-order-row">
                      <span className="argument-order-name">{arg.label}</span>
                      <span className="argument-order-summary">{arg.summary}</span>
                      <div className="argument-order-controls">
                        <button
                          type="button"
                          onClick={() => moveOptionalArg(arg.key, "up")}
                          disabled={currentIndex <= 0 || !selected}
                          aria-label={`Move ${arg.label} up`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveOptionalArg(arg.key, "down")}
                          disabled={currentIndex === -1 || currentIndex >= all.length - 1}
                          aria-label={`Move ${arg.label} down`}
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
          </>}
          {command === "limits" && <div className="row">
            <label>
              <div className="field-header">
                <span>Function</span>
                <span className="badge badge-required">Required</span>
              </div>
              <div id="fn-help" className="field-help">Use the exported symbol name from your contract ABI, such as batch_payout.</div>
              <input
                value={fn}
                onChange={(event) => setFn(event.target.value)}
                aria-required="true"
                aria-describedby="fn-help"
              />
            </label>
            <label>
              <div className="field-header">
                <span>Ramp parameter</span>
                <span className="badge badge-required">Required</span>
              </div>
              <div id="ramp-help" className="field-help">Use the parameter you want to increase in the contract input set; recipients is the default.</div>
              <input
                value={ramp}
                onChange={(event) => setRamp(event.target.value)}
                aria-required="true"
                aria-describedby="ramp-help"
              />
            </label>
          </div>}
          {command === "audit" && <label className="check">
            <span className="check-content">
              <input type="checkbox" checked={strict} onChange={(event) => setStrict(event.target.checked)} />
              <span>Fail on warnings</span>
            </span>
            <span className="badge badge-optional">Optional</span>
          </label>}

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
                This workflow has no empty-field fallbacks. The copied command uses
                the values you set above, exactly.
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

          <div className="output"><code>{generated}</code><button onClick={copy}>{copied ? "Copied" : "Copy"}</button></div>
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
                Configuration A is the workbench above. Edit configuration B and the
                table marks every setting that differs; both commands update as you
                type.
              </p>
            </div>

            <fieldset className="comparison-config">
              <legend>Configuration B</legend>
              <div className="row">
                <label>
                  <div className="field-header"><span>Workflow</span></div>
                  <select
                    value={configB.command}
                    onChange={(event) =>
                      updateConfigB({ command: event.target.value as CommandName })
                    }
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
                      onChange={(event) =>
                        updateConfigB({ format: event.target.value as CommandOptions["format"] })
                      }
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
              <button
                type="button"
                className="button secondary comparison-sync"
                onClick={() => setConfigB({ ...options })}
              >
                Match B to A
              </button>
            </fieldset>

            <div
              className="comparison-table-wrap"
              role="region"
              aria-label="Configuration differences"
              tabIndex={0}
            >
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
                <pre className="comparison-command"><code>{generated}</code></pre>
              </div>
              <div>
                <h4>Configuration B command</h4>
                <pre className="comparison-command"><code>{configBCommand}</code></pre>
              </div>
            </div>
          </section>
        )}
      </section>

      <footer><span>Built for the Stellar developer ecosystem.</span><span>Apache-2.0</span></footer>
    </main>
  );
}
