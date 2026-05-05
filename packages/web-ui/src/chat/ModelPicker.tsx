import { MODELS } from "./types.js";
import { useTranslation } from "../i18n/index.js";

export interface ModelPickerProps {
  value: string;
  onChange(modelId: string): void;
  disabled?: boolean;
}

export function ModelPicker({ value, onChange, disabled = false }: ModelPickerProps): JSX.Element {
  const t = useTranslation();
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
      <span className="muted">{t("chat.model.label")}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="model-picker"
        data-testid="model-picker"
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}{m.hint ? ` — ${m.hint}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
