"use server";

import { cookies } from "next/headers";

export async function setActiveOrganization(organizationId: string | null) {
  const cookieStore = await cookies();
  if (organizationId) {
    cookieStore.set("active_org_id", organizationId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  } else {
    cookieStore.delete("active_org_id");
  }
}
