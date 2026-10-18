import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("App command copy", () => {
  const originalClipboard = navigator.clipboard;

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it("copies the currently generated command to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("soroban-testkit coverage . --format html --open"),
    );
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("copies the command for the selected tab, not the default one", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "audit" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("soroban-testkit audit . --strict"),
    );
  });

  it("still copies successfully when the browser has no Clipboard API", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand;

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() => expect(execCommand).toHaveBeenCalledWith("copy"));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });
});

describe("Module filter and empty-state layout (#188)", () => {
  it("renders all 7 modules by default", () => {
    render(<App />);
    expect(screen.getByText("core")).toBeInTheDocument();
    expect(screen.getByText("ledger")).toBeInTheDocument();
    expect(screen.getByText("money")).toBeInTheDocument();
    expect(screen.getByText("events")).toBeInTheDocument();
    expect(screen.getByText("tokens")).toBeInTheDocument();
    expect(screen.getByText("auth")).toBeInTheDocument();
    expect(screen.getByText("ttl")).toBeInTheDocument();
  });

  it("filters modules matching search query by name or description", () => {
    render(<App />);
    const filterInput = screen.getByLabelText("Filter modules");

    fireEvent.change(filterInput, { target: { value: "ledger" } });

    expect(screen.getByText("ledger")).toBeInTheDocument();
    expect(screen.queryByText("tokens")).not.toBeInTheDocument();
    expect(screen.queryByText("auth")).not.toBeInTheDocument();
  });

  it("renders an accessible empty-state layout when no modules match the filter", () => {
    render(<App />);
    const filterInput = screen.getByLabelText("Filter modules");

    fireEvent.change(filterInput, { target: { value: "nonexistent-module" } });

    const emptyState = screen.getByRole("status");
    expect(emptyState).toBeInTheDocument();
    expect(emptyState).toHaveAttribute("aria-live", "polite");
    expect(
      screen.getByText(/No modules match/i),
    ).toBeInTheDocument();

    const resetButton = screen.getByRole("button", { name: "Reset filter" });
    expect(resetButton).toBeInTheDocument();

    fireEvent.click(resetButton);

    expect(screen.getByText("core")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("clears the filter using the Clear button", () => {
    render(<App />);
    const filterInput = screen.getByLabelText("Filter modules");

    fireEvent.change(filterInput, { target: { value: "events" } });
    expect(screen.getByText("events")).toBeInTheDocument();
    expect(screen.queryByText("ttl")).not.toBeInTheDocument();

    const clearButton = screen.getByRole("button", { name: "Clear module filter" });
    fireEvent.click(clearButton);

    expect(screen.getByText("ttl")).toBeInTheDocument();
  });
});

describe("Reduced-width layout for navigation labels (#189)", () => {
  it("renders accessible navigation links with responsive container attributes", () => {
    render(<App />);
    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();

    const brand = screen.getByLabelText("Soroban Testkit home");
    expect(brand).toBeInTheDocument();

    const links = screen.getByLabelText("Main navigation");
    expect(links).toBeInTheDocument();
    expect(screen.getByText("Modules")).toHaveAttribute("href", "#modules");
    expect(screen.getByText("Commands")).toHaveAttribute("href", "#commands");
    expect(screen.getByText("GitHub ↗")).toHaveAttribute(
      "href",
      "https://github.com/soroban-testkit/testkit-blockchain",
    );
  });
});

describe("Visual distinction between required and optional settings (#196)", () => {
  it("displays Required badge and aria-required on required path input", () => {
    render(<App />);
    const pathInput = screen.getByLabelText(/project or contract path/i);
    expect(pathInput).toHaveAttribute("aria-required", "true");
    expect(screen.getAllByText("Required").length).toBeGreaterThanOrEqual(1);
  });

  it("displays Optional badge on optional format and open options in coverage workflow", () => {
    render(<App />);
    expect(screen.getByLabelText(/report format/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/open report when complete/i)).toBeInTheDocument();
    expect(screen.getAllByText("Optional").length).toBeGreaterThanOrEqual(2);
  });

  it("displays Required badges and aria-required on function and ramp in limits workflow", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "limits" }));

    const fnInput = screen.getByLabelText(/function/i);
    const rampInput = screen.getByLabelText(/ramp parameter/i);

    expect(fnInput).toHaveAttribute("aria-required", "true");
    expect(rampInput).toHaveAttribute("aria-required", "true");
  });

  it("displays Optional badge on fail on warnings option in audit workflow", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "audit" }));

    expect(screen.getByLabelText(/fail on warnings/i)).toBeInTheDocument();
    expect(screen.getByText("Optional")).toBeInTheDocument();
  });
});

