"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/domains/platform/tenancy/active-organization";
import { getActiveMembership } from "@/domains/platform/tenancy/active-organization";
import { inviteMemberSchema } from "./membership.schema";
import { inviteMember } from "./membership.service";

export type InviteMemberActionState = {
  error: string | null;
  inviteLink?: string;
};

export async function inviteMemberAction(
  _prevState: InviteMemberActionState,
  formData: FormData,
): Promise<InviteMemberActionState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to invite members." };
  }

  const parsed = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    roleId: formData.get("roleId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  try {
    const { token } = await inviteMember(membership, parsed.data);
    revalidatePath("/dashboard/members");
    return {
      error: null,
      inviteLink: `${process.env.APP_URL}/invitations/${token}`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }
}
