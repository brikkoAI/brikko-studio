/**
 * Tests for StatsPanel — verify loading state, error state, and tile rendering.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { StatsPanel } from "../../src/privacy/StatsPanel.js";
import { withQueryClient, stubFetchOnce } from "./test-utils.js";

const goodStats = {
  workspace_id: "ws_1",
  categories: { PERSON: 12, INN: 5, EMAIL: 3 },
  total_mappings: 20,
  audit_events_last_24h: 42,
  degraded_mode: false,
};

describe("StatsPanel", () => {
  let restoreFetch: () => void = () => {};

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    restoreFetch();
    vi.useRealTimers();
  });

  it("shows loading state initially", () => {
    const { restore } = stubFetchOnce(goodStats);
    restoreFetch = restore;
    withQueryClient(<StatsPanel />);
    expect(screen.getByTestId("stats-loading")).toBeInTheDocument();
  });

  it("renders tiles when stats load", async () => {
    const { restore } = stubFetchOnce(goodStats);
    restoreFetch = restore;
    vi.useRealTimers();
    withQueryClient(<StatsPanel />);
    await waitFor(() => expect(screen.getByTestId("stats-panel")).toBeInTheDocument());
    const tiles = screen.getAllByTestId("stats-tile");
    expect(tiles).toHaveLength(3);
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("OFF")).toBeInTheDocument();
  });

  it("highlights warn class when degraded_mode is true", async () => {
    const { restore } = stubFetchOnce({ ...goodStats, degraded_mode: true });
    restoreFetch = restore;
    vi.useRealTimers();
    withQueryClient(<StatsPanel />);
    await waitFor(() => expect(screen.getByText("ON")).toBeInTheDocument());
    const tiles = screen.getAllByTestId("stats-tile");
    const warnTile = tiles.find((t) => t.classList.contains("warn"));
    expect(warnTile).toBeDefined();
  });

  it("renders categories sorted descending by count", async () => {
    const { restore } = stubFetchOnce(goodStats);
    restoreFetch = restore;
    vi.useRealTimers();
    withQueryClient(<StatsPanel />);
    await waitFor(() => expect(screen.getByTestId("stats-categories")).toBeInTheDocument());
    const items = screen.getByTestId("stats-categories").querySelectorAll("li");
    expect(items).toHaveLength(3);
    expect(items[0]!.textContent).toContain("PERSON");
    expect(items[1]!.textContent).toContain("INN");
    expect(items[2]!.textContent).toContain("EMAIL");
  });

  it("shows error state on fetch failure", async () => {
    const { restore } = stubFetchOnce({ error: "boom" }, { ok: false, status: 500 });
    restoreFetch = restore;
    vi.useRealTimers();
    withQueryClient(<StatsPanel />);
    await waitFor(() => expect(screen.getByTestId("stats-error")).toBeInTheDocument());
  });
});
