"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Mail, Lock, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthInput } from "@/components/auth/auth-input";

const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "naver.com",
  "daum.net",
  "hanmail.net",
  "kakao.com",
  "nate.com",
  "yahoo.com",
  "yahoo.co.kr",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "msn.com",
]);

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSignup(e: React.FormEvent) {
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
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain && PERSONAL_EMAIL_DOMAINS.has(domain)) {
      setError("개인 이메일이 아닌 회사 이메일로 가입해 주세요.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/signup/finish?company=${encodeURIComponent(companyName)}`)}`,
      },
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      const { error: requestError } = await supabase.rpc("request_organization_access", { company_name: companyName });
      if (requestError) {
        setError(requestError.message);
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
            {email}로 전송된 링크를 눌러 가입을 완료해주세요.
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
            로그인으로 돌아가기
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="space-y-1 text-center">
        <h2 className="text-2xl font-bold text-slate-900">회원가입</h2>
        <p className="text-sm text-slate-500">NCS 기반 근거형 JD 플랫폼</p>
      </div>

      <form onSubmit={handleSignup} className="mt-8 space-y-4">
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
          label="회사명"
          icon={Building2}
          type="text"
          required
          autoComplete="organization"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="예: 위즈덤앤코"
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
          {loading ? "가입 중..." : "회원가입"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          로그인
        </Link>
      </p>
    </AuthShell>
  );
}
