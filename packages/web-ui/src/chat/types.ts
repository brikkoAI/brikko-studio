export interface ChatMessage {
  request_id: string;
  role: "user" | "assistant";
  text: string;
  hallucinated?: Array<{ placeholder: string }>;
  streaming?: boolean;
  error?: boolean;
  latency_ms?: number;
  model?: string;
}

export interface Session {
  id: string;
  title: string;
  created_at: string;
}

export interface ModelOption {
  id: string;
  label: string;
  hint?: string;
}

/**
 * MVP catalog mirrors BRIEF.md §4 — 12 models. Studio defaults to Sonnet
 * (good RU + tools), with cheap/fast and Russian-cloud alternatives.
 */
export const MODELS: ReadonlyArray<ModelOption> = [
  { id: "claude-sonnet-4.6",  label: "Claude Sonnet 4.6", hint: "универсальная" },
  { id: "claude-haiku-4.5",   label: "Claude Haiku 4.5",  hint: "быстрая" },
  { id: "gpt-5.4-mini",       label: "GPT-5.4 mini",      hint: "экономная" },
  { id: "gpt-5.4",            label: "GPT-5.4" },
  { id: "yandexgpt-5-pro",    label: "YandexGPT 5 Pro",   hint: "RU-резидент" },
  { id: "gigachat-2-pro",     label: "GigaChat 2 Pro",    hint: "RU-резидент" },
];

export const DEFAULT_MODEL_ID = "claude-sonnet-4.6";

export interface QuickExample {
  label: string;
  prompt: string;
}

/**
 * Reused from Gateway Playground — these convert the most-frequent agent
 * scenarios (lead classification, call summary, JSON extraction) into one click.
 */
export const QUICK_EXAMPLES: ReadonlyArray<QuickExample> = [
  {
    label: "Классификация лида",
    prompt:
      "Классифицируй обращение как «горячий лид», «холодный» или «спам». Текст: «Здравствуйте! Хотим обсудить внедрение AI в наш отдел продаж, бюджет 500 тыс/мес, нужно созвониться на этой неделе.» Ответь одним словом + одна строка обоснования.",
  },
  {
    label: "Резюме звонка",
    prompt:
      "Сделай краткое резюме звонка в 3 пунктах: ключевая договорённость, action items, риски. Транскрипт: «Клиент хочет внедрить чат-бота к 15 июня, бюджет до 300 тыс, согласовали ТЗ на следующей неделе, опасается за интеграцию с 1С.»",
  },
  {
    label: "Извлечь факты в JSON",
    prompt:
      "Извлеки ключевые факты в JSON {company, budget, deadline, contact}. Текст: «Звонил Иван из ООО Ромашка, бюджет до 500 тыс, нужно к 1 июля, телефон +79991234567.»",
  },
  {
    label: "Перевод RU→EN",
    prompt:
      "Переведи на английский деловым тоном: «Здравствуйте, отправляем коммерческое предложение на интеграцию AI-помощника. Готовы обсудить детали на следующей неделе.»",
  },
];
