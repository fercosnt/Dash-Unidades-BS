import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: { path?: string; maxAge?: number }) {
          response.cookies.set({ name, value, path: "/", ...options });
        },
        remove(name: string, options: { path?: string }) {
          response.cookies.set({ name, value: "", path: "/", maxAge: 0 });
        },
      },
    },
  );

  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err: unknown) {
    const isRefreshError =
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "refresh_token_not_found";
    if (isRefreshError) {
      const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
      request.cookies.getAll().forEach((c) => {
        if (c.name.startsWith("sb-") && c.name.endsWith("-auth-token")) {
          redirectResponse.cookies.set({ name: c.name, value: "", path: "/", maxAge: 0 });
        }
      });
      return redirectResponse;
    }
    throw err;
  }

  const pathname = request.nextUrl.pathname;
  const isLogin = pathname === "/login";
  const isApi = pathname.startsWith("/api/");
  const isPublic = pathname === "/" || pathname.startsWith("/_next") || pathname.startsWith("/favicon");

  // Rotas /api/* não redirecionam para login; a própria API devolve 401 se necessário
  if (isApi) {
    return response;
  }

  if (user && isLogin) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role ?? "parceiro";
    const redirect =
      role === "admin"
        ? new URL("/admin/dashboard", request.url)
        : new URL("/parceiro/dashboard", request.url);
    return NextResponse.redirect(redirect);
  }

  if (!user && !isLogin && !isPublic) {
    const redirect = new URL("/login", request.url);
    return NextResponse.redirect(redirect);
  }

  if (user && pathname === "/") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = profile?.role ?? "parceiro";
    const redirect =
      role === "admin"
        ? new URL("/admin/dashboard", request.url)
        : new URL("/parceiro/dashboard", request.url);
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
