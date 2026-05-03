import {
  expectBrikkoStudioLiveTranscriptMarker,
  normalizeTranscriptForMatch,
  BRIKKO_STUDIO_LIVE_TRANSCRIPT_MARKER_RE,
} from "brikko-studio/plugin-sdk/provider-test-contracts";
import { describe, expect, it } from "vitest";

describe("normalizeTranscriptForMatch", () => {
  it("normalizes punctuation and common BrikkoStudio live transcription variants", () => {
    expect(normalizeTranscriptForMatch("Open-Claw integration OK")).toBe("brikko-studiointegrationok");
    expect(normalizeTranscriptForMatch("Testing OpenFlaw realtime transcription")).toMatch(
      /open(?:claw|flaw)/,
    );
    expect(normalizeTranscriptForMatch("OpenCore xAI realtime transcription")).toMatch(
      BRIKKO_STUDIO_LIVE_TRANSCRIPT_MARKER_RE,
    );
    expect(normalizeTranscriptForMatch("OpenCL xAI realtime transcription")).toMatch(
      BRIKKO_STUDIO_LIVE_TRANSCRIPT_MARKER_RE,
    );
    expectBrikkoStudioLiveTranscriptMarker("OpenClar integration OK");
  });
});
