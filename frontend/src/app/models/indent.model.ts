export interface IndentItem {
  ID?: number;
  Indent_ID?: number;
  Materials: string;
  Quantity: number;
  Unit: string;
  Status: string; // 'Ready to Issue' | 'Requested Vendor' | 'Pending'
  PO_WO?: boolean;
}

export interface Indent {
  ID?: number;
  Indent_Date: string; // YYYY-MM-DD
  Indent_No: string;
  Client_Name: string;
  Site_Engineer: string;
  Status?: string; // Optional header status fallback
  items?: IndentItem[];
}

export interface Engineer {
  ID?: number;
  Name: string;
}

export const INDENT_STATUS_OPTIONS = [
  'Ready to Issue',
  'Requested Vendor',
  'Pending'
] as const;

export type IndentStatusType = (typeof INDENT_STATUS_OPTIONS)[number];

export interface MaterialIndentGroup {
  material: string;
  totalIndents: number;
  totalQuantity: number;
  unit: string;
  indents: Indent[];
}

export interface EngineerIndentGroup {
  engineer: string;
  totalIndents: number;
  totalQuantity: number;
  materialsCount: number;
  indents: Indent[];
}

export interface IndentStats {
  totalIndents: number;
  uniqueMaterials: number;
  totalQuantity: number;
  uniqueEngineers: number;
  readyCount: number;
  vendorCount: number;
  pendingCount: number;
}
