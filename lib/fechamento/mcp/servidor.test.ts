import { atenderRequisicaoMcp } from "./servidor";
import type { Ambiente, DepsFerramentas } from "./ferramentas";

jest.mock("@/lib/fechamento/acoes", () => ({
  ErroFechamento: class ErroFechamento extends Error {},
}));

const amb: Omit<Ambiente, "deps"> = { ctx: { admin: {} as Ambiente["ctx"]["admin"], userId: "u1" }, email: "admin@bs.com" };
const deps = {
  catalogoFechamento: jest.fn().mockResolvedValue({ clinicas: [{ id: "c1", nome: "Hirata", clinicorp_subscriber_id: null }] }),
} as unknown as DepsFerramentas;

function rpc(body: unknown) {
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify(body),
  });
}

describe("servidor MCP (Streamable HTTP stateless)", () => {
  it("initialize + tools/list + tools/call", async () => {
    const init = await atenderRequisicaoMcp(
      rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } }),
      amb,
      deps
    );
    expect(init.status).toBe(200);
    expect((await init.json()).result.serverInfo.name).toBe("bs-fechamento");

    const lista = await atenderRequisicaoMcp(rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }), amb, deps);
    const tools = (await lista.json()).result.tools as { name: string; inputSchema: { properties?: Record<string, unknown> } }[];
    expect(tools).toHaveLength(14);
    expect(tools.find((t) => t.name === "bs_relatorio")?.inputSchema.properties).toHaveProperty("tipo");
    expect(tools.find((t) => t.name === "bs_mapear_procedimentos")?.inputSchema.properties).toHaveProperty("linhas");

    const chamada = await atenderRequisicaoMcp(rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "bs_conexao", arguments: {} } }), amb, deps);
    const r = (await chamada.json()).result;
    expect(r.isError).toBeFalsy();
    expect(JSON.parse(r.content[0].text)).toMatchObject({ conectado: true, usuario: "admin@bs.com", clinicas: ["Hirata"] });

    const erro = await atenderRequisicaoMcp(rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "bs_status", arguments: { clinica: "Outra", mes: "2026-09" } } }), amb, deps);
    const e = (await erro.json()).result;
    expect(e.isError).toBe(true);
    expect(e.content[0].text).toMatch(/não encontrada/);
  });
});
