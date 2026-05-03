"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/provider";

export default function JoinPage() {
  const router = useRouter();
  const t = useT();
  const [code, setCode] = useState("");
  return (
    <main className="mx-auto max-w-md px-5 pt-24">
      <div className="card p-6">
        <h1 className="text-xl font-semibold mb-1">{t("room.joinNew")}</h1>
        <p className="text-mute text-sm mb-5">{t("home.haveCode")}</p>
        <input
          className="input w-full text-center text-2xl tracking-[0.4em] uppercase font-medium"
          maxLength={5}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t("home.codePlaceholder")}
        />
        <button
          onClick={() => code.length === 5 && router.push(`/room/${code}`)}
          disabled={code.length !== 5}
          className="btn btn-primary w-full mt-4"
        >
          {t("common.enter")}
        </button>
      </div>
    </main>
  );
}
