"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { approveAccessRequestWithNewOrg } from "@/app/(app)/admin/actions";
import { adminButtonClass, adminInputClass, adminTableClass } from "@/components/admin/ui";

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
      <h2 className="text-lg font-bold text-slate-900">
        가입 신청 대기
        <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
          {initialAccessRequests.length}
        </span>
      </h2>
      <p className="mt-1 text-xs text-slate-400">
        확인된 사용자는 회사를 선택해 승인하고, 확인되지 않은 사용자는 거절하세요.
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className={`${adminTableClass.wrapper} border-amber-200`}>
        <table className={adminTableClass.table}>
          <thead>
            <tr className="bg-amber-50">
              <th className={adminTableClass.headCell}>이메일</th>
              <th className={adminTableClass.headCell}>신청 회사</th>
              <th className={adminTableClass.headCell}>신청일</th>
              <th className={adminTableClass.headCell}>연결할 회사</th>
              <th className={adminTableClass.headCell}>승인 / 거절</th>
            </tr>
          </thead>
          <tbody>
            {initialAccessRequests.map((request) => {
              const selection = selectedOrgByRequest[request.request_id] ?? "";
              const busy = reviewingRequestId === request.request_id;
              return (
                <tr key={request.request_id} className={adminTableClass.row}>
                  <td className={`${adminTableClass.cell} font-semibold text-slate-900`}>{request.user_email}</td>
                  <td className={adminTableClass.cell}>{request.requested_organization_name}</td>
                  <td className={`${adminTableClass.cell} text-slate-500`}>
                    {new Date(request.created_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className={adminTableClass.cell}>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={selection}
                        onChange={(e) =>
                          setSelectedOrgByRequest((current) => ({ ...current, [request.request_id]: e.target.value }))
                        }
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
                          onChange={(e) =>
                            setNewOrgNameByRequest((current) => ({ ...current, [request.request_id]: e.target.value }))
                          }
                          placeholder="새 회사 이름"
                          className={`${adminInputClass} w-40 py-1.5`}
                        />
                      )}
                    </div>
                  </td>
                  <td className={adminTableClass.cell}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveRequest(request)}
                        disabled={busy}
                        className={`flex items-center gap-1 ${adminButtonClass.primary}`}
                      >
                        <UserCheck className="h-3.5 w-3.5" />승인
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.request_id)}
                        disabled={busy}
                        className={`flex items-center gap-1 ${adminButtonClass.danger}`}
                      >
                        <UserX className="h-3.5 w-3.5" />거절
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
