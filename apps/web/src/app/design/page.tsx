"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  FileText,
  IndianRupee,
  Plus,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { SchoolSeal } from "@/components/brand/SchoolSeal";
import { MotionDemo } from "@/components/design/MotionDemo";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/Tabs";
import { Toaster } from "@/components/ui/Toaster";
import { Tooltip } from "@/components/ui/Tooltip";

const swatches = [
  { token: "canvas", label: "Canvas", hex: "#F5F5F7" },
  { token: "surface", label: "Surface", hex: "#FFFFFF" },
  { token: "ink", label: "Ink", hex: "#1D1D1F" },
  { token: "ink-secondary", label: "Secondary", hex: "#6E6E73" },
  { token: "blue", label: "Action", hex: "#007AFF" },
  { token: "green", label: "Present", hex: "#34C759" },
  { token: "red", label: "Absent", hex: "#FF3B30" },
  { token: "orange", label: "Warning", hex: "#FF9500" },
  { token: "seal-navy", label: "Seal navy", hex: "#0B3B6F" },
  { token: "seal-red", label: "Seal red", hex: "#B42318" },
  { token: "seal-gold", label: "Seal gold", hex: "#C99700" },
  { token: "fill", label: "Inset fill", hex: "#F2F2F7" },
];

const week = [
  { day: "M", tone: "present" },
  { day: "T", tone: "present" },
  { day: "W", tone: "absent" },
  { day: "T", tone: "holiday" },
  { day: "F", tone: "present" },
  { day: "S", tone: "present" },
] as const;

const weekTone = {
  present: "bg-[var(--green-tint)] text-[var(--green-text)]",
  absent: "bg-[var(--red-tint)] text-[var(--red-text)]",
  late: "bg-[var(--orange-tint)] text-[var(--orange-strong)]",
  holiday: "bg-[var(--fill)] text-[var(--ink-tertiary)]",
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[var(--separator)] py-10">
      <div className="mb-6 flex flex-col gap-1.5">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]">
          {title}
        </h2>
        <p className="max-w-2xl text-[13px] leading-relaxed text-[var(--ink-secondary)]">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

