export const dynamic = "force-dynamic";

// Retired public surface. Do not authenticate, parse input, or access stored messages.
function retired() {
  return Response.json({ error: "guestbook_retired", message: "留言功能已下线。" }, {
    status: 410,
    headers: {
      "Cache-Control": "private, no-store",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
    },
  });
}

export const GET = retired;
export const POST = retired;
export const DELETE = retired;
