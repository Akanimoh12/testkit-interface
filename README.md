# Soroban Testkit Interface

A visual companion to [Soroban Testkit](https://github.com/soroban-testkit/testkit-blockchain). It documents the library's focused testing modules and provides a command builder for the supported CLI workflows.

The interface does not execute contracts in the browser. Generated commands run locally through `soroban-testkit`, keeping contract tests deterministic and offline as required by the core project.

## Features

- **Design System & Theme Tokens**: Comprehensive CSS custom property scale (`:root`) standardizing color schemes (canvas, surfaces, accent, text hierarchy, borders) and spacing increments.
- **Module Filter & Empty State**: Search and filter testing modules by name or description with real-time feedback and an accessible empty-state layout with quick filter reset.
- **Responsive & Reduced-Width Navigation**: Accessible navigation layout supporting truncated and responsive labels without overflowing viewport on mobile or narrow screens.
- **Required vs. Optional Setting Distinction**: Visual badges (`Required` / `Optional`) and `aria-required` attributes in the CLI workbench distinguishing mandatory parameters from optional configuration flags.
- **Clear Input Controls**: Fast keyboard- and mouse-friendly clearing for project paths, function names, and ramp parameters to recover from mistakes without retyping values.
- **Command Length Indicator**: Displays the current generated command length in characters so terminal copy workflows are easier to reason about before execution.
- **Workflow Guides**: Built-in walkthroughs for the Coverage report guide and the Audit workflow tutorial to explain what to look for in generated reports and how to apply the flow in practice.

## Coverage report guide

Use the coverage workflow to answer three questions quickly:

1. Does the crate actually execute the risky paths you care about?
2. Which branches or lines remain untested after the most recent change?
3. Are the low-coverage hotspots aligned with the contract risk model?

A healthy report usually combines several signals: broad branch coverage, a few high-value untested edge cases, and a clear reduction in missing assertions around security-sensitive paths.

## Audit workflow tutorial

The audit workflow is best used as a structured validation pass rather than a single command:

1. Point the audit at the exact contract directory or workspace area that changed.
2. Review auth, arithmetic, and TTL findings before anything else.
3. Verify each warning with a targeted regression or invariant test.
4. Use `--strict` when the release gate should fail on warning-level issues.

This keeps the output actionable without turning the scanner into a noisy blocker.

## Development

```sh
npm install
npm run dev
```

## Validation

```sh
npm run build
npm test
```

## Project boundary

- Rust testing library and CLI: `testkit-blockchain`
- Documentation and CLI workbench: this repository

Licensed under Apache-2.0.
