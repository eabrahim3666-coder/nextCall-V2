import "server-only";

import { businessesCollection } from "@/lib/astra";

export async function findBusinessByUserId(userId: string) {
    const directMatch = await businessesCollection.findOne({ business_id: userId });

    return directMatch ?? null;
}
