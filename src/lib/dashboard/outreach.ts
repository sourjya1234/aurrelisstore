import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { rest, restAll } from "@/lib/supabase-rest";

/**
 * Read models for the outreach dashboard, built from the Aurrelis Ops tables:
 * investor_outreach + investor_followup_log, b2b_outreach + b2b_followup_log,
 * and review_outreach.
 *
 * These tables have no anon policies, so everything here uses the service role.
 * Callers must check the dashboard session first (see requireDashboardUser).
 */

export const OUTREACH_TAG = "outreach";

export type PipelineKind = "investors" | "b2b";

export type Followup = {
  loggedAt: string;
  channel: string | null;
  note: string | null;
  statusAfter: string | null;
  nextFollowup: string | null;
  by: string | null;
};

export type PipelineLead = {
  id: string;
  name: string;
  /** Investor type or B2B segment. */
  group: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  country: string | null;
  spoc: string | null;
  status: string;
  statusDetail: string | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  followupCount: number;
  lastFollowup: Followup | null;
  nextFollowup: string | null;
};

export type Pipeline = {
  kind: PipelineKind;
  leads: PipelineLead[];
  statusCounts: { status: string; count: number }[];
  groupCounts: { group: string; count: number }[];
  followupsByDay: { day: string; count: number }[];
  followupsLast7: number;
  followupsLast30: number;
  dueFollowups: number;
  neverFollowedUp: number;
};

type InvestorRow = {
  id: string;
  name: string;
  investor_type: string | null;
  email: string | null;
  country: string | null;
  spoc_name: string | null;
  status: string;
  status_detail: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
};

type B2BRow = {
  id: string;
  company: string;
  segment: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  spoc_name: string | null;
  status: string;
  status_detail: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
};

type FollowupRow = {
  lead_id: string;
  logged_at: string;
  log_date: string;
  channel: string | null;
  note: string | null;
  status_after: string | null;
  next_followup: string | null;
  by_email: string | null;
};

const FOLLOWUP_COLS = "lead_id,logged_at,log_date,channel,note,status_after,next_followup,by_email";

/** Today's date in India (YYYY-MM-DD), matching the log_date default in the database. */
function istToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function addDays(ymd: string, days: number) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function countBy<T>(items: T[], key: (t: T) => string) {
  const m = new Map<string, number>();
  for (const it of items) m.set(key(it), (m.get(key(it)) ?? 0) + 1);
  return [...m].map(([k, count]) => ({ k, count })).sort((a, b) => b.count - a.count);
}

function buildPipeline(
  kind: PipelineKind,
  base: Omit<PipelineLead, "followupCount" | "lastFollowup" | "nextFollowup">[],
  logs: FollowupRow[],
): Pipeline {
  const today = istToday();
  const byLead = new Map<string, FollowupRow[]>();
  for (const l of logs) {
    const list = byLead.get(l.lead_id) ?? [];
    list.push(l);
    byLead.set(l.lead_id, list);
  }

  const leads: PipelineLead[] = base.map((lead) => {
    const list = (byLead.get(lead.id) ?? []).sort((a, b) => b.logged_at.localeCompare(a.logged_at));
    const last = list[0];
    const next = list.find((l) => l.next_followup)?.next_followup ?? null;
    return {
      ...lead,
      followupCount: list.length,
      lastFollowup: last
        ? {
            loggedAt: last.logged_at,
            channel: last.channel,
            note: last.note,
            statusAfter: last.status_after,
            nextFollowup: last.next_followup,
            by: last.by_email,
          }
        : null,
      nextFollowup: next,
    };
  });

  const from30 = addDays(today, -29);
  const from7 = addDays(today, -6);
  const perDay = new Map<string, number>();
  for (let i = 0; i < 30; i++) perDay.set(addDays(from30, i), 0);
  for (const l of logs) if (perDay.has(l.log_date)) perDay.set(l.log_date, perDay.get(l.log_date)! + 1);

  const closed = (s: string) => /not interested|bounced/i.test(s);

  return {
    kind,
    leads,
    statusCounts: countBy(leads, (l) => l.status).map(({ k, count }) => ({ status: k, count })),
    groupCounts: countBy(leads, (l) => l.group ?? "Unspecified").map(({ k, count }) => ({ group: k, count })),
    followupsByDay: [...perDay].map(([day, count]) => ({ day, count })),
    followupsLast7: logs.filter((l) => l.log_date >= from7).length,
    followupsLast30: logs.filter((l) => l.log_date >= from30).length,
    dueFollowups: leads.filter((l) => l.nextFollowup && l.nextFollowup <= today && !closed(l.status)).length,
    neverFollowedUp: leads.filter((l) => l.followupCount === 0 && !closed(l.status)).length,
  };
}

