import { describe, it, expect } from "vitest";
import { t, setLocale } from "../index.js";

describe("i18n catalog", () => {
  it("returns Russian welcome string by default", () => {
    setLocale("ru");
    expect(t("auth.welcome.title")).toBe("Добро пожаловать в BrikkoStudio");
  });

  it("returns Russian login button label", () => {
    setLocale("ru");
    expect(t("auth.welcome.login_button")).toBe("Войти через Brikko");
  });

  it("returns English fallback when locale is en", () => {
    setLocale("en");
    expect(t("auth.welcome.login_button")).toBe("Log in with Brikko");
  });

  it("returns the key itself when missing", () => {
    setLocale("ru");
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });

  it("interpolates placeholders", () => {
    setLocale("ru");
    expect(t("auth.status.logged_in_as", { email: "user@brikko.ru" })).toBe(
      "Вы вошли как user@brikko.ru"
    );
  });
});
