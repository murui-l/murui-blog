import { headers } from "next/headers";
import { notFound,redirect } from "next/navigation";
import Link from "next/link";
import { cms,toPost } from "@/lib/db";
import { isAdmin } from "@/lib/access";
import RichContent from "@/components/RichContent";
export const dynamic="force-dynamic";
export const metadata={title:"文章预览",robots:{index:false,follow:false}};
export default async function Preview({params}:{params:Promise<{id:string}>}){
  const client=await cms(),{user}=await client.auth({headers:await headers()});if(!isAdmin(user))redirect("/admin/login");
  const {id}=await params;let post;try{post=await client.findByID({collection:"posts",id,draft:true,depth:1,user,overrideAccess:false});}catch{notFound();}
  const p=toPost(post as unknown as Record<string,unknown>);
  return <main id="main" className="wrap article-wrap"><div className="preview-banner">仅自己可见的预览 <Link href={`/admin/collections/posts/${id}`}>返回编辑 →</Link></div><header className="article-heading"><span className="category-label">{p.category}</span><h1>{p.title}</h1><p>{p.excerpt}</p></header>{p.richContent&&<RichContent data={p.richContent}/>}</main>;
}
