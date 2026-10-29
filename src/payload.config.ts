import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { buildConfig, type Access, type CollectionConfig } from "payload";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor, FixedToolbarFeature } from "@payloadcms/richtext-lexical";
import { cloudStoragePlugin } from "@payloadcms/plugin-cloud-storage";
import { zh } from "@payloadcms/translations/languages/zh";
import sharp from "sharp";
import { tursoMediaAdapter, privateMediaAdapter } from "./lib/media-store";
import { adminOnly, isAdmin } from "./lib/access";
import { Members, PrivateNotes, PrivateMedia } from "./lib/private-collections";
import { Guestbook } from "./lib/guestbook-collection";
import { defaults, slugFromTitle, lexicalText } from "./lib/domain";
import { refreshPublicCache } from "./lib/public-cache";
const dirname=path.dirname(fileURLToPath(import.meta.url));
const authenticated: Access=adminOnly;
const published: Access=({req})=>isAdmin(req.user)?true:{_status:{equals:"published"},deletedAt:{exists:false}};
const Posts: CollectionConfig={
  slug:"posts", dbName:"blog_posts", labels:{singular:"文章",plural:"文章"}, trash:true,
  admin:{ useAsTitle:"title",defaultColumns:["title","category","_status","publishedAt"],group:"写作空间",description:"写下日常与灵感。草稿仅自己可见，发布后会出现在随笔和文章列表中。",preview:doc=>`${process.env.SITE_URL||"https://muruiwen.cn"}/preview/${doc.id}` },
  access:{read:published,create:authenticated,update:authenticated,delete:authenticated,readVersions:authenticated},
  versions:{drafts:{autosave:{interval:15000}},maxPerDoc:30},
  fields:[
    {name:"title",type:"text",label:"文章标题",required:true,maxLength:160},
    {name:"content",type:"richText",label:"正文",required:true},
    {name:"excerpt",type:"textarea",label:"摘要",maxLength:300,admin:{description:"显示在文章列表与搜索结果中。留空时从正文提取。"}},
    {name:"cover",type:"upload",relationTo:"media",label:"封面图片",admin:{position:"sidebar"}},
    {name:"slug",type:"text",label:"文章链接",required:true,unique:true,index:true,maxLength:100,admin:{position:"sidebar",description:"使用汉字、字母、数字或短横线；首次保存时自动生成。"},hooks:{beforeValidate:[({value,siblingData})=>siblingData.title&&(!value||/^draft-[a-f0-9-]{36}$/.test(value))?slugFromTitle(siblingData.title):value||`draft-${randomUUID()}`]},validate:(value: string | null | undefined)=>!value||/^[a-z0-9\u4e00-\u9fff]+(?:-[a-z0-9\u4e00-\u9fff]+)*$/.test(value)?true:"请使用汉字、小写字母、数字和短横线"},
    {name:"category",type:"text",label:"分类",defaultValue:"生活随笔",required:true,maxLength:32,admin:{position:"sidebar",description:"生活记录使用“生活随笔”，发布后自动进入生活随笔列表。其他文章可改为心海甜文等分类。"}},
    {name:"tags",type:"text",hasMany:true,label:"标签",maxLength:30,admin:{position:"sidebar",description:"输入标签后按回车添加"}},
    {name:"featured",type:"checkbox",label:"精选文章",defaultValue:false,admin:{position:"sidebar"}},
    {name:"publishedAt",type:"date",label:"发布日期",admin:{position:"sidebar",date:{pickerAppearance:"dayAndTime"}}},
  ],
  hooks:{afterChange:[({doc,previousDoc,req})=>{if(doc._status==="published"||previousDoc?._status==="published"||doc.deletedAt)refreshPublicCache(req);return doc;}],afterDelete:[({req})=>{refreshPublicCache(req);}],beforeChange:[({data})=>{if(data._status==="published"&&!data.publishedAt)data.publishedAt=new Date().toISOString();if(!data.excerpt&&data.content)data.excerpt=lexicalText(data.content).slice(0,130);return data;}]},
};
export default buildConfig({
  secret:process.env.PAYLOAD_SECRET||"",
  serverURL:process.env.SITE_URL||"https://muruiwen.cn",
  cookiePrefix:"murui",
  admin:{user:"users",importMap:{baseDir:dirname},meta:{titleSuffix:" · 沐瑞的小窝"},components:{graphics:{Logo:"@/components/cms/Logo#Logo",Icon:"@/components/cms/Logo#Mark"},beforeDashboard:["@/components/cms/Welcome#default"]}},
  i18n:{fallbackLanguage:"zh",supportedLanguages:{zh}},
  editor:lexicalEditor({features:({defaultFeatures})=>[...defaultFeatures,FixedToolbarFeature()]}),
  db:sqliteAdapter({client:{url:process.env.TURSO_URL||process.env.DATABASE_URL||"file:payload-local.db",authToken:process.env.TURSO_AUTH_TOKEN},push:false,migrationDir:path.resolve(dirname,"migrations")}),
  typescript:{outputFile:path.resolve(dirname,"payload-types.ts")},
  graphQL:{disable:true},
  sharp,
  upload:{limits:{fileSize:3000000}},
  collections:[
    Members, PrivateNotes, PrivateMedia, Guestbook,
    {slug:"users",dbName:"blog_users",labels:{singular:"管理员",plural:"管理员"},admin:{useAsTitle:"username",group:"小窝管理"},auth:{loginWithUsername:{allowEmailLogin:false,requireEmail:false},maxLoginAttempts:6,lockTime:900000,tokenExpiration:604800},access:{create:authenticated,read:authenticated,update:authenticated,delete:()=>false},fields:[{name:"name",type:"text",label:"昵称",defaultValue:"沐瑞"}]},
    Posts,
    {slug:"media",dbName:"blog_media",hooks:{afterChange:[({doc,req})=>{refreshPublicCache(req);return doc;}],afterDelete:[({req})=>{refreshPublicCache(req);}]},labels:{singular:"图片",plural:"图片库"},admin:{group:"写作空间",description:"正文、封面和头像使用的图片。建议上传 3 MB 以内的 JPG、PNG 或 WebP。"},access:{read:()=>true,create:authenticated,update:authenticated,delete:authenticated},upload:{mimeTypes:["image/jpeg","image/png","image/webp"],disableLocalStorage:true,resizeOptions:{width:1600,withoutEnlargement:true},formatOptions:{format:"webp",options:{quality:85}}},fields:[{name:"alt",type:"text",label:"图片描述",required:true,admin:{description:"描述画面内容，也方便使用屏幕阅读器的读者。"}}]},
  ],
  globals:[{slug:"site-settings",dbName:"blog_settings",hooks:{afterChange:[({doc,req})=>{refreshPublicCache(req);return doc;}]},label:"小窝设置",admin:{group:"小窝管理",description:"这里的修改保存后会显示在首页与关于页面。"},access:{read:()=>true,update:authenticated},fields:[
    {name:"avatar",type:"upload",relationTo:"media",label:"博客头像",admin:{description:"上传新图片，或从图片库选择已有图片，然后点击保存。保存后首页与关于页会同步更新。支持 JPG、PNG、WebP，大小不超过 3 MB，建议使用正方形图片。清空并保存可恢复默认头像。"}},
    {name:"name",type:"text",label:"博客名称",defaultValue:defaults.name,required:true,maxLength:40},
    {name:"author",type:"text",label:"你的昵称",defaultValue:defaults.author,required:true,maxLength:30},
    {name:"tagline",type:"text",label:"首页标语",defaultValue:defaults.tagline,required:true,maxLength:60},
    {name:"description",type:"textarea",label:"小窝简介",defaultValue:defaults.description,required:true,maxLength:180},
    {name:"about",type:"textarea",label:"关于我",defaultValue:defaults.about,admin:{description:"支持 Markdown 排版"}},
    {name:"email",type:"email",label:"公开联系邮箱",admin:{description:"可留空，填写后会在关于页公开显示。"}},
    {name:"github",type:"text",label:"个人链接",validate:(value: string | null | undefined)=>!value||/^https:\/\//.test(value)?true:"请填写 HTTPS 链接",admin:{description:"可填 GitHub 或其他个人主页，也可以留空。"}},
  ]}],
  plugins:[cloudStoragePlugin({collections:{media:{adapter:tursoMediaAdapter,disableLocalStorage:true},"private-media":{adapter:privateMediaAdapter,disableLocalStorage:true}}})],
});
