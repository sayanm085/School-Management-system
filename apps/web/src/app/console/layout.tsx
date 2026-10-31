"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SchoolSeal } from "@/components/brand/SchoolSeal";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDemoStore } from "@/lib/data/repository";

function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--canvas)]">
      <div className="w-full max-w-sm px-6">
        <div className="mb-5 flex items-center gap-3">
          <SchoolSeal size={42} />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-11 w-full rounded-[14px]" />
          <Skeleton className="h-11 w-full rounded-[14px]" />
          <Skeleton className="h-11 w-2/3 rounded-[14px]" />
        </div>
      </div>
    </div>
  );
}

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const hydrated = useDemoStore((state) => state.hydrated);
  const session = useDemoStore((state) => state.session);

  useEffect(() => {
    if (hydrated && !session) router.replace("/login");
  }, [hydrated, session, router]);

  if (!hydrated || !session) return <LoadingScreen />;

  return <ConsoleShell>{children}</ConsoleShell>;
}
