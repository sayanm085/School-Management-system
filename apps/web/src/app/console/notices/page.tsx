"use client";

import { Megaphone, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { can } from "@/lib/auth/permissions";
import { useDemoStore } from "@/lib/data/repository";
import { staffById } from "@/lib/data/selectors";
import { formatShortDate } from "@/lib/format";

function audienceLabel(audience: string) {
  if (audience === "all") return "All school";
  if (audience === "teachers") return "Teachers";
  if (audience === "management") return "Management";
  if (audience === "class") return "Class";
  return "Staff";
}

export default function NoticesPage() {
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);
  const commit = useDemoStore((state) => state.commit);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [bodyBn, setBodyBn] = useState("");
  const [audience, setAudience] = useState("all");

  if (!session || !can(session.role, "notices.view")) {
    return <PermissionDenied />;
  }

  const canPublish = can(session.role, "notices.publish");
  const notices = [...db.notices]
    .filter((notice) => notice.status === "published")
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  function publish() {
    if (!session) return;
    if (!title.trim() || !bodyEn.trim()) {
      toast.error("Add a title and the English notice body.");
      return;
    }
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `notice-${Date.now()}`;
    commit(
      (next) => {
        next.notices.unshift({
          id,
          title: title.trim(),
          bodyEn: bodyEn.trim(),
          bodyBn: bodyBn.trim() || bodyEn.trim(),
          audience: audience as
            | "all"
            | "teachers"
            | "management"
            | "class"
            | "staff",
          publishedBy: session.staffId,
          publishedAt: new Date().toISOString(),
          status: "published",
        });
      },
      {
        action: "notice.published",
        entityType: "notice",
        entityId: id,
        summary: `Notice published · ${title.trim()}`,
      },
    );
    toast.success("Notice published", {
      description: "It is now visible to the selected audience in the demo.",
    });
    setTitle("");
    setBodyEn("");
    setBodyBn("");
    setAudience("all");
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        eyebrow="Notice board"
        title="Notices"
        subtitle="In-app notices for staff and classes. SMS and email delivery are simulated in this demo."
        actions={
          canPublish ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New notice
            </Button>
          ) : undefined
        }
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {notices.map((notice) => {
          const author = staffById(db, notice.publishedBy);
          return (
            <Card key={notice.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--blue-tint)] text-[var(--blue)]">
                  <Megaphone className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold">{notice.title}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--ink-tertiary)]">
                    {formatShortDate(notice.publishedAt)} ·{" "}
                    {author?.nameEn ?? "Office"}
                  </p>
                </div>
                <Badge tone={notice.audience === "all" ? "info" : "neutral"}>
                  {audienceLabel(notice.audience)}
                </Badge>
              </div>
              <p
                className="font-bengali mt-4 text-[13px] leading-[1.7]"
                lang="bn"
              >
                {notice.bodyBn}
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--ink-secondary)]">
                {notice.bodyEn}
              </p>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Publish a notice</DialogTitle>
          <DialogDescription>
            The notice appears in the console and in the Hazira app. Keep both
            languages short and specific.
          </DialogDescription>
          <div className="mt-5 space-y-4">
            <Field label="Title">
              {(props) => (
                <Input
                  {...props}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Half-day on Saturday"
                />
              )}
            </Field>
            <Field label="English body">
              {(props) => (
                <Textarea
                  {...props}
                  value={bodyEn}
                  onChange={(event) => setBodyEn(event.target.value)}
                  placeholder="School will close at 12:30 pm today."
                />
              )}
            </Field>
            <Field
              label="Bengali body"
              hint="Optional in the demo; English is used if left blank."
            >
              {(props) => (
                <Textarea
                  {...props}
                  value={bodyBn}
                  onChange={(event) => setBodyBn(event.target.value)}
                  placeholder="আজ দুপুর ১২:৩০-এ বিদ্যালয় ছুটি হবে।"
                  className="font-bengali"
                  lang="bn"
                />
              )}
            </Field>
            <div>
              <p className="mb-1.5 text-[13px] font-semibold">Audience</p>
              <Select
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                aria-label="Notice audience"
              >
                <option value="all">All school</option>
                <option value="teachers">Teachers</option>
                <option value="management">Management</option>
                <option value="class">A class</option>
                <option value="staff">Staff</option>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={publish}>Publish notice</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
