import {headers} from "next/headers";
import {redirect} from "next/navigation";
import Link from "next/link";
import {cms} from "@/lib/db";
import {isAdmin} from "@/lib/access";
import Backup from "@/components/Backup";
export const dynamic="force-dynamic";
export const metadata={title:"内容备份",robots:{index:false,follow:false}};
export default async function BackupPage(){
  const {user}=await(await cms()).auth({headers:await headers()});if(!isAdmin(user))redirect("/admin/login");
  return <main id="main" className="wrap narrow"><div className="backup-card"><span className="eyebrow">KEEP YOUR WORDS</span><h1>给小窝留一份备份。</h1><p>下载全部文章（包括草稿与回收站）、图片和小窝设置，保存在自己的电脑里。</p><p>备份不含登录密码及历史版本。导出时请先暂停编辑，等下载完成后再继续写作。</p><Backup/><Link href="/admin">← 返回管理后台</Link></div></main>;
}
