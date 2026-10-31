import type { Role } from "@/lib/types";

export const DEMO_PASSWORD = "demo1234";

export type DemoAccount = {
  role: Role;
  label: string;
  employeeId: string;
  nameBn: string;
  nameEn: string;
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "headmaster",
    label: "Headmaster",
    employeeId: "HM-001",
    nameBn: "অমিতাভ সেন",
    nameEn: "Amitava Sen",
  },
  {
    role: "teacher",
    label: "Asst. headmaster",
    employeeId: "TCH-001",
    nameBn: "সুব্রত দাস",
    nameEn: "Subhas Das",
  },
  {
    role: "teacher",
    label: "Class teacher",
    employeeId: "TCH-027",
    nameBn: "অনন্যা সেন",
    nameEn: "Ananya Sen",
  },
  {
    role: "teacher",
    label: "Teacher · English",
    employeeId: "TCH-023",
    nameBn: "মিনরি দাস",
    nameEn: "Minori Das",
  },
  {
    role: "clerk",
    label: "Clerk",
    employeeId: "CLK-014",
    nameBn: "সুমন দে",
    nameEn: "Suman Dey",
  },
  {
    role: "management",
    label: "Management",
    employeeId: "MC-003",
    nameBn: "ড. দেবব্রত রায়",
    nameEn: "Dr. Debabrata Roy",
  },
];

export function roleLabel(role: Role) {
  switch (role) {
    case "headmaster":
      return "Headmaster";
    case "teacher":
      return "Teacher";
    case "clerk":
      return "Clerk";
    case "management":
      return "Management";
    default:
      return "Staff";
  }
}
