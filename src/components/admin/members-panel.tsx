"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle, Pause, Play, ShieldBan, ShieldCheck, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  deleteUserAccount,
  reactivateUserAccount,
  setMembershipStatus,
  suspendUserAccount,
} from "@/app/(app)/admin/actions";

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string | null;
  banned_until: string | null;
}

interface Membership {
  member_id: string;
  user_id: string;
  user_email: string;
  organization_id: string;
  organization_name: string;
  role: "owner" | "admin" | "member";
  status: string;
  created_at: string;
}

function isBanned(bannedUntil: string | null) {
  return Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now());
}

export function MembersPanel({
  users,
  memberships,
  currentUserId,
}: {
  users: AuthUser[];
  memberships: Membership[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [resetSentFor, setResetSentFor] = useState<string | null>(null);

  const membershipsByUser = useMemo(() => {
    const map = new Map<string, Membership[]>();
    memberships.forEach((membership) => {
      const list = map.get(membership.user_id) ?? [];
      list.push(membership);
      map.set(membership.user_id, list);
    });
    return map;
  }, [memberships]);

  async function handleToggleMembership(membership: Membership) {
    setError(null);
    setPendingMemberId(membership.member_id);
    const nextStatus = membership.status === "active" ? "held" : "active";
    const result = await setMembershipStatus(membership.member_id, nextStatus);
    setPendingMemberId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleToggleSuspend(user: AuthUser) {
    setError(null);
    setPendingUserId(user.id);
    const result = isBanned(user.banned_until)
      ? await reactivateUserAccount(user.id)
      : await suspendUserAccount(user.id);
    setPendingUserId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleDelete(user: AuthUser) {
    if (deleteConfirmText !== user.email) return;
    setError(null);
    setPendingUserId(user.id);
    const result = await deleteUserAccount(user.id);
    setPendingUserId(null);
    setDeleteConfirmId(null);
    setDeleteConfirmText("");
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handlePasswordReset(email: string) {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setResetSentFor(email);
    setTimeout(() => setResetSentFor((current) => (current === email ? null : current)), 3000);
  }

  return (
    <div className="mt-10">
      <h2 className="text-sm font-bold text-slate-700">전체 회원 ({users.length})</h2>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 space-y-3">
        {users.map((user) => {
          const userMemberships = membershipsByUser.get(user.id) ?? [];
          const banned = isBanned(user.banned_until);
          const isSelf = user.id === currentUserId;
          return (
            <div key={user.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{user.email}</p>
                    {!user.email_confirmed_at && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">이메일 미확인</span>}
                    {banned && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">정지됨</span>}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">가입일 {new Date(user.created_at).toLocaleDateString("ko-KR")}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {userMemberships.length === 0 && <span className="text-xs text-slate-400">소속 회사 없음</span>}
                    {userMemberships.map((membership) => (
                      <button
                        key={membership.member_id}
                        onClick={() => handleToggleMembership(membership)}
                        disabled={pendingMemberId === membership.member_id}
                        title={membership.status === "active" ? "클릭하면 이 회사 접근을 보류합니다" : "클릭하면 접근을 재개합니다"}
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-60 ${
                          membership.status === "active"
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        }`}
                      >
                        {membership.status === "active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        {membership.organization_name} · {membership.role} · {membership.status === "active" ? "정상" : "보류중"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handlePasswordReset(user.email)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    {resetSentFor === user.email ? "메일 발송됨" : "비밀번호 초기화"}
                  </button>
                  <button
                    onClick={() => handleToggleSuspend(user)}
                    disabled={pendingUserId === user.id || isSelf}
                    className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:opacity-60 ${
                      banned ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-amber-200 text-amber-700 hover:bg-amber-50"
                    }`}
                  >
                    {pendingUserId === user.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : banned ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldBan className="h-3.5 w-3.5" />}
                    {banned ? "정지 해제" : "정지"}
                  </button>
                  {deleteConfirmId === user.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={user.email}
                        className="w-40 rounded-lg border border-red-200 px-2 py-1.5 text-xs text-slate-700"
                      />
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={deleteConfirmText !== user.email || pendingUserId === user.id}
                        className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                      >
                        영구 삭제
                      </button>
                      <button
                        onClick={() => { setDeleteConfirmId(null); setDeleteConfirmText(""); }}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(user.id)}
                      disabled={isSelf}
                      className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />삭제
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
