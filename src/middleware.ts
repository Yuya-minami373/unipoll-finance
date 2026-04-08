import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const [user, pass] = decoded.split(":");
      if (
        user === process.env.BASIC_AUTH_USER &&
        pass === process.env.BASIC_AUTH_PASS
      ) {
        return NextResponse.next();
      }
    }
  }

  // sync APIはトークン認証で通す
  if (req.nextUrl.pathname === "/api/sync") {
    const token = req.headers.get("x-api-token");
    if (token && token === process.env.API_SYNC_TOKEN) {
      return NextResponse.next();
    }
  }

  return new NextResponse(null, {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="UniPoll Finance"',
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
