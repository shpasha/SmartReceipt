"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { forgetRoom, getRecentRooms, type RecentRoom } from "@/lib/recentRooms";

export function RecentRooms() {
  const t = useT();
  const [rooms, setRooms] = useState<RecentRoom[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const refresh = () => setRooms(getRecentRooms());
    refresh();
    setHydrated(true);
    const onUpdate = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "smartreceipt:recent") refresh();
    };
    window.addEventListener("recent-rooms-updated", onUpdate);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("recent-rooms-updated", onUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (!hydrated || rooms.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="text-xs uppercase tracking-wider text-mute mb-2 px-1">
        {t("home.recent")}
      </div>
      <ul className="space-y-1.5">
        {rooms.map((r) => (
          <li
            key={r.code}
            className="card flex items-center gap-2 pr-2 pl-3 py-2 hover:bg-white/[0.04] transition group"
          >
            <Link
              href={`/room/${r.code}`}
              className="flex-1 min-w-0 flex items-baseline gap-3"
            >
              <span className="font-mono text-mute text-sm tracking-[0.2em] tabular-nums shrink-0">
                {r.code}
              </span>
              <span className="truncate text-sm">{r.name}</span>
              <ArrowRight className="w-3.5 h-3.5 text-mute opacity-0 group-hover:opacity-100 transition shrink-0 ml-auto self-center" />
            </Link>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                forgetRoom(r.code);
              }}
              aria-label={t("home.forgetRoom")}
              title={t("home.forgetRoom")}
              className="p-1.5 rounded-md text-mute hover:text-danger hover:bg-white/[0.05] transition shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
