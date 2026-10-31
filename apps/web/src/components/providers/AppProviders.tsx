"use client";

import { useEffect } from "react";

import { useDemoStore } from "@/lib/data/repository";

import { StoreHydrator } from "./StoreHydrator";

function Preferences() {
  const theme = useDemoStore((state) => state.theme);
  const locale = useDemoStore((state) => state.locale);

  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const dark =
        theme === "dark" ||
        (theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", dark);
      root.style.colorScheme = dark ? "dark" : "light";
      root.lang = locale;
    };

    apply();

    if (theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, locale]);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <StoreHydrator>
      <Preferences />
      {children}
    </StoreHydrator>
  );
}
