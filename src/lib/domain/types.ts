export type ID = string;

export interface ReceiptItem {
  id: ID;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Receipt {
  id: ID;
  createdAt: number;
  currency: string;
  items: ReceiptItem[];
  serviceCharge: number;
  tax: number;
  total: number;
  comment?: string;
  imagePath?: string;
  imageMime?: string;
  rawText?: string;
}

export interface Participant {
  id: ID;
  name: string;
  color: string;
  joinedAt: number;
}

export interface Selection {
  itemId: ID;
  participantId: ID;
  units: number;
}

export interface Room {
  code: string;
  name: string;
  receiptId: ID;
  hostId: ID;
  createdAt: number;
  lastActivity: number;
  participants: Participant[];
  selections: Selection[];
}

export interface ParticipantTotal {
  participant: Participant;
  subtotal: number;
  share: number;
  total: number;
}
