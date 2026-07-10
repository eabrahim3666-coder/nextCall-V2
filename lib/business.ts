import "server-only";

import { businessesCollection } from "@/lib/astra";

export async function findBusinessByUserId(userId: string) {
    const directMatch = await businessesCollection.findOne({ business_id: userId });

    if (directMatch?.status === "active") {
        return directMatch;
    }

    const allBusinesses = await businessesCollection.find({ business_id: { $exists: true } }).toArray();
    const fallbackMatch = allBusinesses.find((business) => String(business.business_id) === userId);

    return fallbackMatch ?? directMatch ?? null;
}
