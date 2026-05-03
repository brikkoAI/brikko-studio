import { transcribeFirstAudio as transcribeFirstAudioImpl } from "brikko-studio/plugin-sdk/media-runtime";

type TranscribeFirstAudio = typeof import("brikko-studio/plugin-sdk/media-runtime").transcribeFirstAudio;

export async function transcribeFirstAudio(
  ...args: Parameters<TranscribeFirstAudio>
): ReturnType<TranscribeFirstAudio> {
  return await transcribeFirstAudioImpl(...args);
}
