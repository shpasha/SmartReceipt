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