describe("First-time installation workflow (#155)", () => {
  const originalClipboard = navigator.clipboard;

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it("links an Install entry in the main navigation", () => {
    render(<App />);
    expect(screen.getByText("Install")).toHaveAttribute("href", "#install");
  });

  it("lists the installation steps in order with their commands", () => {
    render(<App />);
    const section = screen.getByRole("region", {
      name: /from a clean machine to your first command/i,
    });

    const titles = within(section)
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
    expect(titles).toEqual([
      "Add the WebAssembly target",
      "Install the soroban-testkit CLI",
      "Install the coverage wrapper",
      "Add the crate to your contract",
      "Verify the installation",
      "Build your first command",
    ]);

    expect(within(section).getAllByRole("listitem")).toHaveLength(6);
    expect(
      within(section).getByText("cargo install soroban-testkit-cli --locked"),
    ).toBeInTheDocument();
  });

  it("copies an installation command from its step", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Copy step 2 command" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        "cargo install soroban-testkit-cli --locked",
      ),
    );
    expect(screen.getByRole("button", { name: "Copy step 2 command" })).toHaveTextContent(
      "Copied",
    );
  });

  it("activates an installation copy button from the keyboard", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<App />);

    const button = screen.getByRole("button", { name: "Copy step 1 command" });
    button.focus();
    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("rustup target add wasm32v1-none"),
    );
    expect(button).toHaveTextContent("Copied");
  });
});

describe("Effective defaults preview (#150)", () => {
  it("previews the limits fallbacks that will be applied once fields are cleared", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "limits" }));

    let preview = screen.getByRole("region", { name: "Effective defaults" });
    expect(within(preview).getAllByText("From your input")).toHaveLength(3);
    expect(within(preview).getByText("0 of 3 applied")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/project or contract path/i), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText(/function/i), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText(/ramp parameter/i), {
      target: { value: "" },
    });

    preview = screen.getByRole("region", { name: "Effective defaults" });
    expect(within(preview).getAllByText("Default applied")).toHaveLength(3);
    expect(within(preview).getByText("3 of 3 applied")).toBeInTheDocument();
    expect(within(preview).getByText(/batch_payout/)).toBeInTheDocument();
    expect(within(preview).getByText(/recipients/)).toBeInTheDocument();
    expect(
      within(preview).getByText(/target\/wasm32v1-none\/release\/contract\.wasm/),
    ).toBeInTheDocument();
  });

  it("switches a row to the typed value once the user provides one", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "limits" }));

    fireEvent.change(screen.getByLabelText(/function/i), {
      target: { value: "execute_equal" },
    });

    const preview = screen.getByRole("region", { name: "Effective defaults" });
    expect(within(preview).getByText("execute_equal")).toBeInTheDocument();
    expect(within(preview).getAllByText("From your input")).toHaveLength(3);
    expect(within(preview).queryByText("Default applied")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/ramp parameter/i), {
      target: { value: "" },
    });

    expect(
      within(screen.getByRole("region", { name: "Effective defaults" })).getByText(
        "1 of 3 applied",
      ),
    ).toBeInTheDocument();
  });

  it("explains that coverage has no empty-field fallbacks", () => {
    render(<App />);

    const preview = screen.getByRole("region", { name: "Effective defaults" });
    expect(
      within(preview).getByText(/no empty-field fallbacks/i),
    ).toBeInTheDocument();
    expect(within(preview).queryByText("Default applied")).not.toBeInTheDocument();
  });

  it("applies the audit source-path default when the path is empty", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "audit" }));
    fireEvent.change(screen.getByLabelText(/project or contract path/i), {
      target: { value: "" },
    });

    const preview = screen.getByRole("region", { name: "Effective defaults" });
    expect(within(preview).getByText(/\.\/src/)).toBeInTheDocument();
    expect(within(preview).getByText("Default applied")).toBeInTheDocument();
  });
});

