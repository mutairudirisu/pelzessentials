import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedPath = request.nextUrl.searchParams.get("next") ?? "/";
  const nextPath =
    requestedPath.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/";
  if (!code) return NextResponse.redirect(new URL("/?auth=error", request.url));
  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return NextResponse.redirect(new URL(nextPath, request.url));
  } catch {
    return NextResponse.redirect(new URL("/?auth=error", request.url));
  }
}
