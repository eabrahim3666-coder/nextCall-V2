import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { findBusinessByUserId } from "@/lib/business";

export async function GET() {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business = await findBusinessByUserId(userId);

    return NextResponse.json({ status: business?.status || "pending" });
}
