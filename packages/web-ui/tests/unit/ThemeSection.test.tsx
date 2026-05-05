/**
 * Tests for Settings → ThemeSection.
 *   - Reads current selection from localStorage (default 'auto')
 *   - Toggles `dark` class on document.documentElement
 *   - Persists choice in localStorage
 *   - Auto mode follows matchMedia
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeSection } from "../../src/settings/ThemeSection.js";

interface MqMock {
  matches: boolean;
  listeners: Array<() => void>;
  addEventListener: (e: string, h: () => void) => void;
  removeEventListener: (e: string, h: () => void) => void;
  dispatchEvent: (e: Event) => boolean;
  fire: () => void;
}

function setupMatchMedia(matches: boolean): MqMock {
  const mq: MqMock = {
    matches,
    listeners: [],
    addEventListener(_e: string, h: () => void) { this.listeners.push(h); },
    removeEventListener(_e: string, h: () => void) {
      this.listeners = this.listeners.filter((l) => l !== h);
    },
    dispatchEvent: () => true,
    fire() { this.listeners.forEach((l) => l()); },
  };
  (window as unknown as { matchMedia: (q: string) => MqMock }).matchMedia = (() => mq) as unknown as (
    q: string
  ) => MqMock;
  return mq;
}

describe("ThemeSection", () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    originalMatchMedia = window.matchMedia;
  });
  afterEach(() => {
    if (originalMatchMedia) {
      (window as unknown as { matchMedia: typeof window.matchMedia }).matchMedia = originalMatchMedia;
    }
  });

  it("renders three radio options", () => {
    setupMatchMedia(false);
    render(<ThemeSection />);
    expect(screen.getByTestId("theme-light")).toBeInTheDocument();
    expect(screen.getByTestId("theme-dark")).toBeInTheDocument();
    expect(screen.getByTestId("theme-auto")).toBeInTheDocument();
  });

  it("defaults to 'auto' when nothing in localStorage", () => {
    setupMatchMedia(false);
    render(<ThemeSection />);
    expect((screen.getByTestId("theme-auto") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByTestId("theme-light") as HTMLInputElement).checked).toBe(false);
  });

  it("loads stored choice from localStorage", () => {
    setupMatchMedia(false);
    localStorage.setItem("brikko-theme", "dark");
    render(<ThemeSection />);
    expect((screen.getByTestId("theme-dark") as HTMLInputElement).checked).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("applies dark class when user picks 'dark' and persists choice", () => {
    setupMatchMedia(false);
    render(<ThemeSection />);
    fireEvent.click(screen.getByTestId("theme-dark"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("brikko-theme")).toBe("dark");
  });

  it("removes dark class when user picks 'light'", () => {
    setupMatchMedia(false);
    localStorage.setItem("brikko-theme", "dark");
    render(<ThemeSection />);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    fireEvent.click(screen.getByTestId("theme-light"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("brikko-theme")).toBe("light");
  });

  it("auto mode follows system preference (matchMedia matches=true → dark)", () => {
    setupMatchMedia(true);
    render(<ThemeSection />);
    fireEvent.click(screen.getByTestId("theme-auto"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("brikko-theme")).toBe("auto");
  });
});
