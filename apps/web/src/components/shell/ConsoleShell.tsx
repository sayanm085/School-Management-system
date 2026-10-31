import { CoverAlert } from "@/components/shell/CoverAlert";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { Toaster } from "@/components/ui/Toaster";

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--canvas)]">
      <Sidebar />
      <div className="console-content lg:pl-[280px]">
        <TopBar />
        <main className="mx-auto max-w-[1440px] px-5 pb-16 pt-5 sm:px-8 lg:px-10">
          {children}
        </main>
      </div>
      <CoverAlert />
      <Toaster />
    </div>
  );
}
