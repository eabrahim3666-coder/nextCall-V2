import "server-only";

import { businessesCollection, withRetry } from "@/lib/astra";

export async function findBusinessByUserId(userId: string) {
    const directMatch = await withRetry(() =>
        businessesCollection.findOne({ business_id: userId })
    );

    return directMatch ?? null;
}
