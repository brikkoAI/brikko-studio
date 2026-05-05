/**
 * Onboarding Step 5 — "magic moment" demo.
 *
 * Why purely client-side: at this point in the wizard, neither the workspace
 * key nor the LLM provider may be wired through end-to-end (server-side
 * onboarding endpoints are still pending — see docs/M2_FOLLOWUPS.md). To
 * still deliver the "aha" moment of seeing PII get masked + restored, we
 * simulate the full round-trip locally:
 *
 *     user input  →  regex-based detector  →  outbound (masked, "what LLM sees")
 *                 →  fake LLM echo (rephrases the same intent using placeholders)
 *                 →  restorer (replace placeholders back)  →  inbound (what user sees)
 *
 * The detection regexes are deliberately simple — they cover the canonical
 * РФ identifiers used by the spec example (ИНН, телефон, имя «Иванов» и т.п.).
 * Production anonymization runs server-side via the M1 anonymizer; this is
 * a teaching artefact, not a security boundary.
 */
import { useState } from "react";
import { useTranslation } from "../i18n/index.js";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

interface Detected {
  category: "INN" | "PHONE" | "PERSON";
  value: string;
  start: number;
  end: number;
}

interface Mapping {
  placeholder: string;
  category: Detected["category"];
  value: string;
}

const DEMO_DEFAULT = "Передай Иванову, что у него ИНН 7707083893";

// Simple РФ identifiers — illustrative only. JS regex `\b` does not understand
// Cyrillic, so we use explicit Unicode lookbehind/lookahead boundaries.
const NOT_WORD = "(?<![А-Яа-яЁёA-Za-z0-9])";
const NOT_WORD_AFTER = "(?![А-Яа-яЁёA-Za-z0-9])";
const INN_RE = new RegExp(`${NOT_WORD}\\d{10}(?:\\d{2})?${NOT_WORD_AFTER}`, "g");
const PHONE_RE = new RegExp(
  `${NOT_WORD}\\+?7[\\s-]?\\(?\\d{3}\\)?[\\s-]?\\d{3}[\\s-]?\\d{2}[\\s-]?\\d{2}${NOT_WORD_AFTER}`,
  "g",
);
// Russian surname pattern — capitalized, ends in -ов/-ев/-ин/-ский with optional
// case suffix. Narrow on purpose so the imperative "Передай" never gets flagged.
const PERSON_RE = new RegExp(
  `${NOT_WORD}[А-ЯЁ][а-яё]+(?:ов|ев|ёв|ин|ын|ский|цкий)(?:[ауыеомй]|ой|ыми)?${NOT_WORD_AFTER}`,
  "g",
);

interface DemoOutput {
  outbound: string;
  inbound: string;
  mappings: Mapping[];
}

export function runDemo(input: string): DemoOutput {
  const found: Detected[] = [];
  const passes: Array<{ re: RegExp; category: Detected["category"] }> = [
    { re: PERSON_RE, category: "PERSON" },
    { re: INN_RE, category: "INN" },
    { re: PHONE_RE, category: "PHONE" },
  ];
  for (const pass of passes) {
    const r = new RegExp(pass.re.source, pass.re.flags);
    let m: RegExpExecArray | null;
    while ((m = r.exec(input)) !== null) {
      found.push({
        category: pass.category,
        value: m[0],
        start: m.index,
        end: m.index + m[0].length,
      });
    }
  }
  // Sort by start position; deduplicate overlapping spans (longest wins).
  found.sort((a, b) => a.start - b.start || b.end - a.end - (a.end - a.start));
  const cleaned: Detected[] = [];
  for (const d of found) {
    if (cleaned.some((c) => d.start < c.end && d.end > c.start)) continue;
    cleaned.push(d);
  }
  cleaned.sort((a, b) => a.start - b.start);

  // Assign placeholders per category.
  const counters: Record<Detected["category"], number> = {
    INN: 0,
    PHONE: 0,
    PERSON: 0,
  };
  const mappings: Mapping[] = [];
  for (const d of cleaned) {
    counters[d.category] += 1;
    const placeholder = `<${d.category}_${counters[d.category]}>`;
    mappings.push({ placeholder, category: d.category, value: d.value });
  }

  // Build the outbound (masked) string.
  let outbound = "";
  let cursor = 0;
  for (let i = 0; i < cleaned.length; i++) {
    const d = cleaned[i]!;
    outbound += input.slice(cursor, d.start);
    outbound += mappings[i]!.placeholder;
    cursor = d.end;
  }
  outbound += input.slice(cursor);

  // Synthetic LLM echo: a Russian acknowledgement mentioning the placeholders.
  const placeholderList = mappings.map((m) => m.placeholder).join(", ");
  let echoed: string;
  if (mappings.length === 0) {
    echoed = "Хорошо, понял.";
  } else {
    echoed = `Хорошо, передам ${placeholderList ? placeholderList : ""}.`;
  }

  // Restore: replace each placeholder with original value.
  let inbound = echoed;
  for (const m of mappings) {
    inbound = inbound.split(m.placeholder).join(m.value);
  }

  return { outbound, inbound, mappings };
}

export function Step5MagicMoment({ onNext, onBack }: Props): JSX.Element {
  const t = useTranslation();
  const [input, setInput] = useState(DEMO_DEFAULT);
  const [result, setResult] = useState<DemoOutput | null>(null);

  const handleRunDemo = () => {
    setResult(runDemo(input));
  };

  return (
    <div data-testid="step-5" className="onboarding-step">
      <h2 className="onboarding-step-title">{t("onboarding.step5.title")}</h2>
      <p className="onboarding-step-body">{t("onboarding.step5.body")}</p>

      <textarea
        data-testid="step-5-input"
        className="onboarding-demo-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={3}
        spellCheck={false}
      />

      <div className="onboarding-actions onboarding-actions-stack">
        <button
          type="button"
          className="primary"
          data-testid="step-5-run"
          onClick={handleRunDemo}
        >
          Demo
        </button>
      </div>

      {result !== null ? (
        <>
          <div
            className="onboarding-demo-box outbound"
            data-testid="step-5-outbound"
          >
            <div className="onboarding-demo-box-label">
              {t("onboarding.step5.outbound")}
            </div>
            <div className="onboarding-demo-box-content">{result.outbound}</div>
          </div>
          <div
            className="onboarding-demo-box inbound"
            data-testid="step-5-inbound"
          >
            <div className="onboarding-demo-box-label">
              {t("onboarding.step5.inbound")}
            </div>
            <div className="onboarding-demo-box-content">{result.inbound}</div>
          </div>
        </>
      ) : null}

      <div className="onboarding-actions">
        <button type="button" className="secondary" onClick={onBack}>
          {t("common.back")}
        </button>
        <button
          type="button"
          className="primary onboarding-cta"
          data-testid="step-5-next"
          onClick={onNext}
          disabled={result === null}
        >
          {t("onboarding.step5.next")}
        </button>
      </div>
    </div>
  );
}
