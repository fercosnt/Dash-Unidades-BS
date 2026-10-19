import { z } from "zod";

/**
 * Schemas de input das ações do fechamento (`lib/fechamento/acoes.ts`).
 * Arquivo sem dependências de servidor: usado pela rota REST, pelo MCP e pelos testes.
 */

const mes = z.string().regex(/^\d{4}-\d{2}$/, "mes deve ser YYYY-MM");
export const schemaClinicaMes = z.object({ clinica_id: z.string().uuid(), mes });

export const schemaLinhaPlanilha = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paciente: z.string().min(1),
  procedimento: z.string().min(1),
  valor: z.number().optional(),
  profissional: z.string().optional(),
});

export const schemasAcao = {
  sync: schemaClinicaMes,
  "mapear-procedimentos": schemaClinicaMes.extend({
    linhas: z.array(schemaLinhaPlanilha).min(1),
  }),
  procedimentos: schemaClinicaMes.extend({
    linhas: z.array(
      z.object({
        data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        paciente: z.string().min(1),
        procedimento_id: z.string().uuid(),
        texto_original: z.string(),
        profissional: z.string().optional(),
        valor: z.number().optional(),
      })
    ),
  }),
  regras: z.object({
    padrao: z.string().min(2),
    procedimento_id: z.string().uuid().nullable(),
    ignorar: z.boolean().default(false),
    prioridade: z.number().int().default(100),
    clinica_id: z.string().uuid().nullable().default(null),
    observacao: z.string().optional(),
  }),
  indicacao: z.object({
    orcamento_id: z.string().uuid(),
    medico_indicador_id: z.string().uuid().nullable(),
  }),
  despesas: schemaClinicaMes.extend({
    categoria: z.string().min(1), // nome da categoria (ex.: "Salário Dentista")
    descricao: z.string().optional(),
    valor: z.number().positive(),
    recorrente: z.boolean().default(false),
  }),
  "comissao-dentista": schemaClinicaMes,
  recalcular: schemaClinicaMes,
  fechar: schemaClinicaMes.extend({
    decisoes: z.array(z.object({ passo: z.string().optional(), texto: z.string() })).default([]),
    divergencias: z
      .array(z.object({ passo: z.string().optional(), fonte: z.string().optional(), descricao: z.string(), valor: z.number().optional() }))
      .default([]),
  }),
  reabrir: schemaClinicaMes.extend({ motivo: z.string().min(3) }),
} as const;

export type AcaoPost = keyof typeof schemasAcao;
export type InputAcao<A extends AcaoPost> = z.infer<(typeof schemasAcao)[A]>;
export type ClinicaMes = z.infer<typeof schemaClinicaMes>;
