"use client";
import UnifiedLogin from "./UnifiedLogin";
export default function WriterLogin({ onSuccess }: { onSuccess?: () => void }) {
  return <UnifiedLogin onSuccess={onSuccess} expectedKind="admin" />;
}
