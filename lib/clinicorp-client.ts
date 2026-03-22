/**
 * Client HTTP para a API Clinicorp.
 * Base URL real: https://sistema.clinicorp.com/rest/v1 (não /api/)
 * Auth: HTTP Basic Auth (username:token)
 * Limite: máximo 31 dias por request
 */

import type {
  ClinicorpCredentials,
  ClinicorpEstimate,
  ClinicorpPayment,
} from "@/types/clinicorp.types";

const BASE_URL = "https://sistema.clinicorp.com/rest/v1";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function buildAuthHeader(credentials: ClinicorpCredentials): string {
  const encoded = Buffer.from(
    `${credentials.username}:${credentials.token}`
  ).toString("base64");
  return `Basic ${encoded}`;
}

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  retries = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await fetch(url, { headers });

    if (response.ok) return response;

    // API Clinicorp retorna 502 esporadicamente — retry com backoff
    if (response.status >= 500 && attempt < retries) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      continue;
    }

    const body = await response.text().catch(() => "");
    throw new Error(
      `Clinicorp API ${response.status}: ${response.statusText} — ${body}`
    );
  }

  throw new Error("Clinicorp API: max retries exceeded");
}

/**
 * Lista orçamentos de um período (máx 31 dias).
 * GET /estimates/list?subscriber_id=&from=&to=
 */
export async function listEstimates(
  credentials: ClinicorpCredentials,
  from: string,
  to: string
): Promise<ClinicorpEstimate[]> {
  const params = new URLSearchParams({
    subscriber_id: credentials.subscriberId,
    from,
    to,
  });

  const response = await fetchWithRetry(`${BASE_URL}/estimates/list?${params}`, {
    Authorization: buildAuthHeader(credentials),
  });

  const data = await response.json();
  return Array.isArray(data) ? data : data.data ?? [];
}

/**
 * Lista pagamentos de um período (máx 31 dias).
 * GET /payment/list?subscriber_id=&from=&to=&date_type=postDate&include_total_amount=X
 */
export async function listPayments(
  credentials: ClinicorpCredentials,
  from: string,
  to: string
): Promise<ClinicorpPayment[]> {
  const params = new URLSearchParams({
    subscriber_id: credentials.subscriberId,
    from,
    to,
    date_type: "postDate",
    include_total_amount: "X",
  });

  const response = await fetchWithRetry(`${BASE_URL}/payment/list?${params}`, {
    Authorization: buildAuthHeader(credentials),
  });

  const data = await response.json();
  return Array.isArray(data) ? data : data.data ?? [];
}

/**
 * Busca credenciais Clinicorp de uma clínica no Supabase.
 * Retorna null se a clínica não tiver credenciais configuradas.
 */
export async function getClinicorpCredentials(
  clinicaId: string,
  supabase: { from: (table: string) => unknown }
): Promise<ClinicorpCredentials | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("clinicas_parceiras")
    .select(
      "clinicorp_subscriber_id, clinicorp_username, clinicorp_token, clinicorp_business_id"
    )
    .eq("id", clinicaId)
    .single();

  if (error || !data) return null;

  const {
    clinicorp_subscriber_id,
    clinicorp_username,
    clinicorp_token,
    clinicorp_business_id,
  } = data;

  // Se algum campo essencial estiver vazio, retorna null
  if (!clinicorp_subscriber_id || !clinicorp_username || !clinicorp_token) {
    return null;
  }

  return {
    subscriberId: clinicorp_subscriber_id,
    username: clinicorp_username,
    token: clinicorp_token,
    businessId: clinicorp_business_id ?? "",
  };
}
