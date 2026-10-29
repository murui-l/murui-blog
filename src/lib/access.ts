import type { Access } from "payload";
export const isAdmin = (user: unknown): boolean => Boolean(user && typeof user === "object" && "collection" in user && user.collection === "users");
export const isMember = (user: unknown): boolean => Boolean(user && typeof user === "object" && "collection" in user && user.collection === "members");
export const adminOnly: Access = ({ req }) => isAdmin(req.user);
export const ownPrivateContent: Access = ({ req }) => isMember(req.user) ? { owner: { equals: req.user!.id } } : false;
export const readPrivateContent: Access = args => isAdmin(args.req.user) ? true : ownPrivateContent(args);
export const privateHeaders = { "Cache-Control": "private, no-store", "CDN-Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "no-store" };