export default function DesignPage() {
  const [segment, setSegment] = useState<"week" | "month">("week");

  return (
    <main className="min-h-dvh bg-[var(--canvas)] px-5 pb-16 pt-5 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[12px] font-semibold text-[var(--ink-secondary)] transition-colors hover:bg-[var(--fill)] hover:text-[var(--ink)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Cover
          </Link>
          <div className="flex items-center gap-2.5">
            <SchoolSeal size={34} />
            <div>
              <p className="text-[14px] font-semibold tracking-[-0.01em]">
                Baranda
              </p>
              <p className="text-[11px] text-[var(--ink-tertiary)]">
                Design system
              </p>
            </div>
          </div>
          <Badge tone="info">Civic Modern · v1</Badge>
        </header>

        <section className="pb-10 pt-12">
          <p className="text-[12px] font-semibold text-[var(--blue-text)]">
            Baranda design system
          </p>
          <h1 className="mt-3 max-w-3xl text-[clamp(38px,6vw,64px)] leading-[1.02] font-semibold tracking-[-0.045em]">
            Built for the school day.
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-secondary)]">
            Modern Apple foundations, Bengali-first identity, government-grade
            records. Every component below is real and interactive — press,
            focus, open, and listen to it.
          </p>
        </section>

        <Section
          title="Brand"
          description="The seal and the bilingual lockup are the only official marks. They carry the school identity so the interface can stay quiet."
        >
          <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <Card>
              <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <SchoolSeal size={76} />
                <div>
                  <p className="font-bengali text-[26px] leading-[1.4] font-semibold tracking-[-0.02em]" lang="bn">
                    নবগ্রাম উচ্চ বিদ্যালয়
                  </p>
                  <p className="mt-1 text-[14px] font-medium text-[var(--ink-secondary)]">
                    Nabagram Uchcha Vidyalaya (Demo)
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--ink-tertiary)]">
                    Government-sponsored secondary school · Purba Bardhaman ·
                    Est. 1948
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge tone="success">Demo school</Badge>
                    <Badge>WB-NAB-001</Badge>
                    <Badge>2026–27</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-[12px] font-semibold">Seal sizes</p>
                <p className="mt-1 text-[12px] text-[var(--ink-secondary)]">
                  Login, sidebar, receipts, report cards. Never decorative.
                </p>
                <div className="mt-6 flex items-end gap-5">
                  <SchoolSeal size={64} />
                  <SchoolSeal size={44} />
                  <SchoolSeal size={30} />
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section
          title="Color"
          description="One color means one thing. Status is always paired with an icon or label. Filled buttons use the strong variants so white text clears 4.5:1."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {swatches.map((swatch) => (
              <div
                key={swatch.token}
                className="rounded-[var(--radius-md)] border border-[var(--separator)] bg-[var(--surface)] p-2.5"
              >
                <div
                  className="h-16 rounded-[10px] border border-[var(--separator)]"
                  style={{ background: `var(--${swatch.token})` }}
                />
                <p className="mt-2.5 text-[12px] font-semibold">
                  {swatch.label}
                </p>
                <p className="text-[11px] text-[var(--ink-tertiary)]">
                  {swatch.hex}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill tone="success">Present</StatusPill>
            <StatusPill tone="danger">Absent</StatusPill>
            <StatusPill tone="warning">Late</StatusPill>
            <StatusPill tone="info">Marked</StatusPill>
            <StatusPill tone="neutral">Holiday</StatusPill>
          </div>
        </Section>

        <Section
          title="Typography"
          description="SF-style system sans for the interface; Noto Sans Bengali for Bengali. No serif, no all-caps labels. Tabular numbers for money and registers."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent>
                <p className="text-[11px] text-[var(--ink-tertiary)]">
                  Large title · 34/40 · -0.03em
                </p>
                <p className="mt-1 text-[34px] leading-[1.15] font-semibold tracking-[-0.03em]">
                  Morning Register
                </p>
                <p className="mt-6 text-[11px] text-[var(--ink-tertiary)]">
                  Body · 15/22
                </p>
                <p className="mt-1 max-w-md text-[15px] leading-relaxed text-[var(--ink-secondary)]">
                  Saturday, 31 October 2026. Three classes have submitted their
                  registers. Two fee bills are overdue.
                </p>
                <p className="mt-6 text-[11px] text-[var(--ink-tertiary)]">
                  Bengali · Noto Sans Bengali
                </p>
                <p className="font-bengali mt-1 text-[30px] leading-[1.45] font-semibold" lang="bn">
                  সৌম্যদীপ ঘোষ
                </p>
                <p className="font-bengali mt-1 text-[14px] text-[var(--ink-secondary)]" lang="bn">
                  অষ্টম শ্রেণি · শাখা ব · রোল ১২
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-5">
                <div>
                  <p className="text-[11px] text-[var(--ink-tertiary)]">
                    Title 3 · 22/28 · 600
                  </p>
                  <p className="mt-1 text-[22px] font-semibold tracking-[-0.015em]">
                    Classes in session
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--ink-tertiary)]">
                    Subhead · 15/20 · 500
                  </p>
                  <p className="mt-1 text-[15px] font-medium">
                    Ananya Sen · Physical Science
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--ink-tertiary)]">
                    Caption · 12/16 · 500
                  </p>
                  <p className="mt-1 text-[12px] font-medium text-[var(--ink-secondary)]">
                    Saved offline · will sync when connected
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--ink-tertiary)]">
                    Tabular numbers
                  </p>
                  <div className="mt-1 flex items-baseline gap-4">
                    <span className="tabular text-[28px] font-semibold tracking-[-0.02em]">
                      ₹42,500
                    </span>
                    <span className="tabular text-[28px] font-semibold tracking-[-0.02em]">
                      94.2%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section
          title="Controls"
          description="Buttons respond on press. Dialogs and sheets have a visible exit. Inputs use 16px text on touch so iOS never zooms."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Buttons</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Button>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Take attendance
                  </Button>
                  <Button variant="secondary">New admission</Button>
                  <Button variant="tinted">View report</Button>
                  <Button variant="destructive">Void receipt</Button>
                  <Button variant="ghost">Cancel</Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm">Small</Button>
                  <Button size="lg">Large action</Button>
                  <Button loading>Collecting</Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="secondary">Open dialog</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogTitle>Collect payment?</DialogTitle>
                      <DialogDescription>
                        ₹1,200 from Soumyadeep Ghosh, Class VIII B. A receipt
                        will be generated immediately.
                      </DialogDescription>
                      <div className="mt-6 flex justify-end gap-2">
                        <DialogClose asChild>
                          <Button variant="ghost">Cancel</Button>
                        </DialogClose>
                        <DialogClose asChild>
                          <Button
                            onClick={() =>
                              toast.success("Receipt generated", {
                                description: "R-2026-0142 · ₹1,200",
                              })
                            }
                          >
                            Collect ₹1,200
                          </Button>
                        </DialogClose>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="secondary">Open sheet</Button>
                    </SheetTrigger>
                    <SheetContent
                      title="Mark attendance"
                      description="VIII B · Saturday, 31 October · 48 students"
                    >
                      <div className="space-y-2">
                        <Button className="w-full" size="lg">
                          Present · উপস্থিত
                        </Button>
                        <Button
                          className="w-full"
                          variant="destructive"
                          size="lg"
                        >
                          Absent · অনুপস্থিত
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>

                  <Tooltip label="Mark all present">
                    <Button variant="ghost" size="icon" aria-label="Mark all present">
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fields and view controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <Field
                  label="Employee ID"
                  hint="Use the demo ID shown on the login screen."
                >
                  {(props) => (
                    <Input {...props} placeholder="TCH-027" autoCapitalize="none" />
                  )}
                </Field>
                <SegmentedControl
                  value={segment}
                  onChange={setSegment}
                  ariaLabel="Attendance period"
                  options={[
                    { value: "week", label: "This week" },
                    { value: "month", label: "This month" },
                  ]}
                />
                <Tabs defaultValue="overview">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                    <TabsTrigger value="fees">Fees</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview">
                    <div className="rounded-[var(--radius-md)] bg-[var(--fill)] p-4 text-[13px] text-[var(--ink-secondary)]">
                      Student identity, guardian contact, and this term's
                      register.
                    </div>
                  </TabsContent>
                  <TabsContent value="attendance">
                    <div className="rounded-[var(--radius-md)] bg-[var(--fill)] p-4 text-[13px] text-[var(--ink-secondary)]">
                      Weekly register with accessible Present/Absent cells.
                    </div>
                  </TabsContent>
                  <TabsContent value="fees">
                    <div className="rounded-[var(--radius-md)] bg-[var(--fill)] p-4 text-[13px] text-[var(--ink-secondary)]">
                      Bill line items, payments, and balance.
                    </div>
                  </TabsContent>
                </Tabs>
                <Button
                  variant="secondary"
                  onClick={() =>
                    toast("Attendance saved", {
                      description: "VIII B · 48 students · 10:12",
                    })
                  }
                >
                  Show a toast
                </Button>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section
          title="Surfaces and registers"
          description="Grouped rows instead of spreadsheet grids. The weekly register is the one place where color is dense, and it still carries a check, cross, or dash."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardContent>
                <p className="text-[12px] font-semibold text-[var(--ink-secondary)]">
                  Attendance
                </p>
                <p className="mt-1 text-[36px] font-semibold tracking-[-0.03em]">
                  94.2%
                </p>
                <p className="mt-1 text-[12px] text-[var(--ink-secondary)]">
                  452 of 480 present
                </p>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--fill)]">
                  <div className="h-full w-[94.2%] rounded-full bg-[var(--green)]" />
                </div>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-[var(--ink-secondary)]">
                  <StatusPill tone="success">On track</StatusPill>
                  <span>8.2% above last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Classes in session</CardTitle>
                <span className="text-[11px] font-semibold text-[var(--blue-text)]">
                  3 of 4 marked
                </span>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-[var(--separator)]">
                  {[
                    ["VIII A", "Anindita Roy", "43 / 2", "Marked"],
                    ["VIII B", "Subhas Das", "41 / 4", "Marked"],
                    ["IX A", "Mousumi Pal", "39 / 3", "Marked"],
                    ["X B", "Pradip Ghosh", "—", "Pending"],
                  ].map(([section, teacher, count, status]) => (
                    <li
                      key={section}
                      className="flex items-center gap-3 px-4 py-3.5 text-[13px]"
                    >
                      <span className="w-12 font-semibold">{section}</span>
                      <span className="min-w-0 flex-1 truncate text-[var(--ink-secondary)]">
                        {teacher}
                      </span>
                      <span className="tabular text-[12px] text-[var(--ink-secondary)]">
                        {count}
                      </span>
                      <StatusPill
                        tone={status === "Marked" ? "success" : "warning"}
                      >
                        {status}
                      </StatusPill>
                      <ChevronRight
                        className="h-4 w-4 text-[var(--ink-tertiary)]"
                        aria-hidden="true"
                      />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-[12px] font-semibold text-[var(--ink-secondary)]">
                  This week · VIII B · Roll 12
                </p>
                <div className="mt-3 grid grid-cols-6 gap-1.5">
                  {week.map((day, index) => (
                    <div
                      key={`${day.day}-${index}`}
                      className={`flex h-11 items-center justify-center rounded-[10px] text-[11px] font-semibold ${weekTone[day.tone]}`}
                      aria-label={`${day.day}: ${day.tone}`}
                    >
                      <span className="flex flex-col items-center gap-0.5">
                        <span>{day.day}</span>
                        <span>
                          {day.tone === "present"
                            ? "✓"
                            : day.tone === "absent"
                              ? "✕"
                              : "–"}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-[12px] bg-[var(--fill)] px-3 py-2.5 text-[12px]">
                  <span className="font-semibold">Today</span>
                  <span className="text-[var(--ink-secondary)]">
                    Not marked yet
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <EmptyState
              icon={Users}
              title="No admissions waiting"
              description="New applications will appear here for document verification and approval."
              action={<Button variant="secondary">Open admissions</Button>}
            />
            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section
          title="Motion"
          description="Motion confirms cause and effect. It is spring-driven, interruptible, and never runs on search, navigation, or any action used a hundred times a day."
        >
          <Card>
            <CardContent>
              <MotionDemo />
            </CardContent>
          </Card>
        </Section>

        <Section
          title="Accessibility"
          description="The quality floor. If a screen fails here, it is not finished."
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              ["Contrast", "4.5:1 body text, 3:1 large and UI. Strong button fills only."],
              ["Targets", "44px web, 48dp Flutter. Focus ring on every control."],
              ["Meaning", "Status uses icon or text, never color alone."],
              ["Motion", "Reduced motion cross-fades. Reduced transparency removes glass."],
            ].map(([title, body]) => (
              <Card key={title}>
                <CardContent>
                  <p className="text-[13px] font-semibold">{title}</p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--ink-secondary)]">
                    {body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--separator)] bg-[var(--surface)] p-4">
            <Button variant="secondary">Focusable control</Button>
            <p className="text-[12px] text-[var(--ink-secondary)]">
              Press Tab to see the focus ring. It is a real 2px blue ring with a
              2px offset, not a browser default.
            </p>
          </div>
        </Section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--separator)] pt-6 text-[11px] text-[var(--ink-tertiary)]">
          <span>
            Baranda · Civic Modern · Built for a West Bengal demo school.
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            Spec + implementation plan in /docs
          </span>
        </footer>
      </div>
      <Toaster />
    </main>
  );
}
