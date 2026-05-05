/**
 * Tests for Onboarding Step 5 — synthetic anonymize/restore round-trip demo.
 *
 * The demo is intentionally pure-client (no fetch) so the wizard works even
 * when server-side onboarding endpoints are dead. We verify:
 *   - Default prompt has detectable PII (PERSON + INN).
 *   - After Demo: outbound contains placeholders, NOT the raw values.
 *   - After Demo: inbound has the raw values restored.
 *   - Next button is disabled until Demo runs.
 *   - The pure runDemo() function handles edge cases.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Step5MagicMoment,
  runDemo,
} from "../../src/onboarding/Step5MagicMoment.js";

describe("runDemo", () => {
  it("masks PERSON and INN in the default prompt", () => {
    const out = runDemo("Передай Иванову, что у него ИНН 7707083893");
    expect(out.outbound).not.toContain("Иванову");
    expect(out.outbound).not.toContain("7707083893");
    expect(out.outbound).toMatch(/<PERSON_1>/);
    expect(out.outbound).toMatch(/<INN_1>/);
    expect(out.inbound).toContain("Иванову");
    expect(out.inbound).toContain("7707083893");
    expect(out.mappings).toHaveLength(2);
  });

  it("returns input unchanged when no PII detected", () => {
    const out = runDemo("Привет, как дела?");
    expect(out.outbound).toBe("Привет, как дела?");
    expect(out.mappings).toHaveLength(0);
    expect(out.inbound).toBe("Хорошо, понял.");
  });

  it("masks Russian phone numbers", () => {
    const out = runDemo("Позвони +7 495 123 45 67");
    expect(out.outbound).toMatch(/<PHONE_1>/);
    expect(out.outbound).not.toContain("+7 495 123 45 67");
    expect(out.inbound).toContain("+7 495 123 45 67");
  });
});

describe("Step5MagicMoment", () => {
  it("Next is disabled until Demo runs", async () => {
    const user = userEvent.setup();
    render(<Step5MagicMoment onNext={() => {}} onBack={() => {}} />);

    expect(screen.getByTestId("step-5-next")).toBeDisabled();
    await user.click(screen.getByTestId("step-5-run"));
    expect(screen.getByTestId("step-5-next")).toBeEnabled();
  });

  it("renders outbound (masked) and inbound (restored) after Demo click", async () => {
    const user = userEvent.setup();
    render(<Step5MagicMoment onNext={() => {}} onBack={() => {}} />);

    await user.click(screen.getByTestId("step-5-run"));

    const outbound = screen.getByTestId("step-5-outbound");
    const inbound = screen.getByTestId("step-5-inbound");

    expect(outbound.textContent).toMatch(/<PERSON_1>/);
    expect(outbound.textContent).toMatch(/<INN_1>/);
    expect(outbound.textContent).not.toMatch(/Иванову/);

    expect(inbound.textContent).toMatch(/Иванову/);
    expect(inbound.textContent).toMatch(/7707083893/);
  });

  it("calls onNext when user proceeds after demo", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<Step5MagicMoment onNext={onNext} onBack={() => {}} />);
    await user.click(screen.getByTestId("step-5-run"));
    await user.click(screen.getByTestId("step-5-next"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
