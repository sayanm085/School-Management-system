"use client";

import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { can } from "@/lib/auth/permissions";
import { useDemoStore } from "@/lib/data/repository";
import { staffById } from "@/lib/data/selectors";
import { formatDate, formatTime } from "@/lib/format";

export default function AuditPage() {
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);

  if (!session || !can(session.role, "audit.view")) {
    return <PermissionDenied />;
  }

  const events = [...db.audit].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Audit trail"
        subtitle="Every sensitive action is appended with its actor, entity and time. Entries are never edited or deleted."
        actions={<Badge tone="info">{events.length} events</Badge>}
      />

      <Card className="mt-6">
        <div className="flex items-center gap-2 border-b border-[var(--separator)] px-5 py-3 text-[11px] text-[var(--ink-secondary)]">
          <ShieldCheck className="h-4 w-4 text-[var(--blue)]" aria-hidden="true" />
          Append-only · demo school
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--separator)] text-[10px] text-[var(--ink-tertiary)]">
                <th className="px-5 py-2.5 font-semibold">Time</th>
                <th className="px-3 py-2.5 font-semibold">Actor</th>
                <th className="px-3 py-2.5 font-semibold">Action</th>
                <th className="px-3 py-2.5 font-semibold">Entity</th>
                <th className="px-5 py-2.5 font-semibold">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--separator)]">
              {events.map((event) => {
                const actor = staffById(db, event.actorId);
                return (
                  <tr key={event.id} className="text-[12px]">
                    <td className="whitespace-nowrap px-5 py-3 text-[10px] text-[var(--ink-secondary)]">
                      {formatDate(event.createdAt)} ·{" "}
                      {formatTime(event.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold">{actor?.nameEn ?? "System"}</p>
                      <p className="text-[10px] text-[var(--ink-tertiary)]">
                        {actor?.employeeId ?? "—"}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-[11px] font-medium">
                      {event.action}
                    </td>
                    <td className="px-3 py-3 text-[10px] text-[var(--ink-secondary)]">
                      {event.entityType} · {event.entityId}
                    </td>
                    <td className="px-5 py-3 text-[11px] text-[var(--ink-secondary)]">
                      {event.summary}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
