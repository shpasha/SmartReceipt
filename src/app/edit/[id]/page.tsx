"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowRight, Loader2 } from "lucide-react";
import type { Receipt, ReceiptItem } from "@/lib/domain/types";
import { apiUrl } from "@/lib/api";
import { itemTotal, receiptSubtotal } from "@/lib/domain/totals";
import { formatMoney } from "@/lib/utils";

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [hostName, setHostName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch(apiUrl(`/api/receipts/${id}`))
      .then((r) => r.json())
      .then((d) => setReceipt(d.receipt));
  }, [id]);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(apiUrl(`/api/receipts/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.receipt) setReceipt(data.receipt);
  }

  async function createRoom() {
    if (!hostName.trim()) return;
    setCreating(true);
    const res = await fetch(apiUrl("/api/rooms"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiptId: id, hostName }),
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="chip mb-2">Чек распознан</div>
          <h1 className="text-2xl font-semibold">Проверь позиции</h1>
        </div>
        <button
          onClick={() => patch({ upsertItem: { name: "Новая позиция", quantity: 1, unitPrice: 0 } })}
          className="btn btn-ghost"
        >
          <Plus className="w-4 h-4" /> Позиция
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="hidden sm:grid px-4 py-2.5 grid-cols-[1fr_64px_112px_96px_36px] gap-3 items-center text-xs uppercase tracking-wider text-mute border-b border-white/5 bg-white/[0.02]">
          <div>Название</div>
          <div className="text-center">Кол-во</div>
          <div className="text-right">Цена</div>
          <div className="text-right">Сумма</div>
          <div />
        </div>
        <div className="divide-y divide-white/5">
        {receipt.items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            currency={receipt.currency}
            onChange={(patchItem) => patch({ upsertItem: { id: item.id, ...patchItem } })}
            onRemove={() => patch({ removeItemId: item.id })}
          />
        ))}
        {receipt.items.length === 0 && (
          <div className="p-6 text-center text-mute text-sm">Нет позиций. Добавь вручную.</div>
        )}
        </div>
      </div>

      <div className="card mt-4 p-5 space-y-3 text-sm">
        <Row label="Подытог" value={formatMoney(subtotal, receipt.currency)} />
        <EditableRow
          label="Сервис"
          value={receipt.serviceCharge}
          currency={receipt.currency}
          onChange={(v) => patch({ serviceCharge: v })}
        />
        <EditableRow
          label="Налог"
          value={receipt.tax}
          currency={receipt.currency}
          onChange={(v) => patch({ tax: v })}
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

      <div className="card mt-6 p-5">
        <div className="font-medium mb-1">Создать комнату</div>
        <p className="text-sm text-mute mb-4">Друзья подключатся по коду и выберут что ели.</p>
        <div className="flex gap-2">
          <input
            className="input w-full"
            placeholder="Твоё имя"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
          />
          <button onClick={createRoom} disabled={!hostName.trim() || creating} className="btn btn-primary whitespace-nowrap">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Создать
          </button>
        </div>
      </div>
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
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(String(item.quantity));
  const [price, setPrice] = useState(String(item.unitPrice));

  useEffect(() => {
    setName(item.name);
    setQty(String(item.quantity));
    setPrice(String(item.unitPrice));
  }, [item]);

  const commit = () => {
    const q = parseFloat(qty.replace(",", ".")) || 1;
    const p = parseFloat(price.replace(",", ".")) || 0;
    if (name !== item.name || q !== item.quantity || p !== item.unitPrice) {
      onChange({ name, quantity: q, unitPrice: p });
    }
  };

  return (
    <div className="px-4 py-3 flex flex-col gap-2 sm:grid sm:grid-cols-[1fr_64px_112px_96px_36px] sm:gap-3 sm:items-center">
      <div className="flex items-center gap-2 sm:contents">
        <input
          className="input flex-1 min-w-0"
          value={name}
          placeholder="Название позиции"
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
        />
        <button
          onClick={onRemove}
          aria-label="Удалить позицию"
          className="text-mute hover:text-danger transition p-2 sm:justify-self-end sm:order-last"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-2 sm:contents">
        <input
          className="input text-center w-16 sm:w-auto"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onBlur={commit}
          inputMode="decimal"
          aria-label="Количество"
        />
        <span className="text-mute text-sm sm:hidden">×</span>
        <input
          className="input text-right flex-1 sm:flex-none"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={commit}
          inputMode="decimal"
          aria-label="Цена за единицу"
        />
        <span className="text-mute text-sm sm:hidden">=</span>
        <div className="text-right text-sm font-medium tabular-nums whitespace-nowrap min-w-[72px]">
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
  useEffect(() => setV(String(value)), [value]);
  return (
    <div className="flex justify-between items-center">
      <span className="text-mute">{label}</span>
      <div className="flex items-center gap-2">
        <input
          className="input w-28 text-right h-9"
          value={v}
          inputMode="decimal"
          onChange={(e) => setV(e.target.value)}
          onBlur={() => {
            const n = parseFloat(v.replace(",", ".")) || 0;
            if (n !== value) onChange(n);
          }}
        />
        <span className="text-mute text-xs w-8">{currency}</span>
      </div>
    </div>
  );
}
