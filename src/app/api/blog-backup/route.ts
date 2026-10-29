import { cms } from "@/lib/db";
import { isAdmin } from "@/lib/access";
export const dynamic="force-dynamic";
export async function GET(request: Request) {
  const payload=await cms();
  const {user}=await payload.auth({headers:request.headers});
  if(!isAdmin(user))return Response.json({error:"请先登录后台"},{status:401,headers:{"Cache-Control":"private, no-store"}});
  const url=new URL(request.url),kind=url.searchParams.get("kind"),page=Number(url.searchParams.get("page")||1);
  if(!Number.isSafeInteger(page)||page<1)return Response.json({error:"无效页码"},{status:400});
  const headers={"Cache-Control":"private, no-store"};
  if(kind==="settings")return Response.json(await payload.findGlobal({slug:"site-settings",depth:0,user,overrideAccess:false}),{headers});
  if(kind!=="posts"&&kind!=="media")return Response.json({error:"无效内容类型"},{status:400});
  // One document per response keeps rich text and images below serverless limits.
  const result=await payload.find({collection:kind,page,limit:1,sort:"id",depth:0,draft:kind==="posts",trash:kind==="posts",user,overrideAccess:false});
  if(kind==="posts")for(const doc of result.docs){
    const current=await payload.findByID({collection:"posts",id:doc.id,depth:0,draft:false,trash:true,user,overrideAccess:false});
    // Preserve the public edition when a newer draft is still being edited.
    if(current._status==="published")Object.assign(doc,{_published:current});
  }
  return Response.json(result,{headers});
}
