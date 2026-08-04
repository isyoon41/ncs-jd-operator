"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/auth-shell";

export default function InviteFinishPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [message, setMessage] = useState("계정을 연결하는 중입니다...");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createClient();
      const { error } = await supabase.rpc("accept_invite", { invite_token: params.token });
      if (cancelled) return;
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      router.replace("/");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [params.token, router]);

  return (
    <AuthShell>
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-slate-900">
          {status === "error" ? "연결에 실패했습니다" : "잠시만 기다려주세요"}
        </h2>
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    </AuthShell>
  );
}
