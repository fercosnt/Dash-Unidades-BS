import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { syncClinicaMonth } from "@/lib/clinicorp-sync";

const syncSchema = z.object({
  clinica_id: z.string().uuid(),
  mes_referencia: z.string().regex(/^\d{4}-\d{2}-01$/, "Formato: YYYY-MM-01"),
  dry_run: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      );
    }

    const { clinica_id, mes_referencia, dry_run } = parsed.data;

    const response = await syncClinicaMonth(clinica_id, mes_referencia, {
      dryRun: dry_run,
      trigger: "manual",
      userId: user.id,
    });

    if (response.skipped) {
      return NextResponse.json(
        { error: response.skipReason },
        { status: 400 }
      );
    }

    if (response.dryRun) {
      return NextResponse.json({ dry_run: true, preview: response.preview });
    }

    return NextResponse.json({ dry_run: false, result: response.result }, { status: 201 });
  } catch (err) {
    console.error("[clinicorp/sync] Erro interno:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
