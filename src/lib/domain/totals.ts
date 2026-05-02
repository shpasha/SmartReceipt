import type { Receipt, Room, ParticipantTotal, ReceiptItem } from "./types";

export const DRIFT_TOLERANCE = 0.005;

export function itemStatus(item: ReceiptItem, claimed: number) {
  if (claimed <= 0) return "empty" as const;
  const target = item.quantity;
  if (target <= 0) return claimed > 0 ? "over" : "empty";
  const drift = Math.abs(claimed - target) / target;
  if (claimed > target && drift > DRIFT_TOLERANCE) return "over" as const;
  if (drift <= DRIFT_TOLERANCE) return "full" as const;
  return "partial" as const;
}

export function itemTotal(item: { quantity: number; unitPrice: number }) {
  return item.quantity * item.unitPrice;
}

export function receiptSubtotal(receipt: Receipt) {
  return receipt.items.reduce((s, i) => s + itemTotal(i), 0);
}

export function claimedUnits(room: Room, itemId: string) {
  return room.selections
    .filter((s) => s.itemId === itemId)
    .reduce((sum, s) => sum + s.units, 0);
}

export function userUnits(room: Room, itemId: string, participantId: string) {
  return room.selections
    .filter((s) => s.itemId === itemId && s.participantId === participantId)
    .reduce((sum, s) => sum + s.units, 0);
}

export function itemEaters(room: Room, item: ReceiptItem) {
  return room.selections
    .filter((s) => s.itemId === item.id && s.units > 0)
    .map((s) => ({ participantId: s.participantId, units: s.units }));
}

export function computeTotals(receipt: Receipt, room: Room): ParticipantTotal[] {
  const subtotalByParticipant = new Map<string, number>();
  for (const item of receipt.items) {
    for (const sel of room.selections) {
      if (sel.itemId !== item.id || sel.units <= 0) continue;
      const add = sel.units * item.unitPrice;
      subtotalByParticipant.set(
        sel.participantId,
        (subtotalByParticipant.get(sel.participantId) ?? 0) + add,
      );
    }
  }

  const claimedSubtotal = [...subtotalByParticipant.values()].reduce((a, b) => a + b, 0);
  const claimers = subtotalByParticipant.size;
  const tipPerHead = claimers > 0 ? receipt.serviceCharge / claimers : 0;

  return room.participants.map((p) => {
    const sub = subtotalByParticipant.get(p.id) ?? 0;
    const eats = sub > 0;
    const ratio = claimedSubtotal > 0 ? sub / claimedSubtotal : 0;
    const taxShare = receipt.tax * ratio;
    const tipShare = eats ? tipPerHead : 0;
    const share = taxShare + tipShare;
    return {
      participant: p,
      subtotal: round2(sub),
      share: round2(share),
      total: round2(sub + share),
    };
  });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
