import { getPublicPosts } from "@/lib/db";
import LifeNotes from "@/components/LifeNotes";

export const metadata = { title: "沐瑞の生活随笔", description: "记一顿好吃的饭，一场偶遇的晚霞，也记今天的自己。" };

export default async function Notes() {
  return <main id="main" className="wrap"><LifeNotes posts={await getPublicPosts()} standalone /></main>;
}