export async function getInvestorPipeline(): Promise<Pipeline> {
  "use cache";
  cacheLife("minutes");
  cacheTag(OUTREACH_TAG);
  const [rows, logs] = await Promise.all([
    restAll<InvestorRow>(
      "investor_outreach?select=id,name,investor_type,email,country,spoc_name,status,status_detail,remark,created_at,updated_at&order=updated_at.desc,id",
      { serviceRole: true },
    ),
    restAll<FollowupRow>(`investor_followup_log?select=${FOLLOWUP_COLS}&order=logged_at.desc,id`, { serviceRole: true }),
  ]);
  return buildPipeline(
    "investors",
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      group: r.investor_type,
      email: r.email,
      phone: null,
      website: null,
      country: r.country,
      spoc: r.spoc_name,
      status: r.status,
      statusDetail: r.status_detail,
      remark: r.remark,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    logs,
  );
}

export async function getB2BPipeline(): Promise<Pipeline> {
  "use cache";
  cacheLife("minutes");
  cacheTag(OUTREACH_TAG);
  const [rows, logs] = await Promise.all([
    restAll<B2BRow>(
      "b2b_outreach?select=id,company,segment,website,email,phone,country,spoc_name,status,status_detail,remark,created_at,updated_at&order=updated_at.desc,id",
      { serviceRole: true },
    ),
    restAll<FollowupRow>(`b2b_followup_log?select=${FOLLOWUP_COLS}&order=logged_at.desc,id`, { serviceRole: true }),
  ]);
  return buildPipeline(
    "b2b",
    rows.map((r) => ({
      id: r.id,
      name: r.company,
      group: r.segment,
      email: r.email,
      phone: r.phone,
      website: r.website,
      country: r.country,
      spoc: r.spoc_name,
      status: r.status,
      statusDetail: r.status_detail,
      remark: r.remark,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    logs,
  );
}

type ReviewRow = {
  id: string;
  name: string | null;
  company: string | null;
  status: string;
  sent_at: string | null;
  sent_via: string | null;
  sent_by: string | null;
  reminders: number;
  reviewed_at: string | null;
  rating: number | null;
  replied_at: string | null;
  email_bounced: boolean;
};

export type ReviewSummary = {
  total: number;
  statusCounts: { status: string; count: number }[];
  channelCounts: { channel: string; count: number }[];
  sent: number;
  sentLast7: number;
  reviewed: number;
  replied: number;
  bounced: number;
  remindersSent: number;
  averageRating: number | null;
  ratingCounts: { rating: number; count: number }[];
  sentByDay: { day: string; count: number }[];
  recent: {
    id: string;
    name: string | null;
    company: string | null;
    status: string;
    sentAt: string | null;
    sentVia: string | null;
    sentBy: string | null;
    rating: number | null;
  }[];
};

export async function getReviewSummary(): Promise<ReviewSummary> {
  "use cache";
  cacheLife("minutes");
  cacheTag(OUTREACH_TAG);
  const rows = await restAll<ReviewRow>(
    "review_outreach?select=id,name,company,status,sent_at,sent_via,sent_by,reminders,reviewed_at,rating,replied_at,email_bounced&order=created_at.desc,id",
    { serviceRole: true },
  );
  const today = istToday();
  const from30 = addDays(today, -29);
  const from7 = addDays(today, -6);
  const istDay = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(iso));

  const sentRows = rows.filter((r) => r.sent_at);
  const perDay = new Map<string, number>();
  for (let i = 0; i < 30; i++) perDay.set(addDays(from30, i), 0);
  for (const r of sentRows) {
    const d = istDay(r.sent_at!);
    if (perDay.has(d)) perDay.set(d, perDay.get(d)! + 1);
  }
  const rated = rows.filter((r) => r.rating != null);

  return {
    total: rows.length,
    statusCounts: countBy(rows, (r) => r.status).map(({ k, count }) => ({ status: k, count })),
    channelCounts: countBy(sentRows, (r) => r.sent_via ?? "unknown").map(({ k, count }) => ({ channel: k, count })),
    sent: sentRows.length,
    sentLast7: sentRows.filter((r) => istDay(r.sent_at!) >= from7).length,
    reviewed: rows.filter((r) => r.reviewed_at).length,
    replied: rows.filter((r) => r.replied_at).length,
    bounced: rows.filter((r) => r.email_bounced).length,
    remindersSent: rows.reduce((s, r) => s + (r.reminders ?? 0), 0),
    averageRating: rated.length ? rated.reduce((s, r) => s + r.rating!, 0) / rated.length : null,
    ratingCounts: [1, 2, 3, 4, 5].map((rating) => ({ rating, count: rated.filter((r) => r.rating === rating).length })),
    sentByDay: [...perDay].map(([day, count]) => ({ day, count })),
    recent: sentRows
      .sort((a, b) => b.sent_at!.localeCompare(a.sent_at!))
      .slice(0, 15)
      .map((r) => ({
        id: r.id,
        name: r.name,
        company: r.company,
        status: r.status,
        sentAt: r.sent_at,
        sentVia: r.sent_via,
        sentBy: r.sent_by,
        rating: r.rating,
      })),
  };
}

/* ------------------------------ Lead detail + writes ------------------------------ */

/** Statuses allowed by the CHECK constraint on investor_outreach / b2b_outreach. */
export const LEAD_STATUSES = ["Under discussion", "Won", "Not interested", "Bounced – no need to contact"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Common values already used in status_detail, offered as suggestions. */
export const STATUS_DETAIL_SUGGESTIONS = [
  "Sent – awaiting reply",
  "Replied – positive",
  "Replied – neutral",
  "Favourable – reply due",
  "Auto-acknowledgement only",
  "Declined – not aligned",
  "Declined – round passed",
  "Bounced – invalid email",
  "Unsubscribed",
];

export const FOLLOWUP_CHANNELS = ["email", "call", "whatsapp", "meeting", "linkedin", "other"] as const;

const TABLES: Record<PipelineKind, { leads: string; logs: string; nameCol: string; groupCol: string }> = {
  investors: { leads: "investor_outreach", logs: "investor_followup_log", nameCol: "name", groupCol: "investor_type" },
  b2b: { leads: "b2b_outreach", logs: "b2b_followup_log", nameCol: "company", groupCol: "segment" },
};

export function isPipelineKind(v: unknown): v is PipelineKind {
  return v === "investors" || v === "b2b";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export type LeadDetail = Omit<PipelineLead, "followupCount" | "lastFollowup" | "nextFollowup"> & {
  personalHook: string | null;
  sourceUrl: string | null;
  followups: (Followup & { id: string; kind: string })[];
};

/** One lead with its full follow-up history. Not cached: the detail page should always be current. */
export async function getLeadDetail(kind: PipelineKind, id: string): Promise<LeadDetail | undefined> {
  if (!isUuid(id)) return undefined;
  const t = TABLES[kind];
  const [rows, logs] = await Promise.all([
    rest<Record<string, string | null>[]>(`${t.leads}?select=*&id=eq.${id}&limit=1`, { serviceRole: true, cache: "no-store" }),
    rest<(FollowupRow & { id: string; kind: string })[]>(
      `${t.logs}?select=id,kind,${FOLLOWUP_COLS}&lead_id=eq.${id}&order=logged_at.desc`,
      { serviceRole: true, cache: "no-store" },
    ),
  ]);
  const r = rows[0];
  if (!r) return undefined;
  return {
    id: r.id!,
    name: r[t.nameCol] ?? "",
    group: r[t.groupCol] ?? null,
    email: r.email ?? null,
    phone: r.phone ?? null,
    website: r.website ?? null,
    country: r.country ?? null,
    spoc: r.spoc_name ?? null,
    status: r.status ?? "",
    statusDetail: r.status_detail ?? null,
    remark: r.remark ?? null,
    createdAt: r.created_at!,
    updatedAt: r.updated_at!,
    personalHook: r.personal_hook ?? null,
    sourceUrl: r.source_url ?? null,
    followups: logs.map((l) => ({
      id: l.id,
      kind: l.kind,
      loggedAt: l.logged_at,
      channel: l.channel,
      note: l.note,
      statusAfter: l.status_after,
      nextFollowup: l.next_followup,
      by: l.by_email,
    })),
  };
}

/** Updates a lead's status fields and records the change in its follow-up log. */
export async function updateLead(
  kind: PipelineKind,
  id: string,
  patch: { status: LeadStatus; statusDetail: string | null; remark: string | null; spoc: string | null },
  byEmail: string,
) {
  const t = TABLES[kind];
  const [before] = await rest<{ status: string }[]>(`${t.leads}?select=status&id=eq.${id}`, {
    serviceRole: true,
    cache: "no-store",
  });
  if (!before) throw new Error("Lead not found");
  await rest(`${t.leads}?id=eq.${id}`, {
    method: "PATCH",
    serviceRole: true,
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status: patch.status,
      status_detail: patch.statusDetail,
      remark: patch.remark,
      spoc_name: patch.spoc,
      updated_at: new Date().toISOString(),
    }),
  });
  if (before.status !== patch.status) {
    await rest(t.logs, {
      method: "POST",
      serviceRole: true,
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        lead_id: id,
        kind: "manual",
        channel: null,
        note: `Status changed from "${before.status}" to "${patch.status}" on the dashboard.`,
        status_after: patch.status,
        by_email: byEmail,
      }),
    });
  }
}

/** Adds a follow-up to a lead's log; optionally moves the lead to a new status. */
export async function logFollowup(
  kind: PipelineKind,
  id: string,
  entry: {
    channel: string;
    note: string;
    nextFollowup: string | null;
    statusAfter: LeadStatus | null;
  },
  byEmail: string,
) {
  const t = TABLES[kind];
  const [lead] = await rest<{ status: string }[]>(`${t.leads}?select=status&id=eq.${id}`, {
    serviceRole: true,
    cache: "no-store",
  });
  if (!lead) throw new Error("Lead not found");
  await rest(t.logs, {
    method: "POST",
    serviceRole: true,
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      lead_id: id,
      kind: "manual",
      channel: entry.channel,
      note: entry.note,
      next_followup: entry.nextFollowup,
      status_after: entry.statusAfter ?? lead.status,
      by_email: byEmail,
    }),
  });
  await rest(`${t.leads}?id=eq.${id}`, {
    method: "PATCH",
    serviceRole: true,
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      ...(entry.statusAfter ? { status: entry.statusAfter } : {}),
      updated_at: new Date().toISOString(),
    }),
  });
}
