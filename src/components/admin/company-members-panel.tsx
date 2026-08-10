"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  Copy,
  KeyRound,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  ShieldBan,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  changeUserOrganization,
  deleteUserAccount,
  reactivateUserAccount,
  setMembershipRole,
  setMembershipStatus,
  suspendUserAccount,
} from "@/app/(app)/admin/actions";
import { adminButtonClass, adminInputClass, adminTableClass } from "@/components/admin/ui";

interface AuthUser {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  email_confirmed_at: string | null;
  banned_until: string | null;
}

interface Membership {
  member_id: string;
  user_id: string;
  organization_id: string;
  organization_name: string;
  role: "owner" | "admin" | "member";
  status: string;
}

interface Organization {
  id: string;
  name: string;
}

const roleLabel: Record<Membership["role"], string> = {
  owner: "소유자",
  admin: "관리자",
  member: "일반",
};

function isBanned(bannedUntil: string | null) {
  return Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now());
}

function slugify(name: string) {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || `org-${Date.now()}`;
}

export function CompanyMembersPanel({
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
  const [copiedOrgId, setCopiedOrgId] = useState<string | null>(null);
  const [resetSentFor, setResetSentFor] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [showNewOrgForm, setShowNewOrgForm] = useState(false);

  const membershipByUser = useMemo(() => {
    const map = new Map<string, Membership>();
    memberships.forEach((membership) => map.set(membership.user_id, membership));
    return map;
  }, [memberships]);

  const usersByOrg = useMemo(() => {
    const map = new Map<string, AuthUser[]>();
    organizations.forEach((organization) => map.set(organization.id, []));
    users.forEach((user) => {
      const membership = membershipByUser.get(user.id);
      if (!membership) return;
      map.get(membership.organization_id)?.push(user);
    });
    return map;
  }, [users, organizations, membershipByUser]);

  const unassignedUsers = useMemo(
    () => users.filter((user) => !membershipByUser.has(user.id)),
    [users, membershipByUser],
  );

  async function run(userId: string, task: () => Promise<{ error: string | null }>) {
    setError(null);
    setPendingUserId(userId);
    const result = await task();
    setPendingUserId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleCreateOrg(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setCreatingOrg(true);
    const supabase = createClient();
    const { error: createError } = await supabase.rpc("create_organization_as_admin", {
      org_name: newOrgName,
      org_slug: slugify(newOrgName),
    });
    setCreatingOrg(false);
    if (createError) {
      setError(createError.message);
      return;
    }
    setNewOrgName("");
    setShowNewOrgForm(false);
    router.refresh();
  }

  async function handleCopyInvite(organizationId: string) {
    setError(null);
    const supabase = createClient();
    const { data, error: inviteError } = await supabase.rpc("create_invite", { target_org_id: organizationId });
    if (inviteError) {
      setError(inviteError.message);
      return;
    }
    const token = data?.[0]?.invite_token;
    if (!token) {
      setError("초대 링크를 만들지 못했습니다.");
      return;
    }
    await navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
    setCopiedOrgId(organizationId);
    setTimeout(() => setCopiedOrgId((current) => (current === organizationId ? null : current)), 2500);
  }

  async function handlePasswordReset(email: string) {
    setError(null);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setResetSentFor(email);
    setTimeout(() => setResetSentFor((current) => (current === email ? null : current)), 2500);
  }

  function renderRows(rows: AuthUser[], emptyText: string) {
    if (rows.length === 0) {
      return (
        <tr>
          <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
            {emptyText}
          </td>
        </tr>
      );
    }
    return rows.map((user) => {
      const membership = membershipByUser.get(user.id) ?? null;
      const banned = isBanned(user.banned_until);
      const isSelf = user.id === currentUserId;
      const busy = pendingUserId === user.id;

      return (
        <tr key={user.id} className={adminTableClass.row}>
          <td className={`${adminTableClass.cell} font-semibold text-slate-900`}>
            {user.display_name ?? "—"}
            {!user.email_confirmed_at && (
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                이메일 미확인
              </span>
            )}
            {banned && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">정지됨</span>
            )}
            {membership?.status === "held" && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">접근 보류</span>
            )}
          </td>
          <td className={adminTableClass.cell}>{user.email}</td>
          <td className={adminTableClass.cell}>
            {membership ? (
              <select
                value={membership.role}
                onChange={(event) =>
                  run(user.id, () =>
                    setMembershipRole(membership.member_id, event.target.value as Membership["role"]),
                  )
                }
                disabled={busy}
                className={adminButtonClass.select}
              >
                {(Object.keys(roleLabel) as Membership["role"][]).map((role) => (
                  <option key={role} value={role}>
                    {roleLabel[role]}
                  </option>
                ))}
              </select>
            ) : (
              <select
                defaultValue=""
                onChange={(event) => {
                  if (!event.target.value) return;
                  run(user.id, () => changeUserOrganization(user.id, event.target.value));
                }}
                disabled={busy}
                className={adminButtonClass.select}
              >
                <option value="">회사 연결...</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            )}
          </td>
          <td className={`${adminTableClass.cell} text-slate-500`}>
            {new Date(user.created_at).toLocaleDateString("ko-KR")}
          </td>
          <td className={adminTableClass.cell}>
            {deleteConfirmId === user.id ? (
              <div className="flex items-center gap-1.5">
                <input
                  value={deleteConfirmText}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  placeholder={user.email}
                  className={`${adminInputClass} w-44 py-1.5 text-xs`}
                />
                <button
                  type="button"
                  onClick={() =>
                    run(user.id, async () => {
                      const result = await deleteUserAccount(user.id);
                      setDeleteConfirmId(null);
                      setDeleteConfirmText("");
                      return result;
                    })
                  }
                  disabled={deleteConfirmText !== user.email || busy}
                  className={adminButtonClass.dangerFilled}
                >
                  영구 삭제
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmId(null);
                    setDeleteConfirmText("");
                  }}
                  className={adminButtonClass.secondary}
                >
                  취소
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {membership && (
                  <button
                    type="button"
                    title={membership.status === "active" ? "접근 보류" : "접근 재개"}
                    onClick={() =>
                      run(user.id, () =>
                        setMembershipStatus(membership.member_id, membership.status === "active" ? "held" : "active"),
                      )
                    }
                    disabled={busy}
                    className={adminTableClass.iconButton}
                  >
                    {membership.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                )}
                <button
                  type="button"
                  title={resetSentFor === user.email ? "메일 발송됨" : "비밀번호 초기화 메일 보내기"}
                  onClick={() => handlePasswordReset(user.email)}
                  className={adminTableClass.iconButton}
                >
                  {resetSentFor === user.email ? <Check className="h-4 w-4 text-emerald-600" /> : <KeyRound className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  title={banned ? "계정 정지 해제" : "계정 정지"}
                  onClick={() => run(user.id, () => (banned ? reactivateUserAccount(user.id) : suspendUserAccount(user.id)))}
                  disabled={busy || isSelf}
                  className={adminTableClass.iconButton}
                >
                  {busy ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : banned ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : (
                    <ShieldBan className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  title="계정 영구 삭제"
                  onClick={() => setDeleteConfirmId(user.id)}
                  disabled={isSelf}
                  className={adminTableClass.iconButtonDanger}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </td>
        </tr>
      );
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">회사별 사용자</h2>
        <button
          type="button"
          onClick={() => setShowNewOrgForm((current) => !current)}
          className={`inline-flex items-center gap-1.5 ${adminButtonClass.primary}`}
        >
          <Plus className="h-4 w-4" />회사 만들기
        </button>
      </div>

      {showNewOrgForm && (
        <form onSubmit={handleCreateOrg} className="mt-3 flex flex-wrap gap-2">
          <input
            value={newOrgName}
            onChange={(event) => setNewOrgName(event.target.value)}
            placeholder="회사 이름 (예: 위즈덤앤코)"
            required
            className={`flex-1 ${adminInputClass}`}
          />
          <button type="submit" disabled={creatingOrg} className={adminButtonClass.primary}>
            {creatingOrg ? "생성 중..." : "만들기"}
          </button>
          <button type="button" onClick={() => setShowNewOrgForm(false)} className={adminButtonClass.secondary}>
            취소
          </button>
        </form>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-5 space-y-8">
        {organizations.length === 0 && (
          <p className="text-sm text-slate-400">아직 등록된 회사가 없습니다. 먼저 회사를 만들어 주세요.</p>
        )}

        {organizations.map((organization) => {
          const rows = usersByOrg.get(organization.id) ?? [];
          return (
            <div key={organization.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
                    <Building2 className="h-4 w-4" />
                  </span>
                  {organization.name}
                  <span className="text-xs font-medium text-slate-400">{rows.length}명</span>
                </h3>
                <button
                  type="button"
                  onClick={() => handleCopyInvite(organization.id)}
                  className={`inline-flex items-center gap-1.5 ${adminButtonClass.secondary}`}
                >
                  {copiedOrgId === organization.id ? <Copy className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  {copiedOrgId === organization.id ? "초대 링크 복사됨" : "사용자 추가"}
                </button>
              </div>

              <div className={adminTableClass.wrapper}>
                <table className={adminTableClass.table}>
                  <thead>
                    <tr>
                      <th className={adminTableClass.headCell}>이름</th>
                      <th className={adminTableClass.headCell}>이메일</th>
                      <th className={adminTableClass.headCell}>역할</th>
                      <th className={adminTableClass.headCell}>등록일</th>
                      <th className={adminTableClass.headCell}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderRows(rows, "이 회사에 연결된 사용자가 없습니다. “사용자 추가”로 초대 링크를 보내세요.")}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {unassignedUsers.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-700">
              소속 회사 없음
              <span className="ml-2 text-xs font-medium text-slate-400">{unassignedUsers.length}명</span>
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              가입은 했지만 아직 회사에 연결되지 않은 사용자입니다. 역할 칸에서 회사를 선택하면 연결됩니다.
            </p>
            <div className={adminTableClass.wrapper}>
              <table className={adminTableClass.table}>
                <thead>
                  <tr>
                    <th className={adminTableClass.headCell}>이름</th>
                    <th className={adminTableClass.headCell}>이메일</th>
                    <th className={adminTableClass.headCell}>회사 연결</th>
                    <th className={adminTableClass.headCell}>가입일</th>
                    <th className={adminTableClass.headCell}>관리</th>
                  </tr>
                </thead>
                <tbody>{renderRows(unassignedUsers, "")}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
