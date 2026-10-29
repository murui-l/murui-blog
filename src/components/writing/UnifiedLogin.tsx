"use client";
import { useState } from "react";
import { writingRequest } from "@/lib/writing";
export default function UnifiedLogin({ onSuccess, expectedKind }: { onSuccess?: () => void; expectedKind?: "admin" | "member" }) {
  const [register, setRegister] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <form className="writer-login" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    const credentials = { username: String(data.get("username")), password: String(data.get("password")) };
    try {
      if (register) {
        if (credentials.password !== data.get("confirm")) throw new Error("两次输入的密码不一致。");
        await writingRequest("/api/members", { method: "POST", body: JSON.stringify({ ...credentials, name: data.get("name") }) });
        setRegister(false);
      }
      const result = await writingRequest("/api/login", { method: "POST", body: JSON.stringify(credentials) });
      if (onSuccess) {
        if (expectedKind && result.kind !== expectedKind) throw new Error("当前账号不属于这类写作空间，请使用之前的账号重新登录。未保存的文字仍保留在本页。");
        onSuccess();
      } else {
        const current = window.location;
        const sameSpace = (result.kind === "admin" && current.pathname === "/write") || (result.kind === "member" && current.pathname === "/my-notes");
        window.location.assign(sameSpace ? current.pathname + current.search : result.kind === "admin" ? "/write" : "/my-notes");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "操作未成功，请重试。"); }
    finally { setBusy(false); }
  }}>
    <h2>{register ? "给自己留一个小角落" : "登录，开始记录"}</h2>
    {register && <p>注册后，随笔和配图仅你与网站管理员可见，不会出现在公开首页。</p>}
    {register && <label>昵称<input name="name" required maxLength={40} autoComplete="nickname" /></label>}
    <label>账号<input name="username" required maxLength={register ? 32 : 128} minLength={register ? 3 : undefined} pattern={register ? "[a-zA-Z0-9_-]{3,32}" : undefined} autoComplete="username" /></label>
    <label>密码<input name="password" required type="password" minLength={register ? 8 : undefined} autoComplete={register ? "new-password" : "current-password"} /></label>
    {register && <><label>再输一次密码<input name="confirm" required type="password" minLength={8} autoComplete="new-password" /></label><p className="writer-hint">请保存好账号和密码，目前不支持邮件找回密码。</p></>}
    <button className="writer-primary" disabled={busy}>{busy ? "请稍候…" : register ? "注册并进入随笔" : "登录"}</button>
    {error && <p role="alert" className="writer-error">{error}</p>}
    <button type="button" disabled={busy} onClick={() => { setRegister(!register); setError(""); }} style={{ marginTop: 12 }}>{register ? "已有账号，去登录" : "第一次来？注册账号"}</button>
  </form>;
}
