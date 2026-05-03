import { http, HttpResponse } from "msw";

export const GATEWAY_BASE = "https://api.brikko.ru";

/**
 * MSW handlers simulating Brikko Gateway's /v1/oauth/token endpoint.
 *
 * The Gateway uses FastAPI Form() parameters per RFC 6749, so the request
 * body is application/x-www-form-urlencoded — NOT JSON. We parse the raw
 * text and decode it as URLSearchParams.
 *
 * Note: the Gateway's standard token response (RFC 6749 §5.1) does not
 * include user_email. We return it here as an extension solely so existing
 * fixtures keep working; the OAuthClient must treat user_email as optional.
 */
export const handlers = [
  http.post(`${GATEWAY_BASE}/v1/oauth/token`, async ({ request }) => {
    const text = await request.text();
    const body = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>;

    if (body["grant_type"] === "authorization_code") {
      if (body["code"] === "valid_code" && body["code_verifier"]) {
        return HttpResponse.json({
          access_token: "atk_test_12345",
          refresh_token: "rtk_test_67890",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "chat.read messages.read embeddings.read audio.read",
          user_email: "test@brikko.ru",
        });
      }
      return HttpResponse.json(
        { error: "invalid_grant", error_description: "Invalid code" },
        { status: 400 }
      );
    }

    if (body["grant_type"] === "refresh_token") {
      if (body["refresh_token"] === "rtk_test_67890") {
        return HttpResponse.json({
          access_token: "atk_test_refreshed",
          refresh_token: "rtk_test_67890",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "chat.read messages.read embeddings.read audio.read",
          user_email: "test@brikko.ru",
        });
      }
      return HttpResponse.json(
        { error: "invalid_grant", error_description: "Refresh token expired" },
        { status: 401 }
      );
    }

    return HttpResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
  }),
];
