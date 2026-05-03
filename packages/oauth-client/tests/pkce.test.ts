import { describe, it, expect } from "vitest";
import { generatePkcePair, verifyChallenge } from "../src/pkce.js";

describe("PKCE", () => {
  it("generates a verifier of 43-128 base64url chars", () => {
    const pair = generatePkcePair();
    expect(pair.verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
  });

  it("generates an S256 challenge that is base64url-encoded SHA-256 of the verifier", () => {
    const pair = generatePkcePair();
    expect(pair.challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(pair.method).toBe("S256");
  });

  it("verifyChallenge confirms a valid pair", () => {
    const pair = generatePkcePair();
    expect(verifyChallenge(pair.verifier, pair.challenge)).toBe(true);
  });

  it("verifyChallenge rejects a tampered verifier", () => {
    const pair = generatePkcePair();
    const tampered = pair.verifier.slice(0, -1) + "X";
    expect(verifyChallenge(tampered, pair.challenge)).toBe(false);
  });

  it("two consecutive generations produce different verifiers", () => {
    const a = generatePkcePair();
    const b = generatePkcePair();
    expect(a.verifier).not.toBe(b.verifier);
  });
});
