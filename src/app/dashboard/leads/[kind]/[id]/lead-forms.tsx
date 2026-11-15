"use client";

import { useActionState } from "react";
import { addFollowup, saveLead, type EditState } from "../../../actions";

type Common = { kind: string; id: string; statuses: readonly string[] };

function Feedback({ state, success }: { state: EditState; success: string }) {
  if (state.error)
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
        {success}
      </p>
    );
  return null;
}

export function LeadForm({
  kind,
  id,
  statuses,
  detailSuggestions,
  initial,
}: Common & {
  detailSuggestions: string[];
  initial: { status: string; statusDetail: string; remark: string; spoc: string };
}) {
  const [state, action, pending] = useActionState(saveLead, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <label className="block text-xs text-muted">
        Status
        <select className="input mt-1 py-2" name="status" defaultValue={initial.status} required>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-muted">
        Status detail
        <input
          className="input mt-1 py-2"
          name="statusDetail"
          list="status-detail-suggestions"
          defaultValue={initial.statusDetail}
          maxLength={200}
          placeholder="e.g. Replied – positive"
        />
        <datalist id="status-detail-suggestions">
          {detailSuggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      <label className="block text-xs text-muted">
        Owner (SPOC)
        <input className="input mt-1 py-2" name="spoc" defaultValue={initial.spoc} maxLength={120} />
      </label>
      <label className="block text-xs text-muted">
        Remark
        <textarea className="input mt-1 min-h-24 py-2" name="remark" defaultValue={initial.remark} maxLength={2000} />
      </label>
      <Feedback state={state} success="Saved." />
      <button className="btn w-full" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

export function FollowupForm({ kind, id, statuses, channels }: Common & { channels: readonly string[] }) {
  const [state, action, pending] = useActionState(addFollowup, {});
  return (
    // Re-mount after each successful save so the fields clear.
    <form key={state.savedAt ?? 0} action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-xs text-muted">
          Channel
          <select className="input mt-1 py-2 capitalize" name="channel" defaultValue="email">
            {channels.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-muted">
          Next follow-up
          <input className="input mt-1 py-2" type="date" name="nextFollowup" />
        </label>
        <label className="block text-xs text-muted">
          Move status to
          <select className="input mt-1 py-2" name="statusAfter" defaultValue="">
            <option value="">Keep current</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-xs text-muted">
        Note
        <textarea
          className="input mt-1 min-h-24 py-2"
          name="note"
          required
          maxLength={2000}
          placeholder="What happened, what was agreed, what's next"
        />
      </label>
      <Feedback state={state} success="Follow-up logged." />
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Log follow-up"}
      </button>
    </form>
  );
}
