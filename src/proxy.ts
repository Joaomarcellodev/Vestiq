import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

/** Next.js proxy (formerly middleware) — refreshes session + guards routes. */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image
     * - favicon.ico, sitemap.xml, robots.txt
     * - image/asset files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
