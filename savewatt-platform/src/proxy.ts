import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);
const demoMode = process.env.NEXT_PUBLIC_SAVEWATT_DEMO_MODE === "true";

// Everything except the auth screens requires a signed-in user.
const isPublicRoute = createRouteMatcher([
  "/:locale/sign-in(.*)",
  "/:locale/sign-up(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/:locale/portal/offer/(.*)",
  "/api/docuseal/webhook(.*)",
]);

const isApiRoute = createRouteMatcher(["/api(.*)", "/trpc(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (!demoMode && !isPublicRoute(request)) {
    if (isApiRoute(request)) {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
      }
    } else {
      await auth.protect();
    }
  }
  return isApiRoute(request) ? NextResponse.next() : intlMiddleware(request);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
