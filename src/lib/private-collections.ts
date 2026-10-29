import { APIError, type CollectionConfig, type CollectionBeforeChangeHook } from "payload";
import { isMember, isAdmin, ownPrivateContent, readPrivateContent, privateHeaders } from "./access";

const stampOwner: CollectionBeforeChangeHook = ({ data, req, originalDoc, operation }) => {
  if (!isMember(req.user)) throw new APIError("请登录个人随笔账号", 403);
  data.owner = operation === "create" ? req.user!.id : originalDoc.owner;
  return data;
};
const ownerField = { name: "owner", type: "relationship" as const, relationTo: "members" as const, required: true, index: true, admin: { hidden: true }, access: { update: () => false } };

export const Members: CollectionConfig = {
  slug: "members", dbName: "blog_members", labels: { singular: "随笔用户", plural: "随笔用户" },
  admin: { hidden: true },
  auth: { loginWithUsername: { allowEmailLogin: false, requireEmail: false }, maxLoginAttempts: 6, lockTime: 900000, tokenExpiration: 604800 },
  access: { admin: () => false, create: () => true, read: ({ req }) => isAdmin(req.user) ? true : isMember(req.user) ? { id: { equals: req.user!.id } } : false, update: ({ req }) => isMember(req.user) ? { id: { equals: req.user!.id } } : false, delete: () => false, unlock: () => false },
  hooks: { beforeValidate: [async ({ data, operation, req }) => {
    if (operation === "create" && (!data?.password || data.password.length < 8)) throw new APIError("密码至少需要 8 位", 400);
    if (data?.password && data.password.length < 8) throw new APIError("密码至少需要 8 位", 400);
    if (data?.username && !/^[a-zA-Z0-9_-]{3,32}$/.test(data.username)) throw new APIError("账号使用 3—32 位字母、数字、下划线或短横线", 400);
    if (data?.username) {
      const admin = await req.payload.find({ collection: "users", where: { username: { equals: data.username.trim().toLowerCase() } }, limit: 1, depth: 0, overrideAccess: true, select: { username: true } });
      if (admin.docs.length) throw new APIError("这个账号名不可用，请换一个。", 400);
    }
    return data;
  }], beforeChange: [async ({ data, req }) => {
    if (data.avatar) {
      const id = typeof data.avatar === "object" ? data.avatar.id : data.avatar;
      if (!isMember(req.user)) throw new APIError("请登录后设置头像", 403);
      const image = await req.payload.findByID({ collection: "private-media", id, req, overrideAccess: false, depth: 0 }).catch(() => null);
      if (!image) throw new APIError("请选择自己上传的头像", 400);
    }
    return data;
  }] },
  fields: [{ name: "name", type: "text", label: "昵称", required: true, maxLength: 40 },
    { name: "bio", type: "textarea", label: "个人简介", maxLength: 300 },
    { name: "avatar", type: "upload", relationTo: "private-media", label: "头像" }],
};
export const PrivateNotes: CollectionConfig = {
  slug: "private-notes", dbName: "blog_private_notes", labels: { singular: "私密随笔", plural: "私密随笔" }, admin: { hidden: true },
  access: { create: ({ req }) => isMember(req.user), read: readPrivateContent, update: ownPrivateContent, delete: ownPrivateContent },
  fields: [ownerField, { name: "title", type: "text", required: true, maxLength: 160 }, { name: "content", type: "richText", required: true },
    { name: "cover", type: "upload", relationTo: "private-media" }, { name: "category", type: "text", defaultValue: "生活随笔", maxLength: 32 },
    { name: "excerpt", type: "textarea", maxLength: 300 }, { name: "tags", type: "text", hasMany: true, maxLength: 30 }],
  hooks: { beforeValidate: [({ data, req, operation }) => { if (data && operation === "create" && isMember(req.user)) data.owner = req.user!.id; return data; }], beforeChange: [stampOwner, async ({ data, req }) => {
    // Relationship IDs from another account must never be saved, even via a hand-written request.
    const ids = new Set<number>();
    const add = (value: unknown) => { const id = Number(typeof value === "object" && value && "id" in value ? value.id : value); if (Number.isSafeInteger(id) && id > 0) ids.add(id); else throw new APIError("无效的配图", 400); };
    if (data.cover) add(data.cover);
    const walk = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      const item = node as Record<string, unknown>;
      if (item.type === "upload") { if (item.relationTo !== "private-media") throw new APIError("请从自己的图片库选择配图", 400); add(item.value); }
      if (item.type === "relationship" || (item.type === "link" && (item.fields as { linkType?: string })?.linkType === "internal")) throw new APIError("私密随笔不支持关联其他文档", 400);
      Object.values(item).forEach(walk);
    };
    walk(data.content);
    for (const id of ids) {
      const image = await req.payload.findByID({ collection: "private-media", id, req, overrideAccess: false, depth: 0 }).catch(() => null);
      if (!image) throw new APIError("这张配图不存在或不属于你的账号", 400);
    }
    return data;
  }] },
};
export const PrivateMedia: CollectionConfig = {
  slug: "private-media", dbName: "blog_private_media", labels: { singular: "私密图片", plural: "私密图片" }, admin: { hidden: true },
  access: { create: ({ req }) => isMember(req.user), read: readPrivateContent, update: ownPrivateContent, delete: ownPrivateContent },
  upload: { mimeTypes: ["image/jpeg", "image/png", "image/webp"], disableLocalStorage: true, resizeOptions: { width: 1600, withoutEnlargement: true }, formatOptions: { format: "webp", options: { quality: 85 } } },
  fields: [ownerField, { name: "alt", type: "text", required: true, maxLength: 160 }],
  hooks: { beforeValidate: [({ data, req, operation }) => { if (data && operation === "create" && isMember(req.user)) data.owner = req.user!.id; return data; }], beforeChange: [stampOwner], afterRead: [({ doc, req }) => { req.responseHeaders ??= new Headers(); for (const [key, value] of Object.entries(privateHeaders)) req.responseHeaders.set(key, value); return doc; }] },
};
