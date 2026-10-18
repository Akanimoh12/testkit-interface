import { useMemo, useState } from "react";
import { buildCommand, modules, type CommandName } from "./testkit";
import { copyToClipboard } from "./clipboard";

const descriptions: Record<CommandName, string> = {
  coverage: "Generate contract-test coverage through cargo-llvm-cov.",
  limits: "Ramp a contract input to find its practical resource ceiling.",
  audit: "Scan contract sources for common auth, arithmetic, and TTL risks.",
};

const fieldClasses = "field-input";

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
  const [coverageGuideOpen, setCoverageGuideOpen] = useState(true);
  const [auditGuideOpen, setAuditGuideOpen] = useState(true);

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

      <section className="commands" id="commands">
        <div className="command-copy">
          <p className="eyebrow">CLI workbench</p>
          <h2>From intent to command.</h2>
          <p>Configure a supported Testkit workflow and copy the exact command to your terminal.</p>
          <div className="command-tabs" role="tablist">
            {(["coverage", "limits", "audit"] as const).map((name) => (
              <button
                key={name}
                className={command === name ? "active" : ""}
                onClick={() => setCommand(name)}
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
          </div>}
          {command === "audit" && <label className="check">
            <span className="check-content">
              <input type="checkbox" checked={strict} onChange={(event) => setStrict(event.target.checked)} />
              <span>Fail on warnings</span>
            </span>
            <span className="badge badge-optional">Optional</span>
          </label>}
          <div className="output-wrap">
            <div className="output"><code>{generated}</code><button onClick={copy}>{copied ? "Copied" : "Copy"}</button></div>
            <div className="command-meta" aria-live="polite">
              <span>Command length: {generated.length} characters</span>
            </div>
          </div>
        </div>
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
                <li>Choose HTML output when you want a visual report and open it immediately after generation.</li>
                <li>Read branch and line coverage together: low execution density usually explains weak confidence more than raw percentages.</li>
                <li>Use the report to prioritize untested edge cases before shipping a contract update.</li>
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
                <li>Review auth and storage access warnings first; they often explain failure modes and privilege issues.</li>
                <li>Use the strict mode toggle when you want warning-level findings to block release readiness.</li>
                <li>Pair each finding with a focused regression test before finalizing the deployment checklist.</li>
              </ol>
            </div>
          )}
        </article>
      </section>

      <footer><span>Built for the Stellar developer ecosystem.</span><span>Apache-2.0</span></footer>
    </main>
  );
}
