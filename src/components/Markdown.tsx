/* eslint-disable @next/next/no-img-element */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
export default function Markdown({ children }: { children: string }) {
  return <div className="prose"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
    a: ({ href, children }) => <a href={href} target={href?.startsWith("https://") ? "_blank" : undefined} rel="noopener noreferrer">{children}</a>,
    img: ({ src, alt }) => <img src={typeof src === "string" ? src : undefined} alt={alt || "文章配图"} loading="lazy" />,
  }}>{children}</ReactMarkdown></div>;
}
