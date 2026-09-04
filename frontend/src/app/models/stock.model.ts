export interface Stock {
  ID?: number;
  Materials: string;
  Descriptions: string;
  Unit: string;
  In_Stock: number;
}

export interface StockStats {
  totalSkus: number;
  totalQuantity?: number;
  uniqueUnits?: number;
  totalIndents: number;
  allottedEngineersCount: number;
  lowStockCount: number;
}

export interface StockFilter {
  search: string;
  unit: string;
  sortBy: 'Materials' | 'Descriptions' | 'Unit' | 'In_Stock';
  sortOrder: 'asc' | 'desc';
}

export const COMMON_UNITS = [
  'Nos',
  'Pcs',
  'Bags',
  'Kgs',
  'Meters',
  'Boxes',
  'Rolls',
  'Sets',
  'Liters',
  'Coils'
] as const;
