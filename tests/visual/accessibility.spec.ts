import { expect, test } from "@playwright/test";

test.describe("keyboard-only navigation (#109)", () => {
  test("skip link moves keyboard focus past the navigation to the page content", async ({ page }) => {
    await page.goto("/");

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await expect(skipLink).toBeFocused();

    // The link sits off-screen until it receives focus; it must be on-screen then.
    const box = await skipLink.boundingBox();
    expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);

    await page.keyboard.press("Enter");
    await expect(page.locator("#top")).toBeFocused();
  });

  test("every focusable control shows an outline when it receives keyboard focus", async ({ page }) => {
    await page.goto("/");

    const offenders: string[] = [];
    let visited = 0;
    for (let i = 0; i < 150; i += 1) {
      await page.keyboard.press("Tab");
      const state = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        if (!element || element === document.body) return null;
        const style = getComputedStyle(element);
        return {
          label: `${element.tagName.toLowerCase()}:${(element.getAttribute("aria-label") || element.textContent || "").trim().slice(0, 40)}`,
          outlineStyle: style.outlineStyle,
          outlineWidth: parseFloat(style.outlineWidth),
        };
      });
      // Tabbing past the last control returns focus to the document body.
      if (!state) break;
      visited += 1;
      if (state.outlineStyle !== "solid" || state.outlineWidth < 2) offenders.push(state.label);
    }

    expect(visited).toBeGreaterThan(40);
    expect(offenders).toEqual([]);
  });

  test("workflow tabs respond to arrow keys in a real browser", async ({ page }) => {
    await page.goto("/");

    const coverageTab = page.getByRole("tab", { name: /coverage workflow/i });
    const workspaceTab = page.getByRole("tab", { name: /cargo workspace/i });
    await coverageTab.focus();
    await page.keyboard.press("ArrowRight");

    await expect(workspaceTab).toBeFocused();
    await expect(workspaceTab).toHaveAttribute("aria-selected", "true");
  });
});
