import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import type { PayloadRequest } from "payload";

export const PUBLIC_CACHE_TAG = "murui-public-content-v1";
export const PUBLIC_CACHE_SECONDS = 300;

// Payload afterChange runs before its transaction commits. Invalidate after the
// HTTP response so a concurrent reader cannot refill the cache with old data.
export function refreshPublicCache(req: PayloadRequest) {
  if (req.context.publicCacheRefreshScheduled) return;
  req.context.publicCacheRefreshScheduled = true;
  try {
    after(() => {
      revalidateTag(PUBLIC_CACHE_TAG, { expire: 0 });
      revalidatePath("/", "layout");
      revalidatePath("/feed.xml");
      revalidatePath("/sitemap.xml");
    });
  } catch {
    // Local API migration/import scripts have no Next request context. Their
    // changes become visible on deployment or the five-minute cache refresh.
    req.payload.logger.info("Public cache refresh deferred: no Next request context.");
  }
}
