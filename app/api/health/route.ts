import { NextResponse } from "next/server";
import { validateEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * GET: health check for load balancers and monitoring.
 * Returns 200 when env is valid and app can start; 503 when required env is missing.
 * Never exposes secret values.
 */
export async function GET() {
  const { valid, missing } = validateEnv();
  if (!valid) {
    return NextResponse.json(
      { status: "unhealthy", missing: missing },
      { status: 503 }
    );
  }

  // Dev-only optional schema readiness check for manuals answers snapshot.
  if (process.env.NODE_ENV === "development") {
    const missingSchema: string[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from("information_schema.columns")
        .select("column_name")
        .eq("table_name", "manuals")
        .in("column_name", ["answers_snapshot", "family_id"]);

      if (error || !data) {
        // If the introspection itself fails, treat schema as missing but keep message generic.
        missingSchema.push("manuals.answers_snapshot", "manuals.family_id");
      } else {
        const present = new Set(data.map((row: { column_name: string }) => row.column_name));
        if (!present.has("answers_snapshot")) {
          missingSchema.push("manuals.answers_snapshot");
        }
        if (!present.has("family_id")) {
          missingSchema.push("manuals.family_id");
        }
      }
    } catch {
      missingSchema.push("manuals.answers_snapshot", "manuals.family_id");
    }

    if (missingSchema.length > 0) {
      return NextResponse.json(
        { status: "unhealthy", missingSchema },
        { status: 503 }
      );
    }
  }

  return NextResponse.json({ status: "ok" });
}
