"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { OUTREACH_TAG } from "@/lib/dashboard/outreach";
import { checkPassword, endSession, findCrmUser, requireDashboardUser, startSession } from "@/lib/dashboard/session";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  let allowed = false;
  try {
    // Check the password first so the response doesn't reveal which emails exist.
    allowed = checkPassword(password) && Boolean(await findCrmUser(email));
  } catch (err) {
    console.error("Dashboard login failed", err);
    return { error: "The dashboard isn't configured yet. Check the server environment variables." };
  }
  if (!allowed) return { error: "Wrong email or password, or this account doesn't have CRM access." };

  await startSession(email.toLowerCase());
  redirect("/dashboard");
}

export async function logout() {
  await endSession();
  redirect("/dashboard/login");
}

/** Drops the cached outreach data so the next render reads fresh rows from Supabase. */
export async function refreshOutreach() {
  await requireDashboardUser();
  updateTag(OUTREACH_TAG);
}
