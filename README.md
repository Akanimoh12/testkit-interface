# Soroban Testkit Interface

A visual companion to [Soroban Testkit](https://github.com/soroban-testkit/testkit-blockchain). It documents the library's focused testing modules and provides a command builder for the supported CLI workflows.

The interface does not execute contracts in the browser. Generated commands run locally through `soroban-testkit`, keeping contract tests deterministic and offline as required by the core project.

## Features

- **Design System & Theme Tokens**: Comprehensive CSS custom property scale (`:root`) standardizing color schemes (canvas, surfaces, accent, text hierarchy, borders) and spacing increments.
- **Module Filter & Empty State**: Search and filter testing modules by name or description with real-time feedback and an accessible empty-state layout with quick filter reset.
- **Responsive & Reduced-Width Navigation**: Accessible navigation layout supporting truncated and responsive labels without overflowing viewport on mobile or narrow screens.
- **Required vs. Optional Setting Distinction**: Visual badges (`Required` / `Optional`) and `aria-required` attributes in the CLI workbench distinguishing mandatory parameters from optional configuration flags.
- **First-Time Installation Workflow**: A six-step `#install` section covering the WASM target, the CLI, the coverage wrapper, the dev-dependency, verification, and a first command — each step with a keyboard-accessible copy button.
- **Command Comparison View**: A disclosure panel (`aria-expanded` / `aria-controls`) that compares configuration A with a fully editable configuration B, marking every changed setting in a scrollable table and showing both generated commands.
- **Effective Defaults Preview**: A pre-copy panel that lists the fallback values the CLI will substitute for empty fields (for example `batch_payout`, `recipients`, and `./src`) and flags them as `Default applied`.
- **Command Summary Card**: A live `Command summary` region recapping the active workflow's effective settings, marking values that fall back to defaults.

## First-time installation

1. `rustup target add wasm32v1-none` — add the WASM target used by `limits`.
2. `cargo install soroban-testkit-cli --locked` — install the CLI (from a workspace checkout: `cargo install --path crates/cli --locked`).
3. `cargo install cargo-llvm-cov` — install the wrapper used by `coverage`.
4. `cargo add --dev soroban-testkit` — add the testing crate to your contract.
5. `soroban-testkit --help` — verify the binary resolves on your PATH.
6. Build your first command in the [CLI workbench](#commands); the effective-defaults preview shows every value before you copy it.

The landing page mirrors these steps in the **First-time setup** section.

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
