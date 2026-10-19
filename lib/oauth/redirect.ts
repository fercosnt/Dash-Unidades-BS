/**
 * Travas de redirecionamento do fluxo OAuth do conector MCP (consentimento em /oauth/consent)
 * e do retorno pós-login.
 */

/** Hosts do Claude aceitos como redirect_uri de cliente OAuth (exato ou subdomínio, só https). */
const HOSTS_CLAUDE = ["claude.ai", "claude.com"];
/** Loopback do Claude Code / Claude Desktop (qualquer porta, http ou https). */
const HOSTS_LOOPBACK = ["localhost", "127.0.0.1"];

/**
 * Allowlist do redirect_uri do cliente OAuth: só o Claude (claude.ai / claude.com) e
 * loopback local. Qualquer outro destino é recusado na tela de consentimento.
 */
export function redirectPermitido(uri: string | null | undefined): boolean {
  if (!uri) return false;
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase();

  if (HOSTS_LOOPBACK.includes(host)) return url.protocol === "http:" || url.protocol === "https:";
  if (url.protocol !== "https:") return false;
  return HOSTS_CLAUDE.some((h) => host === h || host.endsWith(`.${h}`));
}

/**
 * Valida o parâmetro `next` do login: só caminho interno ("/algo"), nunca URL absoluta,
 * protocolo-relativa ("//host") ou com barra invertida. Inválido → "/".
 */
export function caminhoInternoSeguro(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  try {
    const url = new URL(next, "http://interno.local");
    if (url.origin !== "http://interno.local") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
