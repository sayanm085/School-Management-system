import {
  BarChart3,
  CalendarCheck,
  Clock,
  FileText,
  GraduationCap,
  IndianRupee,
  LayoutDashboard,
  Megaphone,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Role } from "@/lib/types";

export type NavLabelKey =
  | "dashboard"
  | "students"
  | "admissions"
  | "attendance"
  | "staffAttendance"
  | "timetable"
  | "exams"
  | "fees"
  | "salary"
  | "analytics"
  | "notices"
  | "reports"
  | "settings"
  | "audit";

export type NavItem = {
  href: string;
  labelKey: NavLabelKey;
  icon: LucideIcon;
  roles: Role[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/console/dashboard",
    labelKey: "dashboard",
    icon: LayoutDashboard,
    roles: ["headmaster", "teacher", "clerk", "management"],
  },
  {
    href: "/console/students",
    labelKey: "students",
    icon: Users,
    roles: ["headmaster", "teacher", "clerk"],
  },
  {
    href: "/console/admissions",
    labelKey: "admissions",
    icon: UserPlus,
    roles: ["headmaster", "clerk"],
  },
  {
    href: "/console/attendance",
    labelKey: "attendance",
    icon: CalendarCheck,
    roles: ["headmaster", "teacher", "clerk"],
  },
  {
    href: "/console/staff-attendance",
    labelKey: "staffAttendance",
    icon: CalendarCheck,
    roles: ["headmaster", "clerk"],
  },
  {
    href: "/console/timetable",
    labelKey: "timetable",
    icon: Clock,
    roles: ["headmaster", "teacher"],
  },
  {
    href: "/console/exams",
    labelKey: "exams",
    icon: GraduationCap,
    roles: ["headmaster", "teacher", "clerk"],
  },
  {
    href: "/console/fees",
    labelKey: "fees",
    icon: IndianRupee,
    roles: ["headmaster", "clerk"],
  },
  {
    href: "/console/salary",
    labelKey: "salary",
    icon: Wallet,
    roles: ["headmaster", "clerk"],
  },
  {
    href: "/console/analytics",
    labelKey: "analytics",
    icon: BarChart3,
    roles: ["headmaster", "teacher", "clerk", "management"],
  },
  {
    href: "/console/notices",
    labelKey: "notices",
    icon: Megaphone,
    roles: ["headmaster", "teacher", "clerk", "management"],
  },
  {
    href: "/console/reports",
    labelKey: "reports",
    icon: FileText,
    roles: ["headmaster", "teacher", "clerk", "management"],
  },
  {
    href: "/console/settings",
    labelKey: "settings",
    icon: Settings,
    roles: ["headmaster", "clerk"],
  },
  {
    href: "/console/audit",
    labelKey: "audit",
    icon: ShieldCheck,
    roles: ["headmaster", "management"],
  },
];

export function navForRole(role: Role) {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
