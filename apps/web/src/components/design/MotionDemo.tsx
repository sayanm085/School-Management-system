"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";

const students = [
  {
    nameBn: "সৌম্যদীপ ঘোষ",
    nameEn: "Soumyadeep Ghosh",
    roll: 12,
    days: ["present", "present", "absent", "holiday", "present", "present"],
  },
  {
    nameBn: "অনন্যা সেন",
    nameEn: "Ananya Sen",
    roll: 13,
    days: ["present", "present", "present", "holiday", "present", "late"],
  },
  {
    nameBn: "রাহুল দাস",
    nameEn: "Rahul Das",
    roll: 14,
    days: ["present", "absent", "present", "holiday", "present", "present"],
  },
] as const;

const tone = {
  present: "bg-[var(--green-tint)] text-[var(--green-text)]",
  absent: "bg-[var(--red-tint)] text-[var(--red-text)]",
  late: "bg-[var(--orange-tint)] text-[var(--orange-strong)]",
  holiday: "bg-[var(--fill)] text-[var(--ink-tertiary)]",
};

export function MotionDemo() {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();
  const student = students[index];

  const next = () => setIndex((current) => (current + 1) % students.length);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_1fr]">
      <div className="relative h-[354px]">
        <div className="absolute inset-x-5 top-4 h-full rounded-[var(--radius-2xl)] border border-[var(--separator)] bg-[var(--surface)] opacity-60" />
        <div className="absolute inset-x-2.5 top-2 h-full rounded-[var(--radius-2xl)] border border-[var(--separator)] bg-[var(--surface)] opacity-80" />
        <AnimatePresence initial={false}>
          <motion.article
            key={student.nameEn}
            aria-live="polite"
            initial={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, transform: "translateY(18px) scale(0.97)" }
            }
            animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
            exit={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, transform: "translateY(-18px) scale(0.97)" }
            }
            transition={
              reduce
                ? { duration: 0.2 }
                : { type: "spring", duration: 0.45, bounce: 0.12 }
            }
            className="absolute inset-0 rounded-[var(--radius-2xl)] border border-[var(--separator)] bg-[var(--surface)] p-5"
            style={{ boxShadow: "var(--shadow-raised)" }}
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--ink-tertiary)]">
              <span className="rounded-full bg-[var(--fill)] px-2.5 py-1">
                Roll {student.roll}
              </span>
              <span>VIII B</span>
            </div>
            <div className="mt-5 flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-[var(--blue)] bg-[var(--blue-tint)] text-[17px] font-semibold text-[var(--blue-text)]">
              {student.roll}
            </div>
            <h3 className="font-bengali mt-4 text-[26px] leading-[1.3] font-semibold tracking-[-0.02em]">
              {student.nameBn}
            </h3>
            <p className="mt-0.5 text-[13px] text-[var(--ink-secondary)]">
              {student.nameEn}
            </p>
            <p className="mt-4 text-[12px] font-semibold text-[var(--ink-secondary)]">
              This week
            </p>
            <div className="mt-2 grid grid-cols-6 gap-1.5">
              {student.days.map((day, dayIndex) => (
                <div
                  key={`${student.nameEn}-${dayIndex}`}
                  className={`flex h-9 items-center justify-center rounded-[10px] text-[11px] font-semibold ${tone[day]}`}
                  aria-label={`Day ${dayIndex + 1}: ${day}`}
                >
                  {day === "present" ? "✓" : day === "absent" ? "✕" : day === "late" ? "!" : "–"}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-[12px] bg-[var(--fill)] px-3 py-2.5 text-[12px]">
              <span className="font-semibold">Today</span>
              <span className="text-[var(--ink-secondary)]">Not marked</span>
            </div>
          </motion.article>
        </AnimatePresence>
      </div>

      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--blue-text)]">
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
          Swipe down for the next student
        </div>
        <h3 className="mt-3 text-[22px] font-semibold tracking-[-0.02em]">
          Motion is the register turning a page.
        </h3>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[var(--ink-secondary)]">
          The card enters and leaves on a spring, starting from its current
          position. Reduced motion swaps the movement for a short cross-fade.
          Marking is a button press, never a swipe, so nobody marks a student by
          accident.
        </p>
        <div className="mt-5 flex gap-2">
          <Button onClick={next} size="md">
            Deal next student
          </Button>
          <Button
            onClick={() => setIndex(0)}
            variant="secondary"
            size="md"
            aria-label="Reset demo"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </Button>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 text-[12px]">
          <div className="rounded-[12px] bg-[var(--fill)] p-3">
            <dt className="font-semibold">Spring</dt>
            <dd className="mt-1 text-[var(--ink-secondary)]">
              0.45s · bounce 0.12
            </dd>
          </div>
          <div className="rounded-[12px] bg-[var(--fill)] p-3">
            <dt className="font-semibold">Card entrance</dt>
            <dd className="mt-1 text-[var(--ink-secondary)]">
              18px rise · scale 0.97
            </dd>
          </div>
          <div className="rounded-[12px] bg-[var(--fill)] p-3">
            <dt className="font-semibold">Press</dt>
            <dd className="mt-1 text-[var(--ink-secondary)]">
              160ms · scale 0.97
            </dd>
          </div>
          <div className="rounded-[12px] bg-[var(--fill)] p-3">
            <dt className="font-semibold">Reduced motion</dt>
            <dd className="mt-1 text-[var(--ink-secondary)]">
              Cross-fade only
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
