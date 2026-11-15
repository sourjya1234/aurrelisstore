"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  FOLLOWUP_CHANNELS,
  isPipelineKind,
  isUuid,
  LEAD_STATUSES,
  logFollowup,
  OUTREACH_TAG,
  updateLead,
  type LeadStatus,
} from "@/lib/dashboard/outreach";
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

/* ------------------------------ Lead edits ------------------------------ */

export type EditState = { ok?: boolean; error?: string; savedAt?: number };

const text = (f: FormData, k: string, max: number) => {
  const v = String(f.get(k) ?? "").trim();
  return v ? v.slice(0, max) : null;
};

function leadTarget(f: FormData) {
  const kind = f.get("kind");
  const id = f.get("id");
  if (!isPipelineKind(kind) || !isUuid(id)) throw new Error("Unknown lead.");
  return { kind, id };
}

function parseStatus(v: string | null): LeadStatus | null {
  if (!v) return null;
  const s = LEAD_STATUSES.find((x) => x === v);
  if (!s) throw new Error("Pick a valid status.");
  return s;
}

export async function saveLead(_prev: EditState, f: FormData): Promise<EditState> {
  const user = await requireDashboardUser();
  try {
    const { kind, id } = leadTarget(f);
    const status = parseStatus(text(f, "status", 60));
    if (!status) return { error: "Pick a status." };
    await updateLead(
      kind,
      id,
      { status, statusDetail: text(f, "statusDetail", 200), remark: text(f, "remark", 2000), spoc: text(f, "spoc", 120) },
      user.email,
    );
  } catch (err) {
    console.error("saveLead failed", err);
    return { error: err instanceof Error && !err.message.startsWith("Supabase") ? err.message : "Couldn't save. Try again." };
  }
  updateTag(OUTREACH_TAG);
  return { ok: true, savedAt: Date.now() };
}

export async function addFollowup(_prev: EditState, f: FormData): Promise<EditState> {
  const user = await requireDashboardUser();
  try {
    const { kind, id } = leadTarget(f);
    const note = text(f, "note", 2000);
    if (!note) return { error: "Write a short note about the follow-up." };
    const channel = text(f, "channel", 20) ?? "email";
    if (!(FOLLOWUP_CHANNELS as readonly string[]).includes(channel)) return { error: "Pick a channel." };
    const next = text(f, "nextFollowup", 10);
    if (next && !/^\d{4}-\d{2}-\d{2}$/.test(next)) return { error: "Next follow-up must be a date." };
    await logFollowup(kind, id, { channel, note, nextFollowup: next, statusAfter: parseStatus(text(f, "statusAfter", 60)) }, user.email);
  } catch (err) {
    console.error("addFollowup failed", err);
    return { error: err instanceof Error && !err.message.startsWith("Supabase") ? err.message : "Couldn't save. Try again." };
  }
  updateTag(OUTREACH_TAG);
  return { ok: true, savedAt: Date.now() };
}
