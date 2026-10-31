"use client";

import { useEffect } from "react";

import { useDemoStore } from "@/lib/data/repository";

export function StoreHydrator({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let active = true;

    const finish = () => {
      if (active) useDemoStore.getState().setHydrated(true);
    };

    const unsubscribe = useDemoStore.persist.onFinishHydration(finish);
    useDemoStore.persist.rehydrate();

    if (useDemoStore.persist.hasHydrated()) finish();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return children;
}
