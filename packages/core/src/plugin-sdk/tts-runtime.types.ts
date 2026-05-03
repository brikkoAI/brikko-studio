import type { BrikkoStudioConfig } from "../config/types.brikko-studio.js";
import type { ResolvedTtsPersona, TtsAutoMode, TtsProvider } from "../config/types.tts.js";
import type {
  SpeechProviderConfig,
  SpeechVoiceOption,
  TtsDirectiveOverrides,
  TtsDirectiveParseResult,
} from "../tts/provider-types.js";
import type { TtsConfigResolutionContext } from "../tts/tts-config.js";
import type { ResolvedTtsConfig, ResolvedTtsModelOverrides } from "../tts/tts-types.js";
import type { ReplyPayload } from "./reply-payload.js";

export type { ResolvedTtsConfig, ResolvedTtsModelOverrides };
export type { TtsConfigResolutionContext };
export type { TtsDirectiveOverrides, TtsDirectiveParseResult };

export type TtsAttemptReasonCode =
  | "success"
  | "no_provider_registered"
  | "not_configured"
  | "unsupported_for_telephony"
  | "timeout"
  | "provider_error";

export type TtsProviderAttempt = {
  provider: string;
  outcome: "success" | "skipped" | "failed";
  reasonCode: TtsAttemptReasonCode;
  persona?: string;
  personaBinding?: "applied" | "missing" | "none";
  latencyMs?: number;
  error?: string;
};

export type TtsStatusEntry = {
  timestamp: number;
  success: boolean;
  textLength: number;
  summarized: boolean;
  provider?: string;
  persona?: string;
  fallbackFrom?: string;
  attemptedProviders?: string[];
  attempts?: TtsProviderAttempt[];
  latencyMs?: number;
  error?: string;
};

export type TtsSpeechTarget = "audio-file" | "voice-note";

export type SummarizeResult = {
  summary: string;
  latencyMs: number;
  inputLength: number;
  outputLength: number;
};

export type ResolveTtsAutoModeParams = {
  config: ResolvedTtsConfig;
  prefsPath: string;
  sessionAuto?: string;
};

export type ResolveExplicitTtsOverridesParams = {
  cfg: BrikkoStudioConfig;
  prefsPath?: string;
  provider?: string;
  modelId?: string;
  voiceId?: string;
  agentId?: string;
  channelId?: string;
  accountId?: string;
};

export type TtsRequestParams = {
  text: string;
  cfg: BrikkoStudioConfig;
  prefsPath?: string;
  channel?: string;
  overrides?: TtsDirectiveOverrides;
  disableFallback?: boolean;
  timeoutMs?: number;
  agentId?: string;
  accountId?: string;
};

export type TtsTelephonyRequestParams = {
  text: string;
  cfg: BrikkoStudioConfig;
  prefsPath?: string;
  overrides?: TtsDirectiveOverrides;
};

export type ListSpeechVoicesParams = {
  provider: string;
  cfg?: BrikkoStudioConfig;
  config?: ResolvedTtsConfig;
  apiKey?: string;
  baseUrl?: string;
};

export type MaybeApplyTtsToPayloadParams = {
  payload: ReplyPayload;
  cfg: BrikkoStudioConfig;
  channel?: string;
  kind?: "tool" | "block" | "final";
  inboundAudio?: boolean;
  ttsAuto?: string;
  agentId?: string;
  accountId?: string;
};

export type TtsTestFacade = {
  parseTtsDirectives: (...args: unknown[]) => TtsDirectiveParseResult;
  resolveModelOverridePolicy: (...args: unknown[]) => ResolvedTtsModelOverrides;
  supportsNativeVoiceNoteTts: (channel: string | undefined) => boolean;
  supportsTranscodedVoiceNoteTts: (channel: string | undefined) => boolean;
  shouldDeliverTtsAsVoice: (params: {
    channel: string | undefined;
    target: TtsSpeechTarget | undefined;
    voiceCompatible: boolean | undefined;
    fileExtension?: string;
    outputFormat?: string;
  }) => boolean;
  summarizeText: (...args: unknown[]) => Promise<SummarizeResult>;
  getResolvedSpeechProviderConfig: (
    config: ResolvedTtsConfig,
    providerId: string,
    cfg?: BrikkoStudioConfig,
  ) => SpeechProviderConfig;
  formatTtsProviderError: (provider: TtsProvider, err: unknown) => string;
  sanitizeTtsErrorForLog: (err: unknown) => string;
};

