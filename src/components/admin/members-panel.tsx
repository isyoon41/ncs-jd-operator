"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle, Pause, Play, ShieldBan, ShieldCheck, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  changeUserOrganization,
  deleteUserAccount,
  reactivateUserAccount,
  setMembershipStatus,
  suspendUserAccount,
} from "@/app/(app)/admin/actions";
import { adminButtonClass, adminCardClass, adminSectionTitleClass } from "@/components/admin/ui";

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

interface Organization {
  id: string;
  name: string;
}

function isBanned(bannedUntil: string | null) {
  return Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now());
}

export function MembersPanel({
  users,
  memberships,
  organizations,
  currentUserId,
}: {
  users: AuthUser[];
  memberships: Membership[];
  organizations: Organization[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [resetSentFor, setResetSentFor] = useState<string | null>(null);
  const [changingUserId, setChangingUserId] = useState<string | null>(null);
  const [selectedOrgForChange, setSelectedOrgForChange] = useState("");

  const membershipByUser = useMemo(() => {
    const map = new Map<string, Membership>();
    memberships.forEach((membership) => map.set(membership.user_id, membership));
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

  async function handleConfirmChange(userId: string) {
    setError(null);
    setPendingUserId(userId);
    const result = await changeUserOrganization(userId, selectedOrgForChange || null);
    setPendingUserId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setChangingUserId(null);
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
    <div>
      <h2 className={adminSectionTitleClass}>전체 회원 ({users.length})</h2>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 space-y-3">
        {users.map((user) => {
          const membership = membershipByUser.get(user.id) ?? null;
          const banned = isBanned(user.banned_until);
          const isSelf = user.id === currentUserId;
          const isChanging = changingUserId === user.id;
          return (
            <div key={user.id} className={adminCardClass}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{user.email}</p>
                    {!user.email_confirmed_at && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">이메일 미확인</span>}
                    {banned && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">정지됨</span>}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">가입일 {new Date(user.created_at).toLocaleDateString("ko-KR")}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {membership ? (
                      <>
                        <span className="text-xs text-slate-600">
                          소속 <span className="font-semibold">{membership.organization_name}</span> · {membership.role} · {membership.status === "active" ? "정상" : "보류중"}
                        </span>
                        <button
                          onClick={() => handleToggleMembership(membership)}
                          disabled={pendingMemberId === membership.member_id}
                          className={`flex items-center gap-1 ${membership.status === "active" ? adminButtonClass.warning : adminButtonClass.success}`}
                        >
                          {membership.status === "active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          {membership.status === "active" ? "보류" : "재개"}
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">소속 회사 없음</span>
                    )}
                    {!isChanging && (
                      <button
                        onClick={() => { setChangingUserId(user.id); setSelectedOrgForChange(membership?.organization_id ?? ""); }}
                        className={adminButtonClass.secondary}
                      >
                        {membership ? "회사 변경" : "회사 연결하기"}
                      </button>
                    )}
                  </div>

                  {isChanging && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <select
                        value={selectedOrgForChange}
                        onChange={(e) => setSelectedOrgForChange(e.target.value)}
                        className={adminButtonClass.select}
                      >
                        <option value="">연결 해제(소속 없음)</option>
                        {organizations.map((org) => (
                          <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleConfirmChange(user.id)}
                        disabled={pendingUserId === user.id}
                        className={adminButtonClass.primary}
                      >
                        확인
                      </button>
                      <button onClick={() => setChangingUserId(null)} className={adminButtonClass.secondary}>
                        취소
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handlePasswordReset(user.email)}
                    className={`flex items-center gap-1 ${adminButtonClass.secondary}`}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    {resetSentFor === user.email ? "메일 발송됨" : "비밀번호 초기화"}
                  </button>
                  <button
                    onClick={() => handleToggleSuspend(user)}
                    disabled={pendingUserId === user.id || isSelf}
                    className={`flex items-center gap-1 ${banned ? adminButtonClass.success : adminButtonClass.warning}`}
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
                        className={adminButtonClass.dangerFilled}
                      >
                        영구 삭제
                      </button>
                      <button
                        onClick={() => { setDeleteConfirmId(null); setDeleteConfirmText(""); }}
                        className={adminButtonClass.secondary}
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(user.id)}
                      disabled={isSelf}
                      className={`flex items-center gap-1 ${adminButtonClass.danger}`}
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
