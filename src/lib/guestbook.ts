/** Public guestbook DTOs deliberately exclude account IDs and private media. */
export type GuestbookStatus = "pending" | "approved" | "rejected" | "withdrawn";
export interface GuestbookEntry {
  id: number;
  name: string;
  body: string;
  createdAt: string;
  isAdmin: boolean;
  parentId: number | null;
  replies: GuestbookEntry[];
  replyCount: number;
}
export interface OwnGuestbookEntry extends GuestbookEntry { status: GuestbookStatus }
export interface GuestbookPage {
  items: GuestbookEntry[];
  page: number;
  totalPages: number;
  totalDocs: number;
}
export type GuestbookSession = { authenticated: false } | { authenticated: true; kind: "admin" | "member"; name: string };

export class GuestbookError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export function guestbookBody(value: unknown): string {
  if (typeof value !== "string") throw new GuestbookError("请写下 1—500 字的留言。", 400);
  const body = value.replace(/\r\n?/g, "\n").trim();
  if (!body || Array.from(body).length > 500 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body)) throw new GuestbookError("请写下 1—500 字的纯文字留言。", 400);
  return body;
}
export function guestbookId(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) throw new GuestbookError("留言编号不正确。", 400);
  return value;
}
export function guestbookPage(value: string | null): number {
  if (value === null) return 1;
  if (!/^[1-9]\d{0,5}$/.test(value)) throw new GuestbookError("页码不正确。", 400);
  return Number(value);
}
export function guestbookName(user: { name?: string | null }, admin: boolean): string {
  const name = typeof user.name === "string" ? user.name.trim() : "";
  return Array.from(name || (admin ? "站主" : "小窝访客")).slice(0, 40).join("");
}
export function relationshipId(value: unknown): number | null {
  const id = typeof value === "object" && value && "id" in value ? value.id : value;
  return typeof id === "number" && Number.isSafeInteger(id) && id > 0 ? id : null;
}
export function guestbookEntry(row: { id: number; name: string; body: string; createdAt: string; isAdmin?: boolean | null; parent?: unknown }): GuestbookEntry {
  return { id: row.id, name: row.name, body: row.body, createdAt: row.createdAt, isAdmin: row.isAdmin === true, parentId: relationshipId(row.parent), replies: [], replyCount: 0 };
}
