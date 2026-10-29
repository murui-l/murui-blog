# 沐瑞的小窝 🐷

线上网站：[muruiwen.cn](https://muruiwen.cn/)

这是当前网站的源码快照，使用 Next.js、React 与 Payload CMS。首页包含相册轮播、共享电台与同步歌词、透明提瓦特地图、角色专题和文章页面。

仓库包含代码、公开静态素材、迁移与依赖许可；不包含线上数据库、文章记录、用户账号、私密随笔、环境密钥或备份。自行部署时需要配置自己的数据库并初始化管理员。

图片、角色、地图、音乐及第三方代码分别遵循原作者和对应项目的权利说明，见 [licenses](./licenses/)。公开此仓库不代表授予素材的再分发或商业使用许可。

个人博客，使用 Next.js + [Payload CMS](https://github.com/payloadcms/payload)。后台提供中文富文本编辑、草稿自动保存、发布、版本历史、图片库、回收站和站点设置。前台包含首页、文章、分类/标签归档、搜索、关于页、RSS 和 sitemap。

## 本地运行

使用 Node.js 22，运行 `npm ci`。把 `.env.example` 复制为 `.env.local`，填写随机 `PAYLOAD_SECRET` 和自己的初始管理员密码。

```sh
node --env-file=.env.local node_modules/payload/bin.js migrate
node --env-file=.env.local --import tsx scripts/seed.ts
npm run dev -- --port 3100
```

访问 `http://localhost:3100`，管理后台在 `/admin`。初始化只在管理员/文章集合为空时创建账户和欢迎文章。生产部署前必须先初始化管理员，避免出现无人管理的首次注册页面。

## 写作与备份

普通访客可在 `/my-notes` 注册和登录个人随笔账号，随笔及配图仅本人和网站管理员可见，不进入首页、归档、RSS 或 sitemap。普通用户不能发布公开文章、访问后台、修改其他账号或网站设置。管理员仍通过 `/write` 使用原账号写公开文章，在 `/member-notes` 只读查看用户随笔。前台会明确提示管理员可见。

普通账号使用独立的 `members` 认证集合；`private-notes`、`private-media` 按服务器写入的 owner 隔离。管理员权限必须验证 `user.collection === 'users'`，不能用“已登录”代替。私密图片单独存于 `BlogPrivateMediaBlob`，下载校验权限并使用 private/no-store，不能经公开图片 URL 读取。

完整迁移普通用户内容时必须备份全量数据库（含新集合、账号与 BlogPrivateMediaBlob），旧 `/api/blog-backup` 内容导出仅覆盖管理员博客。新迁移 `20260915_073320_private_member_notes` 仅增加表、索引、关系列，手动移除了旧分类默认值导致的表重建；不要因以后生成的默认值差异直接重建旧文章表。该迁移不提供破坏用户数据的自动 down，请审查备份恢复方案。

个人随笔账号使用账号密码登录，密码至少 8 位，目前无邮件找回。管理员按用户要求可以读取随笔。未开通收费服务。

前台 `/write` 提供写作页，使用现有管理员账号登录。登录后前台显示“写随笔 / 写文章 / 我的文章”，文章详情另有“编辑这篇文章”。可编辑标题、富文本、分类、标签、摘要，上传或选择封面和正文配图。前台手动保存草稿，点击发布后公开；保存草稿不会撤下已发布的旧版本。`/write?view=posts` 查看文章，`/write?id=数字ID` 读取最新草稿。

前台复用 Payload 会话与文章/图片 REST API，不增加账户系统或数据库表。`/write` 动态且不缓存；`/api/writing-session` 只返回登录状态并设置 private/no-store。公开布局仍使用 ISR，通过客户端显示管理入口。图片最大 3 MB，缩放至最长设计宽度 1600 像素并转换为 WebP；不支持 SVG 上传。

后台也可继续写作，另外支持自动保存、完整编辑工具、历史版本和回收站。预览要求登录。前台会提示未保存内容，检查其他页面已发生的修改；这不是原子并发锁，请避免同时编辑同一篇文章。不支持的自定义富文本节点会阻止保存以保护原文，提示改用后台。

后台首页“导出内容备份”会下载 JSON，包含最新文章内容、仍在公开展示的版本、草稿、回收站文章、图片原始字节和站点设置。不包含密码、登录会话、全部历史版本。导出期间暂停写作，以免不同页数据变化。JSON 含未发布内容，请私下保存。

恢复到空数据库：先更改 `.env.local` 数据库连接，运行 `payload migrate`，然后：

```sh
node --env-file=.env.local --import tsx scripts/import-content.ts /path/to/backup.json
node --env-file=.env.local --import tsx scripts/seed.ts
```

恢复脚本要求目标文章与图片集合为空，按新图片 ID 重建封面、头像和正文图片关系，保留文章链接。随后再运行 seed 创建独立管理员；已有文章不会被欢迎文章覆盖。当前导入格式不迁移自定义关系字段或整套历史版本。如需迁移这些，请做数据库全量备份。

没有配置邮件服务；当前使用用户名和密码登录。不要依赖邮件重置。更换管理员密码可在已登录的账户页面完成；忘记密码时由服务器管理员通过 Payload Local API 设置新密码。

## 服务器和数据库迁移

程序可以运行在 Vercel 或支持 Node.js 的服务器。当前 `vercel.json` 明确指定 `hkg1`（香港函数区域）。Turso 数据库仍在东京，函数和数据库的地区分别配置。香港区域不能保证所有大陆网络都低延迟。

图片通过 Payload 的 cloud-storage 适配器存入 `BlogMediaBlob`，而非服务器临时磁盘，因此重新部署不会丢失图片。个人博客规模适用；大量图片或视频时可改用官方 S3 适配器。

换 libSQL/SQLite 服务可复制整个数据库，保留文章、历史版本、用户和图片，并保留同一 `PAYLOAD_SECRET`。更换数据库类型（例如 PostgreSQL）需要换 Payload 官方适配器并生成新迁移；可用内容备份导入，但需在新库验证。替换服务地址后再切换域名。

`push:false` 禁止开发模式自动修改数据库。改字段后先运行 `payload migrate:create` 审查迁移，再运行 `payload migrate`。生产迁移应单独运行，不能依赖网站请求自动建表。当前初始迁移只增加 `blog_*` 与 Payload 系统表，不删除原排行榜表。

## 部署

```sh
npm run lint
npm run build
```

生产环境设置 `TURSO_URL`、`TURSO_AUTH_TOKEN`、`PAYLOAD_SECRET`、`SITE_URL`。Vercel 项目使用 Next.js 框架和 Node.js 22。数据库迁移和初始化管理员完成后再部署。不要上传含真实配置的 `.env` / `.env.local`、本地数据库、备份或账户凭据；仓库中的 `.env.example` 仅包含占位示例。

`npm test` 是本地集成测试，会在 localhost 的可丢弃数据库中创建测试文章、图片和回收站内容。测试使用项目上级 `local-test-account.json` 中的测试账户；请勿对生产库运行。

## 开源来源

管理后台和 API 路由接入方式基于 Payload 官方 `templates/blank`（v3.89.0），遵循 MIT 协议，见 `licenses/payload-MIT.md`。认证、富文本、版本和内容管理由 Payload 提供；前台主题、图片数据库适配器、备份界面属于本项目定制。其他依赖遵循各自开源许可证。
