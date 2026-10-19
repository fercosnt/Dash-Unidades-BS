import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import * as acoes from "@/lib/fechamento/acoes";
import { FERRAMENTAS, type Ambiente, type DepsFerramentas } from "@/lib/fechamento/mcp/ferramentas";
import { ErroFerramenta } from "@/lib/fechamento/mcp/resolver";

const VERSAO = "0.2.0";

const INSTRUCOES =
  "Fechamento mensal das clínicas parceiras da Beauty Smile no Dash Unidades BS. " +
  "Comece por bs_status (clínica + mês YYYY-MM). Relatórios: bs_relatorio com tipo 'parceiro' (único que pode ir " +
  "para a clínica) ou 'interno' (confidencial, gestão BS). Tools que gravam recebem `confirmar`: primeiro chame com " +
  "confirmar=false, mostre a prévia à pessoa e só repita com confirmar=true depois do OK explícito. " +
  "Planilhas do Clinicorp: o Claude lê o .xlsx e envia as `linhas` (o servidor não acessa arquivos).";

const depsPadrao: DepsFerramentas = acoes;

function texto(valor: unknown) {
  return typeof valor === "string" ? valor : JSON.stringify(valor, null, 2);
}

/** Servidor MCP com as tools do fechamento, ligado ao usuário autenticado (um por requisição). */
export function criarServidorMcp(ambiente: Omit<Ambiente, "deps">, deps: DepsFerramentas = depsPadrao): McpServer {
  const server = new McpServer({ name: "bs-fechamento", version: VERSAO }, { instructions: INSTRUCOES });
  const amb: Ambiente = { ...ambiente, deps };

  for (const f of FERRAMENTAS) {
    server.registerTool(
      f.nome,
      {
        description: f.descricao,
        inputSchema: f.shape,
        annotations: { readOnlyHint: f.somenteLeitura, destructiveHint: !f.somenteLeitura, openWorldHint: false },
      },
      async (args: Record<string, unknown>) => {
        try {
          return { content: [{ type: "text" as const, text: texto(await f.executar(args, amb)) }] };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          const esperado = e instanceof acoes.ErroFechamento || e instanceof ErroFerramenta;
          if (!esperado) console.error(`[api/mcp] ${f.nome}:`, msg);
          return { isError: true, content: [{ type: "text" as const, text: `Erro: ${msg}` }] };
        }
      }
    );
  }
  return server;
}

/**
 * Atende uma requisição Streamable HTTP em modo stateless (servidor + transporte novos por
 * requisição, resposta JSON sem SSE) — adequado a funções serverless da Vercel.
 */
export async function atenderRequisicaoMcp(
  request: Request,
  ambiente: Omit<Ambiente, "deps">,
  deps: DepsFerramentas = depsPadrao
): Promise<Response> {
  const server = criarServidorMcp(ambiente, deps);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await transport.close();
    await server.close();
  }
}
