"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthInput } from "@/components/auth/auth-input";

export function InviteAcceptForm({
  token,
  organizationName,
}: {
  token: string;
  organizationName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/invite/${token}/finish`,
      },
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      const { error: acceptError } = await supabase.rpc("accept_invite", { invite_token: token });
      if (acceptError) {
        setError(acceptError.message);
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell>
        <div className="space-y-3 text-center">
          <h2 className="text-2xl font-bold text-slate-900">가입 확인 메일을 보냈습니다</h2>
          <p className="text-sm text-slate-500">
            {email}로 전송된 링크를 누르면 {organizationName}에 자동으로 연결됩니다.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="space-y-1 text-center">
        <h2 className="text-2xl font-bold text-slate-900">{organizationName}에 합류하기</h2>
        <p className="text-sm text-slate-500">초대받은 계정을 만들어주세요</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <AuthInput
          label="이름"
          icon={User}
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="홍길동"
        />
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8자 이상"
        />
        <AuthInput
          label="비밀번호 확인"
          icon={Lock}
          type="password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "가입 중..." : "가입하고 합류하기"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        이미 계정이 있으신가요?{" "}
        <Link href={`/login?invite=${token}`} className="font-medium text-blue-600 hover:underline">
          로그인
        </Link>
      </p>
    </AuthShell>
  );
}