export type TtsResult = {
  success: boolean;
  audioPath?: string;
  error?: string;
  latencyMs?: number;
  provider?: string;
  persona?: string;
  fallbackFrom?: string;
  attemptedProviders?: string[];
  attempts?: TtsProviderAttempt[];
  outputFormat?: string;
  voiceCompatible?: boolean;
  audioAsVoice?: boolean;
  target?: TtsSpeechTarget;
};

export type TtsSynthesisResult = {
  success: boolean;
  audioBuffer?: Buffer;
  error?: string;
  latencyMs?: number;
  provider?: string;
  persona?: string;
  fallbackFrom?: string;
  attemptedProviders?: string[];
  attempts?: TtsProviderAttempt[];
  outputFormat?: string;
  voiceCompatible?: boolean;
  fileExtension?: string;
  target?: TtsSpeechTarget;
};

export type TtsTelephonyResult = {
  success: boolean;
  audioBuffer?: Buffer;
  error?: string;
  latencyMs?: number;
  provider?: string;
  persona?: string;
  fallbackFrom?: string;
  attemptedProviders?: string[];
  attempts?: TtsProviderAttempt[];
  outputFormat?: string;
  sampleRate?: number;
};

export type TextToSpeech = (params: TtsRequestParams) => Promise<TtsResult>;
export type TextToSpeechTelephony = (
  params: TtsTelephonyRequestParams,
) => Promise<TtsTelephonyResult>;
export type ListSpeechVoices = (params: ListSpeechVoicesParams) => Promise<SpeechVoiceOption[]>;

export type TtsRuntimeFacade = {
  _test: TtsTestFacade;
  buildTtsSystemPromptHint: (cfg: BrikkoStudioConfig, agentId?: string) => string | undefined;
  getLastTtsAttempt: () => TtsStatusEntry | undefined;
  getResolvedSpeechProviderConfig: (
    config: ResolvedTtsConfig,
    providerId: string,
    cfg?: BrikkoStudioConfig,
  ) => SpeechProviderConfig;
  getTtsMaxLength: (prefsPath: string) => number;
  getTtsPersona: (config: ResolvedTtsConfig, prefsPath: string) => ResolvedTtsPersona | undefined;
  getTtsProvider: (config: ResolvedTtsConfig, prefsPath: string) => TtsProvider;
  isSummarizationEnabled: (prefsPath: string) => boolean;
  isTtsEnabled: (config: ResolvedTtsConfig, prefsPath: string, sessionAuto?: string) => boolean;
  isTtsProviderConfigured: (
    config: ResolvedTtsConfig,
    provider: TtsProvider,
    cfg?: BrikkoStudioConfig,
  ) => boolean;
  listSpeechVoices: ListSpeechVoices;
  listTtsPersonas: (config: ResolvedTtsConfig) => ResolvedTtsPersona[];
  maybeApplyTtsToPayload: (params: MaybeApplyTtsToPayloadParams) => Promise<ReplyPayload>;
  resolveExplicitTtsOverrides: (params: ResolveExplicitTtsOverridesParams) => TtsDirectiveOverrides;
  resolveTtsAutoMode: (params: ResolveTtsAutoModeParams) => TtsAutoMode;
  resolveTtsConfig: (
    cfg: BrikkoStudioConfig,
    contextOrAgentId?: string | TtsConfigResolutionContext,
  ) => ResolvedTtsConfig;
  resolveTtsPrefsPath: (config: ResolvedTtsConfig) => string;
  resolveTtsProviderOrder: (primary: TtsProvider, cfg?: BrikkoStudioConfig) => TtsProvider[];
  setLastTtsAttempt: (entry: TtsStatusEntry | undefined) => void;
  setSummarizationEnabled: (prefsPath: string, enabled: boolean) => void;
  setTtsAutoMode: (prefsPath: string, mode: TtsAutoMode) => void;
  setTtsEnabled: (prefsPath: string, enabled: boolean) => void;
  setTtsMaxLength: (prefsPath: string, maxLength: number) => void;
  setTtsPersona: (prefsPath: string, persona: string | null | undefined) => void;
  setTtsProvider: (prefsPath: string, provider: TtsProvider) => void;
  synthesizeSpeech: (params: TtsRequestParams) => Promise<TtsSynthesisResult>;
  textToSpeech: TextToSpeech;
  textToSpeechTelephony: TextToSpeechTelephony;
};
