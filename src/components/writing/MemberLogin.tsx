"use client";
import UnifiedLogin from "./UnifiedLogin";
export default function MemberLogin({ onSuccess }: { onSuccess?: () => void }) {
  return <UnifiedLogin onSuccess={onSuccess} expectedKind="member" />;
}
