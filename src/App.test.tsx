import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    const pathInput = screen.getByLabelText("Project or contract path");
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

    const fnInput = screen.getByLabelText("Function");
    const rampInput = screen.getByLabelText("Ramp parameter");

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

describe("Repository and installation links (#120, #121, #122)", () => {
  it("links the interface, the install guide, and the core repository to their URLs", () => {
    render(<App />);

    expect(screen.getByRole("link", { name: /view this interface on github/i })).toHaveAttribute(
      "href",
      INTERFACE_REPO_URL,
    );
    expect(screen.getByRole("link", { name: /read the installation guide/i })).toHaveAttribute(
      "href",
      INSTALL_GUIDE_URL,
    );
    expect(screen.getByRole("link", { name: "Soroban Testkit core repository" })).toHaveAttribute(
      "href",
      CORE_REPO_URL,
    );
  });
});

describe("Keyboard-only navigation (#109)", () => {
  it("offers a skip link as the first focusable element that targets the page content", () => {
    render(<App />);

    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    expect(skipLink).toHaveAttribute("href", "#top");
    expect(document.querySelector("main")?.firstElementChild).toBe(skipLink);
    expect(document.getElementById("top")).toHaveAttribute("tabindex", "-1");
  });

  it("moves between workflow tabs with the arrow, Home, and End keys", () => {
    render(<App />);
    const coverageTab = screen.getByRole("tab", { name: /coverage workflow/i });
    const workspaceTab = screen.getByRole("tab", { name: /cargo workspace/i });
    const limitsTab = screen.getByRole("tab", { name: /resource limits/i });

    coverageTab.focus();
    fireEvent.keyDown(coverageTab, { key: "ArrowRight" });
    expect(workspaceTab).toHaveAttribute("aria-selected", "true");
    expect(workspaceTab).toHaveFocus();

    fireEvent.keyDown(workspaceTab, { key: "End" });
    expect(limitsTab).toHaveAttribute("aria-selected", "true");
    expect(limitsTab).toHaveFocus();

    fireEvent.keyDown(limitsTab, { key: "ArrowRight" });
    expect(coverageTab).toHaveAttribute("aria-selected", "true");
    expect(coverageTab).toHaveFocus();

    fireEvent.keyDown(coverageTab, { key: "ArrowLeft" });
    expect(limitsTab).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(limitsTab, { key: "Home" });
    expect(coverageTab).toHaveAttribute("aria-selected", "true");
  });
});

describe("Screen reader semantics (#108)", () => {
  it("exposes the command selector as a group of toggle buttons rather than a tablist", () => {
    render(<App />);

    expect(screen.queryByRole("tablist", { name: "Command workflow selector" })).not.toBeInTheDocument();
    const group = screen.getByRole("group", { name: "Command workflow selector" });
    expect(within(group).getByRole("button", { name: "coverage" })).toHaveAttribute("aria-pressed", "true");
  });

  it("names the example terminal as a region so its code is announced with a label", () => {
    render(<App />);

    expect(screen.getByRole("region", { name: "Example Soroban test" })).toBeInTheDocument();
  });

  it("gives each clear button a field-specific name", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "Clear project or contract path" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "limits" }));
    expect(screen.getByRole("button", { name: "Clear function" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear ramp parameter" })).toBeInTheDocument();
  });

  it("announces a successful command copy through a polite live region", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Copy", exact: true }));

    const announcement = await screen.findByText("Command copied to clipboard");
    expect(announcement).toHaveAttribute("aria-live", "polite");
  });

  it("announces which install step was copied", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Copy step 2 command" }));

    expect(await screen.findByText("Step 2 command copied to clipboard")).toBeInTheDocument();
  });
});

describe("Navigation enhancements (#112, #113, #114, #115)", () => {
  it("marks decorative terminal dots with aria-hidden", () => {
    render(<App />);
    const terminal = screen.getByRole("region", { name: "Example Soroban test" });
    const decorativeDots = terminal.querySelectorAll("i[aria-hidden='true']");
    expect(decorativeDots).toHaveLength(3);
  });

  it("provides accessible label for terminal test result", () => {
    render(<App />);
    const passLabel = screen.getByLabelText("test result: ok");
    expect(passLabel).toBeInTheDocument();
    expect(passLabel).toHaveTextContent("✓ test result: ok");
  });

  it("makes section headings focusable with tabIndex=-1 for skip link targets", () => {
    render(<App />);
    expect(document.getElementById("install")).toHaveAttribute("tabindex", "-1");
    expect(document.getElementById("modules")).toHaveAttribute("tabindex", "-1");
    expect(document.getElementById("commands")).toHaveAttribute("tabindex", "-1");
  });

  it("highlights the current section in the navigation", async () => {
    render(<App />);
    const navLinks = screen.getAllByRole("link", { name: /^(Install|Modules|Commands)$/ });

    const installLink = navLinks.find(link => link.textContent === "Install");
    expect(installLink).not.toHaveAttribute("aria-current");

    fireEvent.click(installLink!);
    expect(installLink).toHaveAttribute("aria-current", "location");
  });

  it("preserves scroll padding for sticky navigation when navigating with anchors", () => {
    render(<App />);
    const html = document.documentElement;
    expect(html).toHaveStyle("scroll-padding-top: 78px");
  });
});
