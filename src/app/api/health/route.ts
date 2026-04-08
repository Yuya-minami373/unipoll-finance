import { NextResponse } from "next/server";
import { dbGet } from "@/lib/db";

export async function GET() {
  try {
    const envCheck = {
      TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? "SET" : "MISSING",
      TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? "SET" : "MISSING",
    };

    // Try a simple query
    const result = await dbGet("SELECT 1 as ok");

    return NextResponse.json({
      status: "ok",
      env: envCheck,
      db: result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json({
      status: "error",
      error: message,
      stack,
      env: {
        TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? "SET" : "MISSING",
        TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? "SET" : "MISSING",
      },
    }, { status: 500 });
  }
}
