"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { approveAccessRequestWithNewOrg } from "@/app/(app)/admin/actions";
import { adminButtonClass, adminCardClass, adminInputClass, adminSectionTitleClass } from "@/components/admin/ui";

const NEW_ORG_VALUE = "__new__";

interface AccessRequest {
  request_id: string;
  user_email: string;
  requested_organization_name: string;
  requested_role: "owner" | "admin" | "member";
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
}

export function AccessRequestsPanel({
  initialAccessRequests,
  organizations,
}: {
  initialAccessRequests: AccessRequest[];
  organizations: Organization[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [selectedOrgByRequest, setSelectedOrgByRequest] = useState<Record<string, string>>({});
  const [newOrgNameByRequest, setNewOrgNameByRequest] = useState<Record<string, string>>({});
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);

  if (initialAccessRequests.length === 0) return null;

  async function handleApproveRequest(request: AccessRequest) {
    const selection = selectedOrgByRequest[request.request_id];
    if (!selection) {
      setError("연결할 회사를 먼저 선택해 주세요.");
      return;
    }
    setError(null);
    setReviewingRequestId(request.request_id);

    if (selection === NEW_ORG_VALUE) {
      const companyName = newOrgNameByRequest[request.request_id] ?? request.requested_organization_name;
      const result = await approveAccessRequestWithNewOrg(request.request_id, companyName);
      setReviewingRequestId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.rpc("approve_access_request", { request_id: request.request_id, target_org_id: selection });
    setReviewingRequestId(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function handleRejectRequest(requestId: string) {
    setError(null);
    setReviewingRequestId(requestId);
    const supabase = createClient();
    const { error } = await supabase.rpc("reject_access_request", { request_id: requestId });
    setReviewingRequestId(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <h2 className={adminSectionTitleClass}>가입 신청 ({initialAccessRequests.length})</h2>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 space-y-3">
        {initialAccessRequests.map((request) => {
          const selection = selectedOrgByRequest[request.request_id] ?? "";
          return (
            <div key={request.request_id} className={`${adminCardClass} border-amber-200 bg-amber-50`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{request.user_email}</p>
                  <p className="text-xs text-slate-500">신청 회사: {request.requested_organization_name} · {new Date(request.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selection}
                    onChange={(e) => setSelectedOrgByRequest((current) => ({ ...current, [request.request_id]: e.target.value }))}
                    className={adminButtonClass.select}
                  >
                    <option value="">연결할 회사 선택</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                    <option value={NEW_ORG_VALUE}>+ 새 회사 만들기</option>
                  </select>
                  {selection === NEW_ORG_VALUE && (
                    <input
                      value={newOrgNameByRequest[request.request_id] ?? request.requested_organization_name}
                      onChange={(e) => setNewOrgNameByRequest((current) => ({ ...current, [request.request_id]: e.target.value }))}
                      placeholder="새 회사 이름"
                      className={`${adminInputClass} w-40 py-1.5`}
                    />
                  )}
                  <button
                    onClick={() => handleApproveRequest(request)}
                    disabled={reviewingRequestId === request.request_id}
                    className={`flex items-center gap-1 ${adminButtonClass.primary}`}
                  >
                    <UserCheck className="h-3.5 w-3.5" />승인
                  </button>
                  <button
                    onClick={() => handleRejectRequest(request.request_id)}
                    disabled={reviewingRequestId === request.request_id}
                    className={`flex items-center gap-1 ${adminButtonClass.danger}`}
                  >
                    <UserX className="h-3.5 w-3.5" />거절
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
