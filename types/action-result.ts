/**
 * Tipo de retorno padrão das Server Actions de mutação.
 *
 * Convenção do projeto: toda Server Action que faz write retorna `ActionResult`
 * (sem payload) ou `ActionResult<T>` (com payload em `data`). O cliente checa
 * `res.ok` e lê `res.error` (em falha) ou `res.data` (em sucesso).
 *
 *   export async function criar(...): Promise<ActionResult> {
 *     if (!parsed.success) return fail("Dados inválidos.");
 *     ...
 *     return ok();
 *   }
 *
 *   export async function contar(...): Promise<ActionResult<{ count: number }>> {
 *     return ok({ count });
 *   }
 *
 * Migração incremental: actions antigas com shape ad-hoc ({ ok, count, ... })
 * continuam funcionando; adote ActionResult ao tocar nelas.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/** Sucesso, com payload opcional. */
export function ok<T = undefined>(data?: T): ActionResult<T> {
  return { ok: true, data };
}

/** Falha, com mensagem de erro. */
export function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}
