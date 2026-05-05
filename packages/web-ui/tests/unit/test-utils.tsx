/**
 * Render helpers shared by privacy-dashboard tests:
 *   - withQueryClient — wraps in QueryClientProvider with retry off so
 *     fetch errors surface immediately (without 3 silent retries).
 */
import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function withQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchInterval: false, refetchOnWindowFocus: false, gcTime: 0, staleTime: 0 },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

/**
 * Type-safe stub of `globalThis.fetch` returning a single canned JSON response.
 * Returns the spy so tests can inspect arguments.
 */
export function stubFetchOnce(body: unknown, init?: { ok?: boolean; status?: number }): {
  fetchSpy: ReturnType<typeof vi.fn>;
  restore: () => void;
} {
  const original = globalThis.fetch;
  const ok = init?.ok ?? true;
  const status = init?.status ?? 200;
  const fetchSpy = vi.fn(async (_input: RequestInfo | URL): Promise<Response> => {
    return {
      ok,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as Response;
  });
  (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchSpy as unknown as typeof fetch;
  return {
    fetchSpy,
    restore: () => {
      (globalThis as unknown as { fetch: typeof fetch }).fetch = original;
    },
  };
}
