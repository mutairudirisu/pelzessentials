import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

type CallbackFailure = "cancelled" | "provider_error" | "missing_code" | "exchange_failed";

function safeNextPath(value: string | null, requestUrl: string) {
  if (!value) return "/";
  const requestedUrl = new URL(value, requestUrl);
  if (requestedUrl.origin !== new URL(requestUrl).origin) return "/";
  return `${requestedUrl.pathname}${requestedUrl.search}${requestedUrl.hash}`;
}

function failureRedirect(request: NextRequest, failure: CallbackFailure, nextPath: string) {
  const url = new URL("/auth/sign-in", request.url);
  url.searchParams.set("error", failure);
  if (nextPath !== "/") url.searchParams.set("next", nextPath);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const nextPath = safeNextPath(params.get("next"), request.url);
  const providerError = params.get("error");
  const providerErrorCode = params.get("error_code");

  if (providerError) {
    const failure = providerError === "access_denied" ? "cancelled" : "provider_error";
    console.warn("Google OAuth callback returned an error", {
      providerError: /^[a-z0-9_-]{1,50}$/i.test(providerError) ? providerError : "other",
      providerErrorCode:
        providerErrorCode && /^[a-z0-9_-]{1,50}$/i.test(providerErrorCode)
          ? providerErrorCode
          : undefined,
      hasErrorDescription: params.has("error_description"),
      hasCode: Boolean(code),
    });
    return failureRedirect(request, failure, nextPath);
  }

  if (!code) {
    console.warn("Google OAuth callback did not include an authorization code", {
      hasErrorCode: params.has("error_code"),
      hasErrorDescription: params.has("error_description"),
      hasNext: params.has("next"),
    });
    return failureRedirect(request, "missing_code", nextPath);
  }

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.warn("Google OAuth code exchange failed", {
        errorName: error.name,
        status: error.status,
      });
      return failureRedirect(request, "exchange_failed", nextPath);
    }
    return NextResponse.redirect(new URL(nextPath, request.url));
  } catch (error) {
    console.error("Google OAuth callback could not complete the session exchange", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return failureRedirect(request, "exchange_failed", nextPath);
  }
}
