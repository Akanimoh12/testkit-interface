# Soroban Testkit Interface

A visual companion to [Soroban Testkit](https://github.com/soroban-testkit/testkit-blockchain). It documents the library's focused testing modules and provides a command builder for the supported CLI workflows.

The interface does not execute contracts in the browser. Generated commands run locally through `soroban-testkit`, keeping contract tests deterministic and offline as required by the core project.

## Features

- **Design System & Theme Tokens**: Comprehensive CSS custom property scale (`:root`) standardizing color schemes (canvas, surfaces, accent, text hierarchy, borders) and spacing increments.
- **Module Filter & Empty State**: Search and filter testing modules by name or description with real-time feedback and an accessible empty-state layout with quick filter reset.
- **Responsive & Reduced-Width Navigation**: Accessible navigation layout supporting truncated and responsive labels without overflowing viewport on mobile or narrow screens.
- **Required vs. Optional Setting Distinction**: Visual badges (`Required` / `Optional`) and `aria-required` attributes in the CLI workbench distinguishing mandatory parameters from optional configuration flags.
- **Optional Argument Reordering**: Coverage and audit options can be reordered with keyboard-accessible up/down controls so advanced users can put the most important flags first.
- **Safe Reset Confirmation**: Resetting the command builder asks for explicit confirmation before restoring defaults, preventing accidental form resets.
- **Contextual Input Guidance**: Function and ramp fields include inline help text explaining what each value should look like in real contract workflows.
- **Multiline Advanced Editor**: A dedicated multiline editor lets power users review or paste full command snippets and apply them back into the workbench.

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
