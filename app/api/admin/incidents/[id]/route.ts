import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { incidentsStore, transitionIncident } from "@/lib/recovery/incidents-store";
import { retryIncident } from "@/lib/recovery/engine";
import { getRecommendableActions } from "@/lib/recovery/registry";
import type { IncidentStatus } from "@/lib/recovery/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const ACTIONABLE_STATUSES: IncidentStatus[] = ["OPEN", "RECOVERING", "REQUIRES_ACTION"];

export async function GET(_request: Request, { params }: Params) {
  try {
    const adminId = await requireAdmin();
    if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const incident =
      (await incidentsStore.findOne({ _id: id })) ||
      (await incidentsStore.findOne({ fingerprint: id }));
    if (!incident) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      incident: {
        ...incident,
        recommendableActions: getRecommendableActions(
          incident.provider,
          incident.operation
        ).map((a) => ({ id: a.id, description: a.description })),
      },
    });
  } catch (error) {
    console.error("Admin incident detail error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const adminId = await requireAdmin();
    if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      note?: string;
    };
    const note = typeof body.note === "string" ? body.note.slice(0, 1000) : undefined;

    const incident =
      (await incidentsStore.findOne({ _id: id })) ||
      (await incidentsStore.findOne({ fingerprint: id }));
    if (!incident) return NextResponse.json({ error: "Not found" }, { status: 404 });

    switch (body.action) {
      case "retry": {
        const result = await retryIncident(id, adminId);
        return NextResponse.json({
          ok: result.ok,
          incident: result.incident,
          error: result.error,
        });
      }
      case "resolve":
      case "recover":
      case "dismiss":
      case "requires_action": {
        if (!ACTIONABLE_STATUSES.includes(incident.status)) {
          return NextResponse.json(
            { ok: false, error: `Cannot transition from terminal status "${incident.status}"` },
            { status: 409 }
          );
        }
        const status: IncidentStatus =
          body.action === "requires_action"
            ? "REQUIRES_ACTION"
            : body.action === "dismiss"
              ? "DISMISSED"
              : "RESOLVED";
        const updated = await transitionIncident(incidentsStore, id, status, {
          by: adminId,
          note,
          resolvedAt: new Date().toISOString(),
        });
        return NextResponse.json({ ok: true, incident: updated });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Admin incident action error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
