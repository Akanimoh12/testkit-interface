import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

describe("Active section tracking in navigation (#128)", () => {
  class IntersectionObserverMock {
    static instances: IntersectionObserverMock[] = [];
    constructor(public callback: IntersectionObserverCallback) {
      IntersectionObserverMock.instances.push(this);
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
  }

  const emit = (id: string, isIntersecting: boolean) => {
    const observer = IntersectionObserverMock.instances[0];
    act(() => {
      observer.callback(
        [{ isIntersecting, target: document.getElementById(id) } as unknown as IntersectionObserverEntry],
        observer as unknown as IntersectionObserver,
      );
    });
  };

  beforeEach(() => {
    IntersectionObserverMock.instances = [];
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks the navigation link for the section currently in view", () => {
    render(<App />);

    emit("modules", true);

    expect(screen.getByRole("link", { name: "Modules" })).toHaveAttribute("aria-current", "location");
    expect(screen.getByRole("link", { name: "Install" })).not.toHaveAttribute("aria-current");
  });

  it("clears the highlight when the active section leaves the viewport", () => {
    render(<App />);

    emit("modules", true);
    emit("modules", false);

    expect(screen.getByRole("link", { name: "Modules" })).not.toHaveAttribute("aria-current");
  });

  it("highlights a link immediately on pointer click", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("link", { name: "Commands" }));

    expect(screen.getByRole("link", { name: "Commands" })).toHaveAttribute("aria-current", "location");
  });

  it("highlights a link when it receives keyboard focus", () => {
    render(<App />);

    fireEvent.focus(screen.getByRole("link", { name: "Install" }));

    expect(screen.getByRole("link", { name: "Install" })).toHaveAttribute("aria-current", "location");
  });
});

describe("Navigation landmark label (#131)", () => {
  it("labels the page navigation landmark", () => {
    render(<App />);

    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
  });
});

describe("Module card command builder links (#129, #130)", () => {
  it("gives every module card an anchor to the command builder", () => {
    render(<App />);

    const anchors = screen.getAllByRole("link", { name: /open the command builder from the/i });
    expect(anchors).toHaveLength(7);
    anchors.forEach((anchor) => expect(anchor).toHaveAttribute("href", "#commands"));
  });

  it("links each module to its related workflows and selects that workflow", () => {
    render(<App />);

    const moneyAudit = screen.getByRole("link", { name: "Open the audit workflow related to money" });
    const moneyLimits = screen.getByRole("link", { name: "Open the limits workflow related to money" });
    expect(moneyAudit).toHaveAttribute("href", "#commands");
    expect(moneyLimits).toHaveAttribute("href", "#commands");

    fireEvent.click(moneyLimits);

    expect(screen.getByRole("button", { name: "limits" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("command-output")).toHaveTextContent("soroban-testkit limits");
  });
});
