"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Copy, Check, Ban, ArrowRight, Building2, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Invite {
  id: string;
  token: string;
  role: "owner" | "admin" | "member";
  is_revoked: boolean;
  expires_at: string | null;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  organization_invites: Invite[];
}

function slugify(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `org-${Date.now()}`;
}

export function AdminDashboard({
  initialOrganizations,
  memberOrganizationIds,
  isSuperAdmin,
}: {
  initialOrganizations: Organization[];
  memberOrganizationIds: string[];
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [newOrgName, setNewOrgName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [connectingOrgId, setConnectingOrgId] = useState<string | null>(null);

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("create_organization_as_admin", {
      org_name: newOrgName,
      org_slug: slugify(newOrgName),
    });
    setCreating(false);
    if (error) {
      setError(error.message);
      return;
    }
    setNewOrgName("");
    router.refresh();
  }

  async function copyLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken((current) => (current === token ? null : current)), 2000);
  }

  async function handleCreateInvite(orgId: string) {
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_invite", { target_org_id: orgId });
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
    const token = data?.[0]?.invite_token;
    if (token) {
      await copyLink(token);
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    const supabase = createClient();
    await supabase.from("organization_invites").update({ is_revoked: true }).eq("id", inviteId);
    router.refresh();
  }

  async function openWorkspace(org: Organization) {
    if (isSuperAdmin || memberOrganizationIds.includes(org.id)) {
      router.push("/");
      return;
    }

    const activeInvite = org.organization_invites.find((invite) => {
      const expired = invite.expires_at ? new Date(invite.expires_at) <= new Date() : false;
      return !invite.is_revoked && !expired;
    });
    if (!activeInvite) {
      setError("활성 초대 링크를 먼저 만들어 주세요.");
      return;
    }

    setConnectingOrgId(org.id);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("accept_invite", { invite_token: activeInvite.token });
    setConnectingOrgId(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold text-slate-900">마스터 관리자</h1>
      <p className="mt-1 text-sm text-slate-500">회사를 만들고, 초대 링크 또는 작업 공간 연결로 운영을 시작하세요.</p>

      <form onSubmit={handleCreateOrg} className="mt-8 flex gap-2">
        <input
          value={newOrgName}
          onChange={(e) => setNewOrgName(e.target.value)}
          placeholder="회사 이름 (예: 위즈덤앤코)"
          required
          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <button
          type="submit"
          disabled={creating}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {creating ? "생성 중..." : "회사 만들기"}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-10 space-y-4">
        {initialOrganizations.length === 0 && (
          <p className="text-sm text-slate-400">아직 등록된 회사가 없습니다.</p>
        )}
        {initialOrganizations.map((org) => (
          <div key={org.id} className="rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-semibold text-slate-900">{org.name}</h2>
                  <p className="text-xs text-slate-400">{org.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCreateInvite(org.id)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  초대 링크 만들기
                </button>
                <button
                  onClick={() => openWorkspace(org)}
                  disabled={connectingOrgId === org.id}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  {connectingOrgId === org.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  {isSuperAdmin || memberOrganizationIds.includes(org.id) ? "작업 공간 열기" : "내 계정 연결"}
                </button>
              </div>
            </div>

            {org.organization_invites.length > 0 && (
              <ul className="mt-4 space-y-2">
                {org.organization_invites.map((invite) => {
                  const expired = invite.expires_at ? new Date(invite.expires_at) <= new Date() : false;
                  const status = invite.is_revoked ? "취소됨" : expired ? "만료됨" : "활성";
                  return (
                    <li
                      key={invite.id}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={
                            "rounded-full px-2 py-0.5 text-xs font-medium " +
                            (status === "활성"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-500")
                          }
                        >
                          {status}
                        </span>
                        <span className="truncate text-slate-500">{invite.role}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => copyLink(invite.token)}
                          className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-white"
                        >
                          {copiedToken === invite.token ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copiedToken === invite.token ? "복사됨" : "링크 복사"}
                        </button>
                        {!invite.is_revoked && (
                          <button
                            onClick={() => handleRevokeInvite(invite.id)}
                            className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-red-600 transition-colors hover:bg-red-50"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            취소
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
