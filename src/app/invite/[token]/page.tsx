import { createClient } from "@/lib/supabase/server";
import { InviteAcceptForm } from "@/components/auth/invite-accept-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invite_info", { invite_token: token });
  const invite = data?.[0];

  if (error || !invite || !invite.is_valid) {
    return (
      <AuthShell>
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold text-slate-900">유효하지 않은 초대 링크입니다</h2>
          <p className="text-sm text-slate-500">
            링크가 만료되었거나 취소되었습니다. 관리자에게 새 링크를 요청해주세요.
          </p>
        </div>
      </AuthShell>
    );
  }

  return <InviteAcceptForm token={token} organizationName={invite.organization_name} />;
}
