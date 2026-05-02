"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Check, Copy, Home, LogOut, Minus, Pencil, Plus, Users, X } from "lucide-react";
import type { Participant, Receipt, Room } from "@/lib/domain/types";
import {
  claimedUnits,
  computeTotals,
  itemStatus,
  itemTotal,
  receiptSubtotal,
  userUnits,
  DRIFT_TOLERANCE,
} from "@/lib/domain/totals";
import { formatMoney, cn, participantColor } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

const meKey = (code: string) => `room:${code}:me`;

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = use(params);
  const code = raw.toUpperCase();
  const [room, setRoom] = useState<Room | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [me, setMe] = useState<Participant | null>(null);
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(meKey(code));
    if (stored) {
      try {
        setMe(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
  }, [code]);

  useEffect(() => {
    const url = me
      ? `/api/rooms/${code}/events?pid=${encodeURIComponent(me.id)}`
      : `/api/rooms/${code}/events`;
    const es = new EventSource(apiUrl(url));
    es.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type === "snapshot") {
        setRoom(data.room);
        setReceipt(data.receipt);
      } else if (data.type === "room") setRoom(data.room);
      else if (data.type === "receipt") setReceipt(data.receipt);
    };
    return () => es.close();
  }, [code, me?.id]);

  useEffect(() => {
    fetch(apiUrl(`/api/rooms/${code}`)).then(async (r) => {
      if (r.status === 404) setNotFound(true);
    });
  }, [code]);

  useEffect(() => {
    if (!me || !room) return;
    if (room.participants.some((p) => p.id === me.id)) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(apiUrl(`/api/rooms/${code}/join`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: me.name }),
      });
      if (cancelled) return;
      if (res.status === 409) {
        localStorage.removeItem(meKey(code));
        setMe(null);
        setName(me.name);
        setJoinError("Твоё имя уже занято — выбери себя из списка или введи другое.");
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      if (data.you) {
        localStorage.setItem(meKey(code), JSON.stringify(data.you));
        if (data.room) setRoom(data.room);
        setMe(data.you);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, me, room]);

  function claim(p: Participant) {
    localStorage.setItem(meKey(code), JSON.stringify(p));
    setMe(p);
  }

  async function signOut() {
    if (me) {
      try {
        await fetch(apiUrl(`/api/rooms/${code}/leave`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId: me.id }),
          keepalive: true,
        });
      } catch {
        /* ignore — user is leaving anyway */
      }
    }
    localStorage.removeItem(meKey(code));
    setMe(null);
    setName("");
  }

  async function joinAsNew() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setJoinError(null);
    setJoining(true);
    try {
      const res = await fetch(apiUrl(`/api/rooms/${code}/join`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.status === 409) {
        setJoinError("Это имя уже занято — выбери себя из списка или введи другое.");
        return;
      }
      if (!res.ok) {
        setJoinError("Не получилось войти. Попробуй ещё раз.");
        return;
      }
      const data = await res.json();
      if (data.you) {
        localStorage.setItem(meKey(code), JSON.stringify(data.you));
        if (data.room) setRoom(data.room);
        setMe(data.you);
      }
    } finally {
      setJoining(false);
    }
  }

  async function setUnits(itemId: string, units: number) {
    if (!me) return;
    await fetch(apiUrl(`/api/rooms/${code}/select`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, participantId: me.id, units }),
    });
  }


  const totals = useMemo(() => (receipt && room ? computeTotals(receipt, room) : []), [receipt, room]);

  if (notFound) {
    return (
      <main className="mx-auto max-w-md px-5 pt-24 text-center">
        <h1 className="text-xl font-medium mb-2">Комната не найдена</h1>
        <p className="text-mute text-sm mb-6">Проверь код и попробуй ещё раз.</p>
        <Link href="/" className="btn btn-ghost">
          <Home className="w-4 h-4" /> На главную
        </Link>
      </main>
    );
  }

  if (!me) {
    const participants = room?.participants ?? [];
    const trimmed = name.trim();
    const taken = participants.some(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    return (
      <main className="mx-auto max-w-md px-5 pt-12 pb-24">
        <div className="chip mb-4">
          <Users className="w-3.5 h-3.5" /> Комната {code}
        </div>

        <div className="card p-6">
          <div className="font-medium mb-1">Зайти новым человеком</div>
          <p className="text-mute text-sm mb-4">Введи имя — друзья увидят его в комнате.</p>
          <input
            className="input w-full"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (joinError) setJoinError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && trimmed && !taken) joinAsNew();
            }}
            placeholder="Имя"
          />
          {trimmed && taken && !joining && (
            <div className="mt-2 text-xs text-danger">
              Имя «{trimmed}» уже занято — выбери себя ниже или введи другое.
            </div>
          )}
          {joinError && <div className="mt-2 text-xs text-danger">{joinError}</div>}
          <button
            onClick={joinAsNew}
            disabled={!trimmed || taken || joining}
            className="btn btn-primary w-full mt-4"
          >
            Войти
          </button>
        </div>

        {participants.length > 0 && (
          <>
            <div className="flex items-center gap-3 my-5 text-xs text-mute uppercase tracking-wider">
              <div className="flex-1 h-px bg-white/10" />
              или продолжить как
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="card p-2">
              <div className="space-y-1">
                {participants.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => claim(p)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.05] transition text-left"
                  >
                    <span
                      className="w-9 h-9 rounded-full grid place-items-center text-sm font-semibold text-bg shrink-0"
                      style={{ background: participantColor(p.name) }}
                    >
                      {p.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="font-medium truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="mt-6 flex justify-center">
          <Link href="/" className="btn btn-ghost">
            <Home className="w-4 h-4" /> На главную
          </Link>
        </div>
      </main>
    );
  }

  if (!room || !receipt) {
    return (
      <main className="mx-auto max-w-2xl px-5 pt-12 space-y-3">
        <div className="skeleton h-8 w-1/3" />
        <div className="skeleton h-20 w-full mt-6" />
        <div className="skeleton h-20 w-full" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pt-8 pb-32">
      <div className="flex items-center justify-between mb-5">
        <div className="min-w-0">
          <div className="text-lg sm:text-xl font-semibold truncate">{room.name || `Комната ${code}`}</div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="mt-0.5 flex items-center gap-2 text-mute text-sm font-mono tracking-[0.2em] hover:text-accent transition"
          >
            {code}
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
          </button>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <ParticipantsStrip participants={room.participants} meId={me.id} />
          <div className="flex items-center gap-3">
            <Link
              href={`/edit/${receipt.id}?room=${code}`}
              className="text-xs text-accent hover:text-accent/80 transition flex items-center gap-1"
              title="Внести правки в чек"
            >
              <Pencil className="w-3 h-3" />
              Внести правки
            </Link>
            <button
              onClick={signOut}
              className="text-xs text-mute hover:text-ink transition flex items-center gap-1"
              title={`Выйти из роли «${me.name}»`}
            >
              <LogOut className="w-3 h-3" />
              Выйти
            </button>
          </div>
        </div>
      </div>


      <ProgressStrip receipt={receipt} room={room} totals={totals} />

      <div className="card divide-y divide-white/5 overflow-hidden">
        {receipt.items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            currency={receipt.currency}
            room={room}
            me={me}
            onSet={(u) => setUnits(item.id, u)}
          />
        ))}
      </div>

      <section className="mt-6">
        <div className="text-sm text-mute mb-2 px-1">Расчёт</div>
        <div className="card p-4 space-y-4">
          {totals.every((t) => t.subtotal === 0) ? (
            <div className="text-mute text-sm text-center py-4">Никто ещё ничего не выбрал</div>
          ) : (
            totals.map((t) => (
              <div key={t.participant.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar p={t.participant} />
                  <div>
                    <div className="font-medium">
                      {t.participant.name}
                      {t.participant.id === me.id && <span className="text-mute text-xs ml-2">(ты)</span>}
                    </div>
                    {t.share > 0 && (
                      <div className="text-xs text-mute">
                        + {formatMoney(t.share, receipt.currency)} сервис/налог
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right tabular-nums">
                  <div className="font-semibold">{formatMoney(t.total, receipt.currency)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {receipt.comment && (
        <section className="mt-6">
          <div className="text-sm text-mute mb-2 px-1">Комментарий</div>
          <div className="card p-4 text-sm whitespace-pre-wrap leading-relaxed break-words">
            {receipt.comment}
          </div>
        </section>
      )}

      <div className="mt-6 flex justify-center">
        <Link href="/" className="btn btn-ghost">
          <Home className="w-4 h-4" /> На главную
        </Link>
      </div>
    </main>
  );
}


function ItemCard({
  item,
  currency,
  room,
  me,
  onSet,
}: {
  item: Receipt["items"][number];
  currency: string;
  room: Room;
  me: Participant;
  onSet: (units: number) => void;
}) {
  const myUnits = userUnits(room, item.id, me.id);
  const claimed = claimedUnits(room, item.id);
  const status = itemStatus(item, claimed);
  const overclaimed = status === "over";
  const fullyClaimed = status === "full";

  const eaters = room.selections
    .filter((s) => s.itemId === item.id && s.units > 0)
    .map((s) => ({
      p: room.participants.find((x) => x.id === s.participantId)!,
      units: s.units,
    }))
    .filter((e) => e.p);

  const showStatus = overclaimed;
  const allEaters = [...eaters].sort((a, b) =>
    a.p.id === me.id ? -1 : b.p.id === me.id ? 1 : 0,
  );

  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div
      className={cn(
        "p-4 relative transition-colors",
        overclaimed
          ? "bg-danger/[0.07]"
          : fullyClaimed
          ? "bg-success/[0.07]"
          : myUnits > 0
          ? "bg-accent/5"
          : "",
      )}
    >
      {(fullyClaimed || overclaimed) && (
        <span
          aria-hidden
          className={cn(
            "absolute left-0 top-0 bottom-0 w-0.5",
            overclaimed ? "bg-danger" : "bg-success",
          )}
        />
      )}
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate flex items-center gap-2">
            {overclaimed ? (
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-danger/20 text-danger shrink-0"
                title="Разобрано больше чем в чеке"
              >
                <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
            ) : fullyClaimed ? (
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-success/20 text-success shrink-0"
                title="Позиция полностью разобрана"
              >
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </span>
            ) : null}
            <span className="truncate">{item.name}</span>
          </div>
          <div className="text-xs text-mute mt-0.5 flex items-center gap-1.5 flex-wrap tabular-nums">
            {item.quantity > 1 ? (
              <span>
                {fmtUnits(item.quantity)} × {formatMoney(item.unitPrice, currency)} ={" "}
                <span className="text-ink/80">{formatMoney(itemTotal(item), currency)}</span>
              </span>
            ) : (
              <span className="text-ink/80">{formatMoney(itemTotal(item), currency)}</span>
            )}
          </div>
        </div>

        <UnitsStepper value={myUnits} onChange={onSet} onOpenPicker={() => setPickerOpen(true)} />
      </div>

      {allEaters.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
              {allEaters.map(({ p, units }) => {
                const isMe = p.id === me.id;
                return (
                  <span
                    key={p.id}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border whitespace-nowrap",
                      isMe
                        ? "bg-white/[0.08] border-white/15 text-ink font-medium"
                        : "bg-white/[0.03] border-white/10 text-mute",
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: participantColor(p.name) }}
                    />
                    <span className="inline-flex items-center gap-0.5">
                      <span>{p.name}</span>
                      <span className="opacity-60">·</span>
                      <span className="tabular-nums">{fmtUnitsShort(units)}</span>
                    </span>
                  </span>
                );
              })}
        </div>
      ) : null}

      {showStatus && (
        <div className="mt-3 text-xs flex items-center gap-1.5 text-danger">
          <span className="w-1.5 h-1.5 rounded-full bg-danger" />
          разобрано {fmtUnitsShort(claimed)} — больше чем в чеке ({fmtUnitsShort(item.quantity)})
        </div>
      )}

      {pickerOpen && (
        <UnitsPickerDialog
          item={item}
          participantsCount={room.participants.length}
          value={myUnits}
          onClose={() => setPickerOpen(false)}
          onCommit={(v) => {
            onSet(v);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

function UnitsStepper({
  value,
  onChange,
  onOpenPicker,
}: {
  value: number;
  onChange: (units: number) => void;
  onOpenPicker: () => void;
}) {
  const active = value > 0;
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-full border p-1 shrink-0 transition",
        active ? "border-accent/60 bg-accent/15" : "border-white/10 bg-white/[0.04]",
      )}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value === 0}
        className="w-8 h-8 rounded-full grid place-items-center transition disabled:opacity-30 hover:bg-white/10"
        aria-label="Меньше"
      >
        <Minus className="w-4 h-4" strokeWidth={2.5} />
      </button>
      <button
        type="button"
        onClick={onOpenPicker}
        className="relative w-10 h-8 grid place-items-center font-semibold text-xs tabular-nums text-ink rounded transition active:bg-white/15 hover:bg-white/10"
        aria-label="Выбрать количество"
        title={`Выбрать долю — ${fmtUnits(value)}`}
      >
        {fmtUnitsCompact(value)}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1.5 right-1.5 bottom-0.5 h-px text-mute [background-image:repeating-linear-gradient(to_right,currentColor_0,currentColor_2px,transparent_2px,transparent_4px)]"
        />
      </button>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 rounded-full grid place-items-center transition hover:bg-white/10"
        aria-label="Больше"
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function UnitsPickerDialog({
  item,
  participantsCount,
  value,
  onClose,
  onCommit,
}: {
  item: { quantity: number; name: string };
  participantsCount: number;
  value: number;
  onClose: () => void;
  onCommit: (v: number) => void;
}) {
  const maxPortions = Math.max(Math.ceil(item.quantity), 1);
  const maxPeople = 50;
  const portionOptions = Array.from({ length: maxPortions }, (_, i) => i + 1);
  const peopleOptions = Array.from({ length: maxPeople - 1 }, (_, i) => i + 2);

  const initialState = (() => {
    const f = detectFraction(value, maxPortions, maxPeople);
    if (f) return { portions: f.portions, people: f.people as number | null, custom: null as number | null };
    if (value > 0) return { portions: 1, people: null as number | null, custom: value };
    return { portions: 1, people: 2 as number | null, custom: null as number | null };
  })();
  const [portions, setPortionsRaw] = useState(initialState.portions);
  const [people, setPeopleRaw] = useState<number | null>(initialState.people);
  const [customValue, setCustomValue] = useState<number | null>(initialState.custom);
  const [customOpen, setCustomOpen] = useState(false);

  const setPortions = (n: number) => {
    setCustomValue(null);
    setPortionsRaw(n);
    if (people === null) setPeopleRaw(2);
  };
  const setPeople = (n: number) => {
    setCustomValue(null);
    setPeopleRaw(n);
  };

  const result =
    customValue !== null
      ? customValue
      : people !== null
      ? Math.round((portions / people) * 1000) / 1000
      : portions;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (customOpen) {
    return (
      <CustomValueDialog
        initial={customValue ?? value}
        onBack={() => setCustomOpen(false)}
        onClose={onClose}
        onApply={(v) => onCommit(v)}
      />
    );
  }

  return (
    <DialogShell onClose={onClose} title={item.name}>
      <div className="space-y-5">
        <div>
          <div className="text-xs text-mute mb-2">Количество порций</div>
          <Carousel
            options={portionOptions}
            value={portions}
            onChange={setPortions}
            renderLabel={(n) => String(n)}
          />
        </div>
        <div>
          <div className="text-xs text-mute mb-2 px-1">На количество человек</div>
          <Carousel
            options={peopleOptions}
            value={people}
            onChange={setPeople}
            renderLabel={(n) => String(n)}
          />
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <button
            type="button"
            onClick={() => setCustomOpen(true)}
            className="text-xs text-accent hover:underline"
          >
            Ввести вручную
          </button>
          <div className="text-sm tabular-nums text-mute">
            {customValue !== null ? (
              <span className="text-ink font-semibold">{fmtUnitsShort(customValue)}</span>
            ) : (
              <>=&nbsp;<span className="text-ink font-semibold">{fmtUnitsShort(result)}</span></>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onCommit(result)}
          className="btn btn-primary w-full"
        >
          ОК
        </button>
      </div>
    </DialogShell>
  );
}

function CustomValueDialog({
  initial,
  onBack,
  onClose,
  onApply,
}: {
  initial: number;
  onBack: () => void;
  onClose: () => void;
  onApply: (v: number) => void;
}) {
  const [text, setText] = useState(initial > 0 ? fmtUnits(initial) : "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const parsed = parseFloat(text.replace(",", "."));
  const valid = Number.isFinite(parsed) && parsed >= 0;

  return (
    <DialogShell onClose={onClose} onBack={onBack} title="Ввести вручную">
      <div className="space-y-4">
        <div className="text-xs text-mute">
          Сколько порций ты съел. Дробное — твоя доля от одной порции (например, <span className="text-ink">0.5</span> — половина, <span className="text-ink">1.5</span> — полторы).
        </div>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && valid) onApply(parsed);
          }}
          inputMode="decimal"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          name="units"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          placeholder="например, 0.33"
          className="input w-full text-center text-2xl font-semibold tabular-nums h-14"
        />
        <button
          type="button"
          onClick={() => valid && onApply(parsed)}
          disabled={!valid}
          className="btn btn-primary w-full"
        >
          ОК
        </button>
      </div>
    </DialogShell>
  );
}

function DialogShell({
  title,
  subtitle,
  onClose,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm card p-5 relative shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2 mb-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1 -ml-1 text-mute hover:text-ink transition shrink-0"
              aria-label="Назад"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium">{title}</div>
            {subtitle && <div className="text-xs text-mute truncate">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 -mr-1 -mt-1 text-mute hover:text-ink transition shrink-0"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Carousel({
  options,
  value,
  onChange,
  renderLabel,
}: {
  options: number[];
  value: number | null;
  onChange: (v: number) => void;
  renderLabel: (v: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [value]);

  return (
    <div className="relative -mx-5">
      <div
        ref={ref}
        className="flex gap-1.5 overflow-x-auto snap-x snap-mandatory py-1 px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)]"
      >
        {options.map((n) => {
          const active = n === value;
          return (
            <button
              key={n}
              ref={active ? activeRef : null}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                "snap-center shrink-0 w-12 h-12 rounded-xl grid place-items-center font-semibold tabular-nums border transition",
                active
                  ? "bg-accent text-bg border-accent shadow-glow"
                  : "bg-white/[0.04] border-white/10 text-mute hover:bg-white/[0.08]",
              )}
            >
              {renderLabel(n)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function detectFraction(value: number, maxPortions: number, maxPeople: number): { portions: number; people: number } | null {
  if (value <= 0) return null;
  if (Number.isInteger(value) && value <= maxPortions) return { portions: value, people: 1 };
  for (let portions = 1; portions <= Math.min(maxPortions, 5); portions++) {
    for (let people = 2; people <= maxPeople; people++) {
      if (Math.abs(portions / people - value) < 1e-3) return { portions, people };
    }
  }
  return null;
}

function fmtUnits(n: number) {
  if (Math.abs(n) < 1e-9) return "0";
  return String(n);
}

function fmtUnitsCompact(n: number): string {
  if (Math.abs(n) < 1e-9) return "0";
  if (Number.isInteger(n)) {
    const s = String(n);
    return s.length <= 4 ? s : "999+";
  }
  if (n < 10) return n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return String(Math.round(n));
}

function fmtUnitsShort(n: number) {
  if (Math.abs(n) < 1e-9) return "0";
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, "");
}

function ParticipantsStrip({ participants, meId }: { participants: Participant[]; meId: string }) {
  const MAX = 5;
  const overflow = participants.length > MAX;
  const visible = overflow ? participants.slice(0, MAX - 1) : participants;
  const rest = overflow ? participants.slice(MAX - 1) : [];
  return (
    <div className="flex -space-x-2">
      {visible.map((p) => (
        <div
          key={p.id}
          className={cn(
            "w-8 h-8 rounded-full border-2 grid place-items-center text-xs font-semibold text-bg",
            p.id === meId ? "border-white" : "border-bg",
          )}
          style={{ background: participantColor(p.name) }}
          title={p.name}
        >
          {p.name.slice(0, 1).toUpperCase()}
        </div>
      ))}
      {overflow && (
        <div
          className="w-8 h-8 rounded-full bg-surface2 border-2 border-bg grid place-items-center text-xs font-semibold text-mute"
          title={rest.map((p) => p.name).join(", ")}
        >
          +{rest.length}
        </div>
      )}
    </div>
  );
}

function ProgressStrip({
  receipt,
  room,
  totals,
}: {
  receipt: Receipt;
  room: Room;
  totals: ReturnType<typeof computeTotals>;
}) {
  const receiptTotal = receiptSubtotal(receipt) + receipt.serviceCharge + receipt.tax;
  const claimedTotal = totals.reduce((s, t) => s + t.total, 0);
  const remaining = receiptTotal - claimedTotal;
  const drift = receiptTotal > 0 ? Math.abs(remaining) / receiptTotal : 0;
  const done = claimedTotal > 0 && drift <= DRIFT_TOLERANCE;
  const pct = done ? 1 : receiptTotal > 0 ? Math.min(1, claimedTotal / receiptTotal) : 0;

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-baseline justify-between text-sm mb-2">
        <div>
          <span className={cn("tabular-nums font-medium", done ? "text-success" : "text-ink")}>
            {formatMoney(claimedTotal, receipt.currency)}
          </span>
          <span className="text-mute"> / {formatMoney(receiptTotal, receipt.currency)}</span>
        </div>
        {!done && room.selections.length > 0 && (
          <div className="text-xs text-mute tabular-nums">
            {remaining > 0 ? "осталось " : "перебор "}
            {formatMoney(Math.abs(remaining), receipt.currency)}
          </div>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={cn("h-full transition-all", done ? "bg-success" : "bg-accent")}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}

function Avatar({ p }: { p: Participant }) {
  return (
    <div
      className="w-8 h-8 rounded-full grid place-items-center text-xs font-semibold text-bg"
      style={{ background: participantColor(p.name) }}
    >
      {p.name.slice(0, 1).toUpperCase()}
    </div>
  );
}
