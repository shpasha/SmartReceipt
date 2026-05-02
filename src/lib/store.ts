import { nanoid } from "nanoid";
import type { Receipt, Room, ReceiptItem, Participant, Selection } from "./domain/types";
import { bus, roomChannel } from "./events";

type Presence = { count: number; offlineSince: number | null };

type Store = {
  receipts: Map<string, Receipt>;
  rooms: Map<string, Room>;
  presence: Map<string, Map<string, Presence>>;
};

const g = globalThis as unknown as { __smartreceiptStore?: Partial<Store> };
const existing = g.__smartreceiptStore ?? (g.__smartreceiptStore = {});
existing.receipts ??= new Map();
existing.rooms ??= new Map();
existing.presence ??= new Map();
const store = existing as Store;


export const receipts = {
  create(input: Omit<Receipt, "id" | "createdAt">): Receipt {
    const r: Receipt = { id: nanoid(10), createdAt: Date.now(), ...input };
    store.receipts.set(r.id, r);
    return r;
  },
  get(id: string) {
    return store.receipts.get(id);
  },
  update(id: string, patch: Partial<Omit<Receipt, "id" | "createdAt">>) {
    const cur = store.receipts.get(id);
    if (!cur) return undefined;
    const next: Receipt = { ...cur, ...patch };
    store.receipts.set(id, next);
    return next;
  },
  upsertItem(id: string, item: Partial<ReceiptItem> & { id?: string }) {
    const cur = store.receipts.get(id);
    if (!cur) return undefined;
    let items = cur.items;
    if (item.id && items.some((i) => i.id === item.id)) {
      items = items.map((i) => (i.id === item.id ? { ...i, ...item } as ReceiptItem : i));
    } else {
      const newItem: ReceiptItem = {
        id: item.id ?? nanoid(8),
        name: item.name ?? "Новая позиция",
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice ?? 0,
      };
      items = [...items, newItem];
    }
    const next = { ...cur, items };
    store.receipts.set(id, next);
    return next;
  },
  removeItem(id: string, itemId: string) {
    const cur = store.receipts.get(id);
    if (!cur) return undefined;
    const next = { ...cur, items: cur.items.filter((i) => i.id !== itemId) };
    store.receipts.set(id, next);
    return next;
  },
};

export const rooms = {
  create(receiptId: string, hostName: string): { room: Room; host: Participant } {
    const code = generateCode();
    const host: Participant = makeParticipant(hostName);
    const now = Date.now();
    const room: Room = {
      code,
      receiptId,
      hostId: host.id,
      createdAt: now,
      lastActivity: now,
      participants: [host],
      selections: [],
    };
    store.rooms.set(code, room);
    return { room, host };
  },
  get(code: string) {
    return store.rooms.get(code);
  },
  findByReceipt(receiptId: string) {
    return [...store.rooms.values()].filter((r) => r.receiptId === receiptId);
  },
  join(
    code: string,
    name: string,
  ): { room: Room; participant: Participant } | { error: "not_found" | "name_taken" } {
    const room = store.rooms.get(code);
    if (!room) return { error: "not_found" };
    const trimmed = name.trim();
    const exists = room.participants.some(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) return { error: "name_taken" };
    const participant = makeParticipant(trimmed);
    const next: Room = {
      ...room,
      participants: [...room.participants, participant],
      lastActivity: Date.now(),
    };
    store.rooms.set(code, next);
    return { room: next, participant };
  },
  setSelection(code: string, sel: Selection): Room | undefined {
    const room = store.rooms.get(code);
    if (!room) return undefined;
    const others = room.selections.filter(
      (s) => !(s.itemId === sel.itemId && s.participantId === sel.participantId),
    );
    const selections = sel.units > 0 ? [...others, sel] : others;
    const next = { ...room, selections, lastActivity: Date.now() };
    store.rooms.set(code, next);
    return next;
  },
  bumpSelection(code: string, itemId: string, participantId: string, delta: number): Room | undefined {
    const room = store.rooms.get(code);
    if (!room) return undefined;
    const current = room.selections
      .filter((s) => s.itemId === itemId && s.participantId === participantId)
      .reduce((a, b) => a + b.units, 0);
    const next = Math.max(0, current + delta);
    return this.setSelection(code, { itemId, participantId, units: next });
  },

  removeIfEmpty(code: string, participantId: string): Room | undefined {
    const room = store.rooms.get(code);
    if (!room) return undefined;
    const hasSelections = room.selections.some((s) => s.participantId === participantId);
    if (hasSelections) return room;
    const next: Room = {
      ...room,
      participants: room.participants.filter((p) => p.id !== participantId),
      lastActivity: Date.now(),
    };
    store.rooms.set(code, next);
    bus.publish(roomChannel(code), { type: "room", room: next });
    return next;
  },

  openConnection(code: string, participantId: string) {
    let map = store.presence.get(code);
    if (!map) {
      map = new Map();
      store.presence.set(code, map);
    }
    const cur = map.get(participantId) ?? { count: 0, offlineSince: null };
    map.set(participantId, { count: cur.count + 1, offlineSince: null });
  },

  closeConnection(code: string, participantId: string) {
    const map = store.presence.get(code);
    if (!map) return;
    const cur = map.get(participantId);
    if (!cur) return;
    const nextCount = cur.count - 1;
    if (nextCount > 0) {
      map.set(participantId, { ...cur, count: nextCount });
      return;
    }
    map.delete(participantId);
    rooms.removeIfEmpty(code, participantId);
  },
};

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  if (store.rooms.has(code)) return generateCode();
  return code;
}

const palette = [
  "#a78bfa",
  "#22d3ee",
  "#34d399",
  "#fbbf24",
  "#60a5fa",
  "#fb923c",
  "#2dd4bf",
  "#e879f9",
  "#a3e635",
  "#818cf8",
];

function makeParticipant(name: string): Participant {
  return {
    id: nanoid(8),
    name: name.trim() || "Гость",
    color: palette[Math.floor(Math.random() * palette.length)],
    joinedAt: Date.now(),
  };
}
