/**
 * Render LLM output that may contain placeholder tokens (`<NAME_42>`, `<INN_7>`).
 *
 * Behavior per spec §1.10:
 *   - text without placeholders → plain text
 *   - placeholder in `hallucinated[]`     → italic + grey + tooltip "AI-сгенерировано"
 *   - placeholder NOT in `hallucinated[]` → plain text (defensive: should not happen
 *     after restore step, but we never want to silently hide leakage)
 *
 * The regex must stay in sync with M1 mapping store category list. If a new
 * category is added there, append it here.
 */
import { Fragment } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useTranslation } from "../i18n/index.js";

const PLACEHOLDER_RE =
  /<(NAME|EMAIL|PHONE|PASSPORT|INN|SNILS|CARD|OGRN|OGRNIP|BANK_ACCOUNT|ADDRESS|ORG|IP|DOB|URL)_\d+>/g;

export interface PlaceholderRenderProps {
  text: string;
  hallucinated: Array<{ placeholder: string }>;
}

interface Part {
  kind: "text" | "placeholder";
  value: string;
  isHallu: boolean;
}

function tokenize(text: string, halluSet: Set<string>): Part[] {
  const parts: Part[] = [];
  let lastIdx = 0;
  // matchAll with /g flag — TS happy under ES2022 lib.
  for (const match of text.matchAll(PLACEHOLDER_RE)) {
    const idx = match.index ?? 0;
    if (idx > lastIdx) {
      parts.push({ kind: "text", value: text.slice(lastIdx, idx), isHallu: false });
    }
    parts.push({
      kind: "placeholder",
      value: match[0],
      isHallu: halluSet.has(match[0]),
    });
    lastIdx = idx + match[0].length;
  }
  if (lastIdx < text.length) {
    parts.push({ kind: "text", value: text.slice(lastIdx), isHallu: false });
  }
  return parts;
}

export function PlaceholderRender({ text, hallucinated }: PlaceholderRenderProps): JSX.Element {
  const t = useTranslation();
  const halluSet = new Set(hallucinated.map((h) => h.placeholder));
  const parts = tokenize(text, halluSet);

  return (
    <Tooltip.Provider delayDuration={250}>
      <span>
        {parts.map((p, i) => {
          if (p.kind === "text") {
            return <Fragment key={i}>{p.value}</Fragment>;
          }
          if (p.isHallu) {
            return (
              <Tooltip.Root key={i}>
                <Tooltip.Trigger asChild>
                  <span
                    className="placeholder-hallucinated"
                    data-hallucinated="true"
                  >
                    {p.value}
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content sideOffset={4} data-radix-tooltip-content="">
                    {t("chat.message.hallucinated.tooltip")}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            );
          }
          // Unflagged placeholder — defensive plain render. (Should never happen post-restore.)
          return <span key={i}>{p.value}</span>;
        })}
      </span>
    </Tooltip.Provider>
  );
}
