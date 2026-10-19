import { type KeyboardEvent, useMemo, useState } from "react";
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

export default function App() {
  const [command, setCommand] = useState<CommandName>("coverage");
  const [path, setPath] = useState(".");
  const [format, setFormat] = useState<"html" | "lcov" | "text">("html");
  const [open, setOpen] = useState(true);
  const [fn, setFn] = useState("batch_payout");
  const [ramp, setRamp] = useState("recipients");
  const [strict, setStrict] = useState(true);
  const [copied, setCopied] = useState(false);
  const [moduleFilter, setModuleFilter] = useState("");
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowTabId>("coverage");

  const generated = useMemo(
    () => buildCommand({ command, path, format, open, fn, ramp, strict }),
    [command, path, format, open, fn, ramp, strict],
  );

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
              <input value={fn} onChange={(event) => setFn(event.target.value)} aria-required="true" />
            </label>
            <label>
              <div className="field-header">
                <span>Ramp parameter</span>
                <span className="badge badge-required">Required</span>
              </div>
              <input value={ramp} onChange={(event) => setRamp(event.target.value)} aria-required="true" />
            </label>
          </div>}
          {command === "audit" && <label className="check">
            <span className="check-content">
              <input type="checkbox" checked={strict} onChange={(event) => setStrict(event.target.checked)} />
              <span>Fail on warnings</span>
            </span>
            <span className="badge badge-optional">Optional</span>
          </label>}
          <div className="output"><code>{generated}</code><button onClick={copy}>{copied ? "Copied" : "Copy"}</button></div>
        </div>
      </section>

      <footer><span>Built for the Stellar developer ecosystem.</span><span>Apache-2.0</span></footer>
    </main>
  );
}
