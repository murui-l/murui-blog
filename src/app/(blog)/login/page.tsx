import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cms } from "@/lib/db";
import { isAdmin, isMember } from "@/lib/access";
import UnifiedLogin from "@/components/writing/UnifiedLogin";
import "@/components/writing/Writing.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "登录小窝", robots: { index: false, follow: false } };
export default async function Login() {
  const { user } = await (await cms()).auth({ headers: await headers() });
  if (isAdmin(user)) redirect("/write");
  if (isMember(user)) redirect("/my-notes");
  return <main id="main" className="wrap writing-page"><UnifiedLogin /></main>;
}
