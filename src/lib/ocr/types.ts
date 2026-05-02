export interface ParsedReceipt {
  currency: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  serviceCharge: number;
  tax: number;
  total: number;
}

export interface OCRProvider {
  parse(image: { base64: string; mimeType: string }): Promise<ParsedReceipt>;
}

export type OCRErrorKind = "not_a_receipt" | "parse_failed" | "transient";

export class OCRError extends Error {
  kind: OCRErrorKind;
  raw?: string;
  constructor(kind: OCRErrorKind, message: string, raw?: string) {
    super(message);
    this.kind = kind;
    this.raw = raw;
  }
}
