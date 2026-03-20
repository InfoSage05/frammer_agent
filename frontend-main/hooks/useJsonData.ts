"use client";

import { useEffect, useState } from "react";

export default function useJsonData(section: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/section-data/${section}`);
        if (!res.ok) throw new Error(`Failed to load ${section}`);
        const next = await res.json();
        if (active) setData(next);
      } catch {
        if (active) setData(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [section]);

  return { data, loading };
}
