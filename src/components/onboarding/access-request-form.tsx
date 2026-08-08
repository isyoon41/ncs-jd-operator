"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AccessRequestForm() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;
    setError(null);
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("request_organization_access", { company_name: companyName });
    setPending(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        placeholder="회사명 (예: 위즈덤앤코)"
        required
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-blue-400"
      />
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-60"
      >
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {pending ? "신청 중…" : "가입 신청하기"}
        {!pending && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}
