"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/auth-shell";

function SignupFinishInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyName = searchParams.get("company") ?? "";
  const [status, setStatus] = useState<"working" | "error">("working");
  const [message, setMessage] = useState("가입 신청을 접수하는 중입니다...");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createClient();
      const { error } = await supabase.rpc("request_organization_access", { company_name: companyName });
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
  }, [companyName, router]);

  return (
    <AuthShell>
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-slate-900">
          {status === "error" ? "신청에 실패했습니다" : "잠시만 기다려주세요"}
        </h2>
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    </AuthShell>
  );
}

export default function SignupFinishPage() {
  return (
    <Suspense>
      <SignupFinishInner />
    </Suspense>
  );
}
