"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthInput } from "@/components/auth/auth-input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    if (inviteToken) {
      const { error: acceptError } = await supabase.rpc("accept_invite", {
        invite_token: inviteToken,
      });
      setLoading(false);
      if (acceptError) {
        setError(acceptError.message);
        return;
      }
    } else {
      setLoading(false);
    }

    router.push("/");
    router.refresh();
  }

  async function handleMagicLink() {
    if (!email) {
      setError("이메일을 입력해주세요.");
      return;
    }
    setError(null);
    setMagicLoading(true);
    const supabase = createClient();
    const next = inviteToken ? `/invite/${inviteToken}/finish` : "/";
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    });
    setMagicLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMagicSent(true);
  }

  return (
    <AuthShell>
      <div className="space-y-1 text-center">
        <h2 className="text-2xl font-bold text-slate-900">직무기술서 생성기</h2>
        <p className="text-sm text-slate-500">NCS 기반 근거형 JD 플랫폼</p>
      </div>

      <form onSubmit={handleLogin} className="mt-8 space-y-4">
        <AuthInput
          label="이메일"
          icon={Mail}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
        <AuthInput
          label="비밀번호"
          icon={Lock}
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-400">또는</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        type="button"
        onClick={handleMagicLink}
        disabled={magicLoading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
      >
        <Mail className="h-4 w-4" />
        {magicLoading ? "전송 중..." : magicSent ? "메일을 확인해주세요" : "매직 링크로 로그인"}
      </button>

      <p className="mt-6 text-center text-sm text-slate-500">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="font-medium text-blue-600 hover:underline">
          회원가입
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
