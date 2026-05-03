import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { receipts, rooms } from "@/lib/store";
import { bus, roomChannel } from "@/lib/events";
import { SERVICE_ITEM_ID } from "@/lib/domain/totals";

const ItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).optional(),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().nonnegative().optional(),
});

const FullItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

const PatchSchema = z.object({
  upsertItem: ItemSchema.optional(),
  removeItemId: z.string().optional(),
  items: z.array(FullItemSchema).optional(),
  serviceCharge: z.number().nonnegative().optional(),
  tax: z.number().nonnegative().optional(),
  total: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  comment: z.string().max(500).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = receipts.get(id);
  if (!r) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ receipt: r });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = PatchSchema.parse(await req.json());

  let updated = receipts.get(id);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (body.items) {
    const normalized = body.items.map((i) => ({
      id: i.id ?? nanoid(8),
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    }));
    updated = receipts.replaceItems(id, normalized);
  }
  if (body.upsertItem) updated = receipts.upsertItem(id, body.upsertItem);
  if (body.removeItemId) updated = receipts.removeItem(id, body.removeItemId);
  if (
    body.serviceCharge !== undefined ||
    body.tax !== undefined ||
    body.total !== undefined ||
    body.currency !== undefined ||
    body.comment !== undefined
  ) {
    updated = receipts.update(id, {
      ...(body.serviceCharge !== undefined && { serviceCharge: body.serviceCharge }),
      ...(body.tax !== undefined && { tax: body.tax }),
      ...(body.total !== undefined && { total: body.total }),
      ...(body.currency !== undefined && { currency: body.currency }),
      ...(body.comment !== undefined && { comment: body.comment }),
    });
  }

  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });

  const validIds = new Set([...updated.items.map((i) => i.id), SERVICE_ITEM_ID]);
  const affected = rooms.cleanOrphanSelections(id, validIds);
  for (const room of affected) {
    bus.publish(roomChannel(room.code), { type: "room", room });
  }

  for (const room of rooms.findByReceipt(id)) {
    bus.publish(roomChannel(room.code), { type: "receipt", receipt: updated });
  }

  return NextResponse.json({ receipt: updated });
}
