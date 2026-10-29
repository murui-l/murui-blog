import { APIError, type CollectionConfig } from "payload";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { adminOnly, isAdmin, isMember } from "./access";
import { guestbookBody, guestbookName, relationshipId } from "./guestbook";

function refreshGuestbook() {
  try { after(() => revalidatePath("/guestbook", "page")); }
  catch { /* Local API imports and migration checks have no Next request. GET is uncached. */ }
}

export const Guestbook: CollectionConfig = {
  slug: "guestbook-entries", dbName: "blog_guestbook",
  labels: { singular: "小窝留言", plural: "小窝留言" },
  admin: {
    group: "小窝管理", useAsTitle: "name", defaultColumns: ["name", "body", "status", "parent", "createdAt"],
    description: "成员留言审核后公开。回复时新建留言并选择已公开的主留言；站主发言直接公开。删除请将状态改为“已撤回”，撤回后不能重新公开。",
  },
  // The generic Payload API is administrator-only. Member reads/writes use
  // /api/guestbook, which authenticates first and returns an explicit safe DTO.
  access: { admin: ({ req }) => isAdmin(req.user), create: adminOnly, read: adminOnly, update: adminOnly, delete: () => false },
  fields: [
    { name: "author", type: "relationship", relationTo: ["members", "users"], required: true, index: true, label: "作者账号", defaultValue: ({ user }) => user && (isAdmin(user) || isMember(user)) ? { relationTo: isAdmin(user) ? "users" : "members", value: user.id } : undefined, admin: { readOnly: true, position: "sidebar" } },
    { name: "name", type: "text", required: true, maxLength: 40, label: "昵称快照", defaultValue: ({ user }) => user ? guestbookName(user, isAdmin(user)) : undefined, admin: { readOnly: true } },
    { name: "body", type: "textarea", required: true, maxLength: 1000, label: "留言正文", admin: { description: "1—500 字纯文字，不支持 HTML 或 Markdown。" } },
    { name: "parent", type: "relationship", relationTo: "guestbook-entries", index: true, label: "回复的主留言", admin: { description: "留空为主留言；只允许回复已公开的主留言。" }, filterOptions: { and: [{ parent: { exists: false } }, { status: { equals: "approved" } }] } },
    { name: "isAdmin", type: "checkbox", defaultValue: false, label: "站主标记", admin: { readOnly: true, position: "sidebar" } },
    { name: "status", type: "select", required: true, index: true, defaultValue: "pending", label: "审核状态", options: [{ label: "待审核", value: "pending" }, { label: "已公开", value: "approved" }, { label: "已拒绝", value: "rejected" }, { label: "已撤回", value: "withdrawn" }], admin: { position: "sidebar" } },
    { name: "withdrawnAt", type: "date", label: "撤回时间", admin: { readOnly: true, position: "sidebar" } },
  ],
  hooks: {
    beforeValidate: [({ data, req, operation, originalDoc }) => {
      if (!data) return data;
      if (operation === "create") {
        if (!isAdmin(req.user) && !isMember(req.user)) throw new APIError("请先登录小窝账号。", 401);
        const admin = isAdmin(req.user);
        data.author = { relationTo: admin ? "users" : "members", value: req.user!.id };
        data.name = guestbookName(req.user!, admin);
        data.isAdmin = admin;
        data.status = admin ? "approved" : "pending";
        data.withdrawnAt = null;
      } else if (originalDoc) {
        data.author = originalDoc.author;
        data.name = originalDoc.name;
        data.isAdmin = originalDoc.isAdmin;
        data.parent = originalDoc.parent;
      }
      return data;
    }],
    beforeChange: [async ({ data, req, operation, originalDoc }) => {
      if (operation !== "create" && originalDoc?.status === "withdrawn") {
        if (data.status !== undefined && data.status !== "withdrawn") throw new APIError("已撤回的留言不能重新公开。", 409);
        data.status = "withdrawn";
        data.withdrawnAt = originalDoc.withdrawnAt;
      }
      try { data.body = guestbookBody(data.body ?? originalDoc?.body); }
      catch { throw new APIError("请写下 1—500 字的纯文字留言。", 400); }
      const parentId = relationshipId(data.parent);
      if (data.parent && !parentId) throw new APIError("请选择有效的主留言。", 400);
      if (parentId && (operation === "create" || data.status === "approved")) {
        const parent = await req.payload.findByID({ collection: "guestbook-entries", id: parentId, overrideAccess: true, depth: 0, req }).catch(() => null);
        if (!parent || parent.status !== "approved" || relationshipId(parent.parent)) throw new APIError("只能回复已公开的主留言。", 409);
      }
      if (data.status === "withdrawn" && originalDoc?.status !== "withdrawn") data.withdrawnAt = new Date().toISOString();
      return data;
    }],
    afterChange: [({ doc }) => { refreshGuestbook(); return doc; }],
  },
};
