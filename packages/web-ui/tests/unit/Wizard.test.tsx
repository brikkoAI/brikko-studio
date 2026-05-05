/**
 * Tests for the Onboarding Wizard shell — step routing via `?step=N`.
 *
 * Note: jsdom default URL is `about:blank` — we set window.location.search via
 * `history.pushState` before render to simulate deep-linking.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Wizard } from "../../src/onboarding/Wizard.js";

describe("Wizard", () => {
  let originalSearch = "";

  beforeEach(() => {
    originalSearch = window.location.search;
  });

  afterEach(() => {
    window.history.replaceState({}, "", `${window.location.pathname}${originalSearch}`);
  });

  it("renders Step 1 by default", () => {
    window.history.replaceState({}, "", "/onboarding");
    render(<Wizard />);
    expect(screen.getByTestId("step-1")).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-stepper")).toBeInTheDocument();
  });

  it("honours ?step=2 on first render", () => {
    window.history.replaceState({}, "", "/onboarding?step=2");
    render(<Wizard />);
    expect(screen.getByTestId("step-2")).toBeInTheDocument();
  });

  it("clamps invalid ?step values to 1", () => {
    window.history.replaceState({}, "", "/onboarding?step=99");
    render(<Wizard />);
    expect(screen.getByTestId("step-1")).toBeInTheDocument();
  });

  it("renders 6 stepper segments and marks the current as active", () => {
    window.history.replaceState({}, "", "/onboarding?step=3");
    render(<Wizard />);
    const segments = [1, 2, 3, 4, 5, 6].map((i) =>
      screen.getByTestId(`onboarding-stepper-${i}`),
    );
    expect(segments[0]).toHaveClass("active");
    expect(segments[1]).toHaveClass("active");
    expect(segments[2]).toHaveClass("active");
    expect(segments[3]).not.toHaveClass("active");
  });
});
