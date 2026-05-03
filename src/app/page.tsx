"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, Sparkles, Upload, Users } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { useT } from "@/lib/i18n/provider";
import { RecentRooms } from "@/components/RecentRooms";

export default function Home() {
  const router = useRouter();
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [code, setCode] = useState("");

  const codeValid = /^[A-Z2-9]{5}$/.test(code);
  function joinByCode() {
    if (codeValid) router.push(`/room/${code}`);
  }

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(apiUrl("/api/receipts"), { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("home.parseError"));
      router.push(`/edit/${data.receipt.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("home.error"));
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 pt-16 pb-24">
      <header className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">
          {t("home.heroPrefix")}{" "}
          <span className="whitespace-nowrap bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
            {t("home.heroAccent")}
          </span>
        </h1>
        <p className="text-mute mt-4 max-w-lg mx-auto">{t("home.heroSubtitle")}</p>
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={`card relative p-10 sm:p-14 text-center transition ${
          dragOver ? "ring-2 ring-accent/60" : ""
        }`}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent2 grid place-items-center animate-pulse">
              <Sparkles className="w-7 h-7 text-bg" />
            </div>
            <p className="text-lg">{t("home.parsing")}</p>
            <div className="w-64 space-y-2">
              <div className="skeleton h-4" />
              <div className="skeleton h-4 w-5/6" />
              <div className="skeleton h-4 w-4/6" />
            </div>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-accent/20 to-accent2/20 grid place-items-center border border-white/10">
              <Camera className="w-7 h-7 text-accent" />
            </div>
            <h2 className="text-xl font-medium mb-2">{t("home.dropTitle")}</h2>
            <p className="text-mute mb-6 text-sm">{t("home.dropFormats")}</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <label className="btn btn-primary cursor-pointer">
                <Upload className="w-4 h-4" />
                {t("home.chooseFile")}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) handleFile(f);
                  }}
                />
              </label>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 text-danger text-sm text-center">{error}</div>
      )}

      <div className="mt-6 flex items-center gap-3 text-mute text-xs">
        <div className="h-px bg-white/10 flex-1" />
        <span>{t("home.haveCode")}</span>
        <div className="h-px bg-white/10 flex-1" />
      </div>

      <div className="mt-4 flex gap-2 justify-center">
        <input
          className="input w-44 text-center tracking-[0.4em] font-mono uppercase"
          placeholder={t("home.codePlaceholder")}
          value={code}
          maxLength={5}
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value
              .toUpperCase()
              .replace(/[^A-Z2-9]/g, "")
              .slice(0, 5);
            setCode(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") joinByCode();
          }}
        />
        <button
          onClick={joinByCode}
          disabled={!codeValid}
          className="btn btn-ghost"
        >
          {t("common.enter")}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <section className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Step n={1} icon={<Camera className="w-5 h-5" />} title={t("home.step1Title")} text={t("home.step1Text")} />
        <Step n={2} icon={<Users className="w-5 h-5" />} title={t("home.step2Title")} text={t("home.step2Text")} />
        <Step n={3} icon={<Sparkles className="w-5 h-5" />} title={t("home.step3Title")} text={t("home.step3Text")} />
      </section>

      <div className="mt-14">
        <RecentRooms />
      </div>
    </main>
  );
}

function Step({ n, icon, title, text }: { n: number; icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="card p-5 relative">
      <div className="absolute top-4 right-4 text-xs font-semibold text-mute tabular-nums">
        0{n}
      </div>
      <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 grid place-items-center mb-3 text-accent">
        {icon}
      </div>
      <div className="font-medium mb-1">{title}</div>
      <div className="text-sm text-mute">{text}</div>
    </div>
  );
}
