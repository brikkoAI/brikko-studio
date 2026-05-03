import { describe, expect, it } from "vitest";
import type { BrikkoStudioConfig } from "../config/config.js";
import { withTempHome, writeStateDirDotEnv } from "../config/test-helpers.js";
import { withEnvAsync } from "../test-utils/env.js";
import {
  resolveGatewayAuthTokenForService,
  shouldRequireGatewayTokenForInstall,
} from "./doctor-gateway-auth-token.js";

const envVar = (...parts: string[]) => parts.join("_");

describe("resolveGatewayAuthTokenForService", () => {
  it("returns plaintext gateway.auth.token when configured", async () => {
    const resolved = await resolveGatewayAuthTokenForService(
      {
        gateway: {
          auth: {
            token: "config-token",
          },
        },
      } as BrikkoStudioConfig,
      {} as NodeJS.ProcessEnv,
    );

    expect(resolved).toEqual({ token: "config-token" });
  });

  it("resolves SecretRef-backed gateway.auth.token", async () => {
    const resolved = await resolveGatewayAuthTokenForService(
      {
        gateway: {
          auth: {
            token: {
              source: "env",
              provider: "default",
              id: "CUSTOM_GATEWAY_TOKEN",
            },
          },
        },
        secrets: {
          providers: {
            default: { source: "env" },
          },
        },
      } as BrikkoStudioConfig,
      {
        CUSTOM_GATEWAY_TOKEN: "resolved-token",
      } as NodeJS.ProcessEnv,
    );

    expect(resolved).toEqual({ token: "resolved-token" });
  });

  it("resolves env-template gateway.auth.token via SecretRef resolution", async () => {
    const resolved = await resolveGatewayAuthTokenForService(
      {
        gateway: {
          auth: {
            token: "${CUSTOM_GATEWAY_TOKEN}",
          },
        },
        secrets: {
          providers: {
            default: { source: "env" },
          },
        },
      } as BrikkoStudioConfig,
      {
        CUSTOM_GATEWAY_TOKEN: "resolved-token",
      } as NodeJS.ProcessEnv,
    );

    expect(resolved).toEqual({ token: "resolved-token" });
  });

  it("falls back to BRIKKO_STUDIO_GATEWAY_TOKEN when SecretRef is unresolved", async () => {
    const resolved = await resolveGatewayAuthTokenForService(
      {
        gateway: {
          auth: {
            token: {
              source: "env",
              provider: "default",
              id: "MISSING_GATEWAY_TOKEN",
            },
          },
        },
        secrets: {
          providers: {
            default: { source: "env" },
          },
        },
      } as BrikkoStudioConfig,
      {
        BRIKKO_STUDIO_GATEWAY_TOKEN: "env-fallback-token",
      } as NodeJS.ProcessEnv,
    );

    expect(resolved).toEqual({ token: "env-fallback-token" });
  });

  it("falls back to BRIKKO_STUDIO_GATEWAY_TOKEN when SecretRef resolves to empty", async () => {
    const resolved = await resolveGatewayAuthTokenForService(
      {
        gateway: {
          auth: {
            token: {
              source: "env",
              provider: "default",
              id: "CUSTOM_GATEWAY_TOKEN",
            },
          },
        },
        secrets: {
          providers: {
            default: { source: "env" },
          },
        },
      } as BrikkoStudioConfig,
      {
        CUSTOM_GATEWAY_TOKEN: "   ",
        BRIKKO_STUDIO_GATEWAY_TOKEN: "env-fallback-token",
      } as NodeJS.ProcessEnv,
    );

    expect(resolved).toEqual({ token: "env-fallback-token" });
  });

  it("returns unavailableReason when SecretRef is unresolved without env fallback", async () => {
    const resolved = await resolveGatewayAuthTokenForService(
      {
        gateway: {
          auth: {
            token: {
              source: "env",
              provider: "default",
              id: "MISSING_GATEWAY_TOKEN",
            },
          },
        },
        secrets: {
          providers: {
            default: { source: "env" },
          },
        },
      } as BrikkoStudioConfig,
      {} as NodeJS.ProcessEnv,
    );

    expect(resolved.token).toBeUndefined();
    expect(resolved.unavailableReason).toContain("gateway.auth.token SecretRef is configured");
  });
});

describe("shouldRequireGatewayTokenForInstall", () => {
  it("requires token when auth mode is token", () => {
    const required = shouldRequireGatewayTokenForInstall(
      {
        gateway: {
          auth: {
            mode: "token",
          },
        },
      } as BrikkoStudioConfig,
      {} as NodeJS.ProcessEnv,
    );
    expect(required).toBe(true);
  });

  it("does not require token when auth mode is password", () => {
    const required = shouldRequireGatewayTokenForInstall(
      {
        gateway: {
          auth: {
            mode: "password",
          },
        },
      } as BrikkoStudioConfig,
      {} as NodeJS.ProcessEnv,
    );
    expect(required).toBe(false);
  });

  it("requires token in inferred mode when password env exists only in shell", async () => {
    await withEnvAsync(
      { [envVar("BRIKKO_STUDIO", "GATEWAY", "PASSWORD")]: "password-from-env" },
      async () => {
        // pragma: allowlist secret
        const required = shouldRequireGatewayTokenForInstall(
          {
            gateway: {
              auth: {},
            },
          } as BrikkoStudioConfig,
          process.env,
        );
        expect(required).toBe(true);
      },
    );
  });

  it("does not require token in inferred mode when password is configured", () => {
    const required = shouldRequireGatewayTokenForInstall(
      {
        gateway: {
          auth: {
            password: {
              source: "env",
              provider: "default",
              id: "CUSTOM_GATEWAY_PASSWORD",
            },
          },
        },
        secrets: {
          providers: {
            default: { source: "env" },
          },
        },
      } as BrikkoStudioConfig,
      {} as NodeJS.ProcessEnv,
    );
    expect(required).toBe(false);
  });

  it("does not require token in inferred mode when password env is configured in config", () => {
    const required = shouldRequireGatewayTokenForInstall(
      {
        gateway: {
          auth: {},
        },
        env: {
          vars: {
            BRIKKO_STUDIO_GATEWAY_PASSWORD: "configured-password", // pragma: allowlist secret
          },
        },
      } as BrikkoStudioConfig,
      {} as NodeJS.ProcessEnv,
    );
    expect(required).toBe(false);
  });

  it("does not require token in inferred mode when password env exists in state-dir .env", async () => {
    await withTempHome(async (_home) => {
      await writeStateDirDotEnv("BRIKKO_STUDIO_GATEWAY_PASSWORD=dotenv-password\n", {
        env: process.env,
      });

      const required = shouldRequireGatewayTokenForInstall(
        {
          gateway: {
            auth: {},
          },
        } as BrikkoStudioConfig,
        process.env,
      );
      expect(required).toBe(false);
    });
  });

  it("requires token in inferred mode when no password candidate exists", () => {
    const required = shouldRequireGatewayTokenForInstall(
      {
        gateway: {
          auth: {},
        },
      } as BrikkoStudioConfig,
      {} as NodeJS.ProcessEnv,
    );
    expect(required).toBe(true);
  });
});
