import { useState, type KeyboardEvent } from "react";
import { useTranslation } from "../i18n/index.js";

export interface ChatInputProps {
  onSend(text: string): void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps): JSX.Element {
  const t = useTranslation();
  const [value, setValue] = useState("");

  const send = () => {
    const v = value.trim();
    if (!v || disabled) return;
    onSend(v);
    setValue("");
  };

  const onKey = (ev: KeyboardEvent<HTMLTextAreaElement>) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      send();
    }
  };

  return (
    <div className="chat-input-bar">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKey}
        placeholder={t("chat.input.placeholder")}
        disabled={disabled}
        rows={2}
        data-testid="chat-input"
        className="chat-textarea"
      />
      <button
        onClick={send}
        disabled={disabled || !value.trim()}
        className="send-btn"
        data-testid="chat-send"
      >
        {t("chat.input.send")}
      </button>
    </div>
  );
}
