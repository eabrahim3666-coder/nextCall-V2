import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { queryIncidents, incidentStats, type IncidentFilters } from "@/lib/recovery/incidents-store";

export const dynamic = "force-dynamic";

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export async function GET(request: Request) {
  try {
    const adminId = await requireAdmin();
    if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const filters: IncidentFilters = {
      provider: first(url.searchParams.get("provider") || undefined),
      severity: first(url.searchParams.get("severity") || undefined),
      status: first(url.searchParams.get("status") || undefined),
      operation: first(url.searchParams.get("operation") || undefined),
      q: first(url.searchParams.get("q") || undefined),
      from: first(url.searchParams.get("from") || undefined),
      to: first(url.searchParams.get("to") || undefined),
      limit: 300,
    };

    const [incidents, stats] = await Promise.all([queryIncidents(filters), incidentStats()]);
    return NextResponse.json({ incidents, stats });
  } catch (error) {
    console.error("Admin incidents list error:", error);
    return NextResponse.json({ error: "Failed to load incidents" }, { status: 502 });
  }
}