describe("Command summary card (#156)", () => {
  it("summarizes the active coverage settings", () => {
    render(<App />);

    const card = screen.getByRole("region", { name: "Command summary" });
    expect(within(card).getByText("coverage")).toBeInTheDocument();
    expect(within(card).getByText("Report format")).toBeInTheDocument();
    expect(within(card).getByText("html")).toBeInTheDocument();
    expect(within(card).getByText("Open report when complete")).toBeInTheDocument();
    expect(within(card).getByText("On")).toBeInTheDocument();
  });

  it("tracks builder edits and workflow switches", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText(/project or contract path/i), {
      target: { value: "./contracts/escrow" },
    });

    let card = screen.getByRole("region", { name: "Command summary" });
    expect(within(card).getByText("./contracts/escrow")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "limits" }));

    card = screen.getByRole("region", { name: "Command summary" });
    expect(within(card).getByText("limits")).toBeInTheDocument();
    expect(within(card).getByText("batch_payout")).toBeInTheDocument();
    expect(within(card).getByText("recipients")).toBeInTheDocument();
  });

  it("marks values that fall back to defaults", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "audit" }));
    fireEvent.change(screen.getByLabelText(/project or contract path/i), {
      target: { value: "" },
    });

    const card = screen.getByRole("region", { name: "Command summary" });
    expect(within(card).getByText("./src (default)")).toBeInTheDocument();
  });
});

describe("Command comparison view (#151)", () => {
  it("reveals the panel from the keyboard with correct aria wiring", async () => {
    const user = userEvent.setup();
    render(<App />);

    const toggle = screen.getByRole("button", {
      name: "Compare two configurations",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "comparison-panel");

    toggle.focus();
    await user.keyboard("{Enter}");

    expect(toggle).toHaveAttribute("aria-expanded", "true");

    const panel = screen.getByRole("region", {
      name: "Compare two configurations",
    });
    expect(panel).toHaveAttribute("id", "comparison-panel");
    expect(panel).toHaveFocus();
  });

  it("starts configuration B from configuration A and marks changed settings", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Compare two configurations" }),
    );

    const panel = screen.getByRole("region", {
      name: "Compare two configurations",
    });
    const table = within(panel).getByRole("table", {
      name: /setting comparison between configuration a and configuration b/i,
    });

    expect(within(table).getAllByRole("row")).toHaveLength(5);
    expect(within(table).queryByText("Changed")).not.toBeInTheDocument();

    fireEvent.change(within(panel).getByLabelText(/project or contract path/i), {
      target: { value: "./contracts/escrow" },
    });

    const pathRow = within(table).getByRole("row", {
      name: /project or contract path/i,
    });
    expect(within(pathRow).getByText("Changed")).toBeInTheDocument();
    expect(within(pathRow).getByText("./contracts/escrow")).toBeInTheDocument();
  });

  it("syncs configuration B back to configuration A", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Compare two configurations" }),
    );

    const panel = screen.getByRole("region", {
      name: "Compare two configurations",
    });
    fireEvent.change(within(panel).getByLabelText(/project or contract path/i), {
      target: { value: "./contracts/escrow" },
    });
    expect(within(panel).getByText("Changed")).toBeInTheDocument();

    const sync = within(panel).getByRole("button", { name: "Match B to A" });
    sync.focus();
    await user.keyboard(" ");

    expect(within(panel).queryByText("Changed")).not.toBeInTheDocument();
    expect(within(panel).getAllByText("Matches")).toHaveLength(4);
  });

  it("renders both generated commands and updates configuration B's", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Compare two configurations" }),
    );

    const panel = screen.getByRole("region", {
      name: "Compare two configurations",
    });
    expect(
      within(panel).getAllByText("soroban-testkit coverage . --format html --open"),
    ).toHaveLength(2);

    fireEvent.change(within(panel).getByLabelText(/project or contract path/i), {
      target: { value: "./contracts/escrow" },
    });

    expect(
      within(panel).getByText(
        "soroban-testkit coverage ./contracts/escrow --format html --open",
      ),
    ).toBeInTheDocument();
  });

  it("follows configuration B's workflow change in the comparison table", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Compare two configurations" }),
    );

    const panel = screen.getByRole("region", {
      name: "Compare two configurations",
    });
    fireEvent.change(within(panel).getByLabelText(/workflow/i), {
      target: { value: "audit" },
    });

    const table = within(panel).getByRole("table", {
      name: /setting comparison between configuration a and configuration b/i,
    });
    const workflowRow = within(table).getByRole("row", { name: /workflow/i });
    expect(within(workflowRow).getByText("Changed")).toBeInTheDocument();
    expect(
      within(table).getByRole("row", { name: /fail on warnings/i }),
    ).toBeInTheDocument();
    expect(within(panel).getByLabelText(/fail on warnings/i)).toBeInTheDocument();
  });
});
