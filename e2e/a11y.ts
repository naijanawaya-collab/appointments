import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/**
 * Accessibility gate: WCAG 2.1 A/AA rules must report 0 violations.
 * Third-party map iframes are excluded (their content isn't ours).
 */
export async function expectNoA11yViolations(page: Page, label = "") {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("iframe")
    .analyze();
  const summary = results.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(" ")}`);
  expect(summary, `axe violations ${label}`).toEqual([]);
}

/** No horizontal page scroll (T-7). */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}
