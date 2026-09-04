export const CART_STATUS_OPTIONS = [
  'Yet to Start',
  'Requested Vendor',
  'PO Proccessed',
  'Payment On Process',
  'Materials on Porter',
  'Material dispatched'
] as const;

export type CartStatusType = (typeof CART_STATUS_OPTIONS)[number];

export interface CartItem {
  ID?: number;
  Order_Date?: string; // YYYY-MM-DD
  Materials: string;
  Client_Site: string;
  Quantity: number;
  Unit: string;
  Vendor_Name?: string;
  Status: CartStatusType | string;
}

export interface CartStats {
  totalItems: number;
  totalQuantity: number;
  uniqueSites: number;
  uniqueVendors: number;
  statusCounts: Record<string, number>;
}
