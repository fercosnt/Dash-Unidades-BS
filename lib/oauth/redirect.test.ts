import { caminhoInternoSeguro, redirectPermitido } from "./redirect";

describe("redirectPermitido", () => {
  it.each([
    "https://claude.ai/api/mcp/auth_callback",
    "https://claude.com/api/mcp/auth_callback",
    "https://www.claude.ai/callback",
    "http://localhost:33418/callback",
    "http://127.0.0.1:6274/oauth/callback",
    "https://localhost/callback",
  ])("aceita %s", (uri) => {
    expect(redirectPermitido(uri)).toBe(true);
  });

  it.each([
    "https://evil.com/callback",
    "https://claude.ai.evil.com/callback",
    "https://evilclaude.ai/callback",
    "https://claude.ai@evil.com/callback",
    "https://user:pass@claude.ai/callback",
    "http://claude.ai/callback", // claude exige https
    "javascript:alert(1)",
    "claude.ai/callback",
    "ftp://localhost/x",
    "",
    null,
    undefined,
  ])("recusa %s", (uri) => {
    expect(redirectPermitido(uri as string | null | undefined)).toBe(false);
  });
});

describe("caminhoInternoSeguro", () => {
  it("mantém caminho interno com query", () => {
    expect(caminhoInternoSeguro("/oauth/consent?authorization_id=abc")).toBe("/oauth/consent?authorization_id=abc");
  });

  it.each(["https://evil.com", "//evil.com/x", "/\\evil.com", "oauth/consent", "", null, undefined])("recusa %s", (next) => {
    expect(caminhoInternoSeguro(next as string | null | undefined)).toBe("/");
  });
});
