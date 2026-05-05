/**
 * Tests for PlaceholderRender — renders LLM output with placeholders.
 * Hallucinated placeholders (in `hallucinated[]`) get italic + grey + tooltip.
 * Restored entities (real values) render as plain text — already substituted.
 * Unknown placeholders not in the hallucinated set render plain (defensive).
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlaceholderRender } from "../../src/chat/PlaceholderRender.js";

describe("PlaceholderRender", () => {
  it("renders plain text without placeholders unchanged", () => {
    render(<PlaceholderRender text="Привет, мир" hallucinated={[]} />);
    expect(screen.getByText(/Привет, мир/)).toBeInTheDocument();
  });

  it("renders restored text (no placeholders) as plain", () => {
    render(<PlaceholderRender text="Передам Иванову о 7707083893" hallucinated={[]} />);
    expect(screen.getByText(/Иванову/)).toBeInTheDocument();
  });

  it("highlights a hallucinated placeholder with italic + grey + data attribute", () => {
    const text = "Я также упомянул <NAME_99> для контекста";
    render(<PlaceholderRender text={text} hallucinated={[{ placeholder: "<NAME_99>" }]} />);
    const node = screen.getByText("<NAME_99>");
    expect(node).toHaveClass("placeholder-hallucinated");
    expect(node).toHaveAttribute("data-hallucinated", "true");
  });

  it("does NOT highlight a placeholder absent from hallucinated[]", () => {
    render(<PlaceholderRender text="It says <NAME_1> here" hallucinated={[]} />);
    const node = screen.getByText("<NAME_1>");
    expect(node).not.toHaveClass("placeholder-hallucinated");
  });

  it("renders multiple hallucinated placeholders in mixed text", () => {
    const text = "Тест <NAME_99> и <INN_50>";
    render(<PlaceholderRender text={text} hallucinated={[
      { placeholder: "<NAME_99>" },
      { placeholder: "<INN_50>" },
    ]} />);
    const nodes = screen.getAllByText(/<(NAME_99|INN_50)>/);
    expect(nodes).toHaveLength(2);
    nodes.forEach((n) => expect(n).toHaveClass("placeholder-hallucinated"));
  });

  it("supports all placeholder types from the M1 mapping store regex", () => {
    const types = ["NAME", "EMAIL", "PHONE", "PASSPORT", "INN", "SNILS", "CARD",
                   "OGRN", "OGRNIP", "BANK_ACCOUNT", "ADDRESS", "ORG", "IP", "DOB", "URL"];
    for (const type of types) {
      const placeholder = `<${type}_42>`;
      const { unmount } = render(
        <PlaceholderRender text={`Тест ${placeholder} конец`} hallucinated={[{ placeholder }]} />,
      );
      const node = screen.getByText(placeholder);
      expect(node).toHaveAttribute("data-hallucinated", "true");
      unmount();
    }
  });

  it("preserves text before, between and after placeholders", () => {
    const text = "Начало <NAME_1> середина <INN_2> конец";
    render(<PlaceholderRender text={text} hallucinated={[
      { placeholder: "<NAME_1>" },
      { placeholder: "<INN_2>" },
    ]} />);
    // Use a custom matcher because the surrounding fragments are split across nodes.
    const container = screen.getByText("<NAME_1>").parentElement!;
    expect(container.textContent).toBe(text);
  });
});
