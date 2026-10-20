# Soroban Testkit Interface

A visual companion to [Soroban Testkit](https://github.com/soroban-testkit/testkit-blockchain). It documents the library's focused testing modules and provides a command builder for the supported CLI workflows.

The interface does not execute contracts in the browser. Generated commands run locally through `soroban-testkit`, keeping contract tests deterministic and offline as required by the core project.

## Supported Rust and Soroban prerequisites

The interface targets the current supported ecosystem for local Soroban development and contract validation:

- Rust >= 1.84 with the `wasm32v1-none` target installed.
- `soroban-sdk` 27.0.x for current contract builds and tests.
- `stellar-cli` >= 22.0.0 for local contract inspection and deployment workflows.
- Cargo workspace layout with explicit workspace members and a stable resolver.

## Workflow tutorials

### 1) Complete coverage workflow

Use the coverage workflow from the project root, then export an HTML or LCOV report for review:

```sh
cargo llvm-cov --workspace --all-features --html
cargo llvm-cov --workspace --lcov --output-path lcov.info
```

This is the recommended local path for contract coverage before shipping a Soroban change.

### 2) Cargo workspace layout example

A simple workspace keeps shared dependencies and contract crates organized:

```toml
[workspace]
members = [
  "contracts/asset",
  "contracts/escrow",
  "contracts/auction",
]
resolver = "2"
```

This keeps each contract module isolated while making the root workspace easy to test, cover, and audit.

### 3) Resource limits workflow

When validating a contract's practical ceiling, compile the WASM artifact and sweep the target function with the limit ramp:

```sh
soroban-testkit limits \
  --contract target/wasm32v1-none/release/contract.wasm \
  --fn batch_payout \
  --ramp recipients
```

This workflow is useful for exploring the exact resource ceiling of auth-heavy or high-volume entrypoints.

## Features

- **Design System & Theme Tokens**: Comprehensive CSS custom property scale (`:root`) standardizing color schemes (canvas, surfaces, accent, text hierarchy, borders) and spacing increments.
- **Module Filter & Empty State**: Search and filter testing modules by name or description with real-time feedback and an accessible empty-state layout with quick filter reset. The empty state names the search term, is announced via `role="status"`, and **Reset filter** returns keyboard focus to the search box.
- **Repository & Installation Links**: The hero links prominently to this interface's repository, the install section ends with a dedicated *Full installation instructions* card linking to the core repository's installation guide, and the footer links to the core [Soroban Testkit repository](https://github.com/soroban-testkit/testkit-blockchain). All are plain, keyboard-focusable links with visible focus outlines.
- **Responsive & Reduced-Width Navigation**: Accessible navigation layout supporting truncated and responsive labels without overflowing viewport on mobile or narrow screens.
- **Required vs. Optional Setting Distinction**: Visual badges (`Required` / `Optional`) and `aria-required` attributes in the CLI workbench distinguishing mandatory parameters from optional configuration flags.
- **Optional Argument Reordering**: Coverage and audit options can be reordered with keyboard-accessible up/down controls so advanced users can put the most important flags first.
- **Safe Reset Confirmation**: Resetting the command builder asks for explicit confirmation before restoring defaults, preventing accidental form resets.
- **Contextual Input Guidance**: Function and ramp fields include inline help text explaining what each value should look like in real contract workflows.
- **Multiline Advanced Editor**: A dedicated multiline editor lets power users review or paste full command snippets and apply them back into the workbench.
- **Active Section Navigation**: The top navigation marks the section in view (`aria-current="location"`) as you scroll, click, or tab through the links.
- **Labelled Navigation Landmark**: The page navigation is exposed as a landmark named "Main navigation" so assistive technology users can jump to it.
- **Module Command Links**: Each module card links to the command builder and to the CLI workflows most relevant to that module (for example, `money` links to `audit` and `limits`). Selecting a workflow link sets the builder to that workflow.

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
