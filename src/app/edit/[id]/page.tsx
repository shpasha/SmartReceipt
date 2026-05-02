"use client";

import { use, useEffect, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { nanoid } from "nanoid";
import { Plus, Trash2, ArrowRight, Check, Loader2 } from "lucide-react";
import type { Receipt, ReceiptItem } from "@/lib/domain/types";
import { apiUrl } from "@/lib/api";
import { itemTotal, receiptSubtotal } from "@/lib/domain/totals";
import { formatMoney } from "@/lib/utils";

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = searchParams.get("room");
  const editMode = !!roomCode;
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [hostName, setHostName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!roomCode) return;
    fetch(apiUrl(`/api/rooms/${roomCode}`))
      .then((r) => r.json())
      .then((d) => {
        if (d.room?.name) setRoomName(d.room.name);
      });
  }, [roomCode]);

  useEffect(() => {
    fetch(apiUrl(`/api/receipts/${id}`))
      .then((r) => r.json())
      .then((d) => setReceipt(d.receipt));
  }, [id]);

  function updateItem(itemId: string, patch: Partial<ReceiptItem>) {
    setReceipt((r) =>
      r ? { ...r, items: r.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) } : r,
    );
  }

  function addItem() {
    setReceipt((r) =>
      r
        ? {
            ...r,
            items: [
              ...r.items,
              { id: nanoid(8), name: "Новая позиция", quantity: 1, unitPrice: 0 },
            ],
          }
        : r,
    );
  }

  function removeItem(itemId: string) {
    setReceipt((r) => (r ? { ...r, items: r.items.filter((i) => i.id !== itemId) } : r));
  }

  async function saveToRoom() {
    if (!receipt || !roomCode) return;
    setSaving(true);
    try {
      const [recRes] = await Promise.all([
        fetch(apiUrl(`/api/receipts/${id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: receipt.items,
            serviceCharge: receipt.serviceCharge,
            tax: receipt.tax,
            currency: receipt.currency,
            comment: receipt.comment ?? "",
          }),
        }),
        roomName.trim()
          ? fetch(apiUrl(`/api/rooms/${roomCode}`), {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: roomName.trim() }),
            })
          : Promise.resolve(null),
      ]);
      if (recRes.ok) router.replace(`/room/${roomCode}`);
      else setSaving(false);
    } catch {
      setSaving(false);
    }
  }

  async function createRoom() {
    if (!hostName.trim() || !roomName.trim() || !receipt) return;
    setCreating(true);
    const res = await fetch(apiUrl("/api/rooms"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receiptId: id,
        hostName,
        name: roomName.trim(),
        draft: {
          items: receipt.items,
          serviceCharge: receipt.serviceCharge,
          tax: receipt.tax,
          currency: receipt.currency,
          comment: receipt.comment ?? "",
        },
      }),
    });
    const data = await res.json();
    if (data.room) {
      localStorage.setItem(`room:${data.room.code}:me`, JSON.stringify(data.you));
      router.replace(`/room/${data.room.code}`);
    } else {
      setCreating(false);
    }
  }

  if (!receipt) {
    return (
      <main className="mx-auto max-w-2xl px-5 pt-12">
        <div className="space-y-3">
          <div className="skeleton h-8 w-1/2" />
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton h-20 w-full mt-6" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-20 w-full" />
        </div>
      </main>
    );
  }

  const subtotal = receiptSubtotal(receipt);

  return (
    <main className="mx-auto max-w-2xl px-5 pt-10 pb-24">
      <div className="mb-6">
        {!editMode && <div className="chip mb-2">Чек распознан</div>}
        <h1 className="text-2xl font-semibold">
          {editMode ? "Внести правки" : "Проверь позиции"}
        </h1>
      </div>

      {editMode && (
        <div className="mb-4">
          <div className="text-sm text-mute mb-1.5 px-1">Название комнаты</div>
          <input
            className="input w-full"
            value={roomName}
            maxLength={60}
            onChange={(e) => setRoomName(e.target.value)}
          />
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="hidden sm:grid px-4 py-2.5 grid-cols-[minmax(0,1fr)_80px_80px_minmax(96px,144px)_36px] gap-3 items-center text-xs uppercase tracking-wider text-mute border-b border-white/5 bg-white/[0.02]">
          <div>Название</div>
          <div className="text-center">Кол-во</div>
          <div className="text-center">Цена</div>
          <div className="text-right">Сумма</div>
          <div />
        </div>
        <div className="divide-y divide-white/5">
        {receipt.items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            currency={receipt.currency}
            onChange={(patchItem) => updateItem(item.id, patchItem)}
            onRemove={() => removeItem(item.id)}
          />
        ))}
        {receipt.items.length === 0 && (
          <div className="p-6 text-center text-mute text-sm">Нет позиций. Добавь вручную.</div>
        )}
        </div>
        <button
          onClick={addItem}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm text-mute hover:text-ink hover:bg-white/[0.03] border-t border-white/5 transition"
        >
          <Plus className="w-4 h-4" /> Позиция
        </button>
      </div>

      <div className="card mt-4 p-5 space-y-3 text-sm">
        <EditableRow
          label="Сервис"
          value={receipt.serviceCharge}
          currency={receipt.currency}
          onChange={(v) => setReceipt((r) => (r ? { ...r, serviceCharge: v } : r))}
        />
        <EditableRow
          label="Налог"
          value={receipt.tax}
          currency={receipt.currency}
          onChange={(v) => setReceipt((r) => (r ? { ...r, tax: v } : r))}
        />
        <div className="h-px bg-white/5" />
        <Row
          label={<span className="font-medium text-base">Итого</span>}
          value={
            <span className="font-semibold text-base">
              {formatMoney(subtotal + receipt.serviceCharge + receipt.tax, receipt.currency)}
            </span>
          }
        />
      </div>

      <section className="mt-6">
        <div className="text-sm text-mute mb-2 px-1">Комментарий</div>
        <div className="card p-2">
          <textarea
            value={receipt.comment ?? ""}
            onChange={(e) =>
              setReceipt((r) => (r ? { ...r, comment: e.target.value } : r))
            }
            placeholder="Реквизиты для перевода, кто оплатил, любые заметки…"
            rows={2}
            maxLength={500}
            className="block w-full bg-transparent outline-none resize-none text-sm leading-relaxed p-2 placeholder:text-mute break-words whitespace-pre-wrap"
          />
        </div>
      </section>

      {editMode ? (
        <div className="mt-6 flex gap-2 justify-end">
          <button
            onClick={() => router.replace(`/room/${roomCode}`)}
            className="btn btn-ghost"
            disabled={saving}
          >
            Отмена
          </button>
          <button
            onClick={saveToRoom}
            disabled={saving}
            className="btn btn-primary whitespace-nowrap"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Сохранить
          </button>
        </div>
      ) : (
        <div className="card mt-6 p-5 space-y-3">
          <div>
            <div className="font-medium mb-1">Создать комнату</div>
            <p className="text-sm text-mute">Друзья подключатся по коду и выберут что ели.</p>
          </div>
          <input
            className="input w-full"
            placeholder="Название (например, «Вечер четверга в Saperavi»)"
            value={roomName}
            maxLength={60}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <div className="flex gap-2">
            <input
              className="input w-full"
              placeholder="Твоё имя"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
            />
            <button
              onClick={createRoom}
              disabled={!hostName.trim() || !roomName.trim() || creating}
              className="btn btn-primary whitespace-nowrap"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Создать
            </button>
          </div>
        </div>
      )}

      <section className="mt-6">
        <div className="text-sm text-mute mb-2 px-1">Справка</div>
        <div className="card p-4 text-sm space-y-2.5">
          <div className="flex gap-3">
            <span className="text-accent shrink-0">·</span>
            <span>
              <span className="font-medium">Налог</span>
              <span className="text-mute"> — пропорционально твоей доле в счёте.</span>
            </span>
          </div>
          <div className="flex gap-3">
            <span className="text-accent shrink-0">·</span>
            <span>
              <span className="font-medium">Сервис</span>
              <span className="text-mute"> — поровну на каждого, кто что-то ел.</span>
            </span>
          </div>
          <div className="flex gap-3">
            <span className="text-accent shrink-0">·</span>
            <span>
              <span className="font-medium">Комментарий</span>
              <span className="text-mute">
                {" "}— заметка для участников комнаты: реквизиты для перевода, кто оплатил, и т.д.
              </span>
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

function ItemRow({
  item,
  currency,
  onChange,
  onRemove,
}: {
  item: ReceiptItem;
  currency: string;
  onChange: (patch: Partial<ReceiptItem>) => void;
  onRemove: () => void;
}) {
  const [qty, setQty] = useState(String(item.quantity));
  const [price, setPrice] = useState(String(item.unitPrice));

  const commitQty = () => {
    const q = parseFloat(qty.replace(",", ".")) || 0;
    if (q !== item.quantity) onChange({ quantity: q });
  };
  const commitPrice = () => {
    const p = parseFloat(price.replace(",", ".")) || 0;
    if (p !== item.unitPrice) onChange({ unitPrice: p });
  };

  return (
    <div className="px-4 py-3 flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_80px_80px_minmax(96px,144px)_36px] sm:gap-3 sm:items-center">
      <div className="flex items-center gap-2 sm:contents">
        <input
          className="input flex-1 min-w-0"
          value={item.name}
          placeholder="Название позиции"
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <button
          onClick={onRemove}
          aria-label="Удалить позицию"
          className="text-mute hover:text-danger transition p-2 shrink-0 sm:justify-self-end sm:order-5"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-2 sm:contents">
        <input
          className="input text-center w-20 min-w-0 sm:w-full sm:order-2"
          value={qty}
          onChange={(e) => {
            const v = e.target.value;
            setQty(v);
            const n = parseFloat(v.replace(",", "."));
            if (!Number.isNaN(n) && n !== item.quantity) onChange({ quantity: n });
          }}
          onBlur={commitQty}
          inputMode="decimal"
          aria-label="Количество"
        />
        <span className="text-mute text-sm sm:hidden">×</span>
        <input
          className="input text-center w-20 min-w-0 sm:w-full sm:order-3"
          value={price}
          onChange={(e) => {
            const v = e.target.value;
            setPrice(v);
            const n = parseFloat(v.replace(",", "."));
            if (!Number.isNaN(n) && n !== item.unitPrice) onChange({ unitPrice: n });
          }}
          onBlur={commitPrice}
          inputMode="decimal"
          aria-label="Цена за единицу"
        />
        <span className="text-mute text-sm sm:hidden">=</span>
        <div className="text-sm font-medium tabular-nums whitespace-nowrap sm:order-4 sm:text-right sm:ml-0">
          {formatMoney(itemTotal(item), currency)}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-mute">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function EditableRow({
  label,
  value,
  currency,
  onChange,
}: {
  label: string;
  value: number;
  currency: string;
  onChange: (v: number) => void;
}) {
  const [v, setV] = useState(String(value));

  const commit = () => {
    const n = parseFloat(v.replace(",", ".")) || 0;
    if (n !== value) onChange(n);
  };

  return (
    <div className="flex justify-between items-center">
      <span className="text-mute">{label}</span>
      <div className="flex items-center gap-2">
        <input
          className="input w-28 text-right h-9"
          value={v}
          inputMode="decimal"
          onChange={(e) => {
            const next = e.target.value;
            setV(next);
            const n = parseFloat(next.replace(",", "."));
            if (!Number.isNaN(n) && n !== value) onChange(n);
          }}
          onBlur={commit}
        />
        <span className="text-mute text-xs w-8">{currency}</span>
      </div>
    </div>
  );
}
