import {getPayload} from "payload";
import config from "../src/payload.config";
const payload=await getPayload({config});
const users=await payload.count({collection:"users"});
if(!users.totalDocs){
  if(!process.env.BLOG_ADMIN_PASSWORD)throw new Error("Set BLOG_ADMIN_PASSWORD before creating the first administrator.");
  await payload.create({collection:"users",data:{username:process.env.BLOG_ADMIN_USERNAME||"murui",password:process.env.BLOG_ADMIN_PASSWORD,name:"沐瑞"}});
}
const posts=await payload.count({collection:"posts",trash:true});
if(!posts.totalDocs){
  const paragraphs=["嗨，欢迎来到沐瑞的小窝。","这里是一个用文字安放生活与想法的地方。那些值得记住的瞬间、偶然冒出的灵感，还有一路上的小小发现，都可以慢慢收集在这里。","小窝刚刚开门，故事也正准备开始。愿你在这里找到片刻轻松，欢迎常来坐坐。"];
  await payload.create({collection:"posts",data:{title:"欢迎来到沐瑞的小窝",slug:"welcome-home",category:"小窝记事",tags:["新的开始"],featured:true,_status:"published",excerpt:"小窝刚刚开门，故事也正准备开始。愿这里成为一个用文字安放生活与想法的地方。",content:{root:{type:"root",version:1,direction:null,format:"",indent:0,children:paragraphs.map(text=>({type:"paragraph",version:1,direction:null,format:"",indent:0,textFormat:0,textStyle:"",children:[{type:"text",version:1,text,detail:0,format:0,mode:"normal",style:""}]}))}}}});
}
console.log("Blog initialized. Administrator credentials were not logged.");
await payload.destroy();
process.exit(0);
