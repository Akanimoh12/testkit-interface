import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { CORE_REPO_URL, INSTALL_GUIDE_URL, INTERFACE_REPO_URL } from "./links";

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

  it("explains the empty state and returns focus to the search box on reset (#123)", () => {
    render(<App />);
    const filterInput = screen.getByLabelText("Filter modules");
    fireEvent.change(filterInput, { target: { value: "zzz" } });

    expect(screen.getByRole("heading", { name: /No modules match .zzz./ })).toBeInTheDocument();
    expect(document.getElementById("module-grid")).toBeNull();

    const resetButton = screen.getByRole("button", { name: "Reset filter" });
    resetButton.focus();
    fireEvent.click(resetButton);

    expect(filterInput).toHaveValue("");
    expect(filterInput).toHaveFocus();
    const grid = document.getElementById("module-grid") as HTMLElement;
    expect(within(grid).getAllByRole("article")).toHaveLength(7);
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
    expect(screen.getAllByText("Optional").length).toBeGreaterThanOrEqual(1);
  });
});

describe("Soroban workflow documentation and prerequisites", () => {
  it("shows the supported Rust and Soroban prerequisites in an accessible guide panel", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /supported rust and soroban prerequisites/i })).toBeInTheDocument();
    expect(screen.getByText(/Rust >= 1\.84/i)).toBeInTheDocument();
    expect(screen.getByText(/soroban-sdk 27\.0\.x/i)).toBeInTheDocument();
    expect(screen.getByText(/stellar-cli >= 22\.0\.0/i)).toBeInTheDocument();
    expect(screen.getAllByText(/wasm32v1-none/i).length).toBeGreaterThan(0);
  });

  it("renders keyboard-accessible workflow tabs for coverage, workspace, and resource limits tutorials", () => {
    render(<App />);

    const tablist = screen.getByRole("tablist", { name: /soroban workflow docs/i });
    expect(tablist).toBeInTheDocument();

    const coverageTab = screen.getByRole("tab", { name: /coverage workflow/i });
    const workspaceTab = screen.getByRole("tab", { name: /cargo workspace/i });
    const limitsTab = screen.getByRole("tab", { name: /resource limits/i });

    expect(coverageTab).toHaveAttribute("aria-selected", "true");
    expect(workspaceTab).toHaveAttribute("aria-selected", "false");
    expect(limitsTab).toHaveAttribute("aria-selected", "false");

    expect(screen.getByRole("tabpanel", { name: /coverage workflow/i })).toBeInTheDocument();
    expect(screen.getAllByText(/cargo llvm-?cov/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/workspace members/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/batch_payout/i).length).toBeGreaterThan(0);
  });
});

describe("Command builder enhancements", () => {
  it("allows optional coverage arguments to be reordered", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Move Open report up" }));

    expect(screen.getByTestId("command-output")).toHaveTextContent(
      "soroban-testkit coverage . --open --format html",
    );
  });

  it("requires confirmation before resetting the customized builder", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Reset builder" }));
    expect(confirmSpy).toHaveBeenCalledWith("Reset the command builder to its default values?");
    expect(screen.getByTestId("command-output")).toHaveTextContent(
      "soroban-testkit coverage . --format html --open",
    );

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Reset builder" }));
    expect(screen.getByTestId("command-output")).toHaveTextContent(
      "soroban-testkit coverage . --format html --open",
    );
  });

  it("displays contextual help beside function and ramp inputs", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "limits" }));

    expect(screen.getByText(/Use the exported symbol name from your contract ABI/i)).toBeInTheDocument();
    expect(screen.getByText(/Use the parameter you want to increase in the contract input set/i)).toBeInTheDocument();
  });

  it("supports a multiline advanced command editor", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Advanced arguments" }));

    const textarea = screen.getByLabelText("Advanced command arguments");
    fireEvent.change(textarea, {
      target: { value: "soroban-testkit audit ./src --strict" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply multiline command" }));

    expect(screen.getByTestId("command-output")).toHaveTextContent(
      "soroban-testkit audit ./src --strict",
    );
  });
});

describe("Repository and installation links (#120, #121, #122)", () => {
  it("links to the core Testkit repository from the footer (#120)", () => {
    render(<App />);
    // The footer sits inside <main>, so it is not a contentinfo landmark; query it directly.
    const footer = document.querySelector("footer") as HTMLElement;
    const link = within(footer).getByRole("link", { name: "Soroban Testkit core repository" });
    expect(link).toHaveAttribute("href", CORE_REPO_URL);
    expect(CORE_REPO_URL).toBe("https://github.com/soroban-testkit/testkit-blockchain");
  });

  it("has a dedicated section linking to the full installation instructions (#121)", () => {
    render(<App />);
    const section = screen.getByRole("complementary", { name: "Full installation instructions" });
    const link = within(section).getByRole("link", { name: /Read the installation guide/ });
    expect(link).toHaveAttribute("href", INSTALL_GUIDE_URL);
    expect(INSTALL_GUIDE_URL).toBe("https://github.com/soroban-testkit/testkit-blockchain#installation");
  });

  it("shows a prominent link to the interface repository in the hero (#122)", () => {
    render(<App />);
    const link = screen.getByRole("link", { name: /View this interface on GitHub/ });
    expect(link).toHaveAttribute("href", INTERFACE_REPO_URL);
    expect(INTERFACE_REPO_URL).toBe("https://github.com/soroban-testkit/testkit-interface");
  });

  it("makes every new link reachable by keyboard", () => {
    render(<App />);
    for (const name of [
      "Soroban Testkit core repository",
      /Read the installation guide/,
      /View this interface on GitHub/,
    ]) {
      const link = screen.getByRole("link", { name });
      link.focus();
      expect(link).toHaveFocus();
    }
  });
});
