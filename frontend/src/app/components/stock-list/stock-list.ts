import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Stock } from '../../models/stock.model';

@Component({
  selector: 'app-stock-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-list.html',
  styleUrl: './stock-list.css'
})
export class StockListComponent {
  @Input() stocks: Stock[] = [];
  @Input() loading: boolean = false;

  @Output() editStock = new EventEmitter<Stock>();
  @Output() deleteStock = new EventEmitter<Stock>();
  @Output() refresh = new EventEmitter<void>();
  @Output() addStock = new EventEmitter<void>();
  @Output() exportCsv = new EventEmitter<Stock[]>();
  @Output() exportPdf = new EventEmitter<Stock[]>();

  searchQuery = '';
  selectedUnit = 'ALL';
  stockStatusFilter: 'ALL' | 'HEALTHY' | 'LOW' | 'OUT' = 'ALL';
  sortBy: 'Materials' | 'Descriptions' | 'Unit' | 'In_Stock' = 'Materials';
  sortAsc = true;

  get availableUnits(): string[] {
    const units = this.stocks
      .map((s) => s.Unit?.trim())
      .filter((u): u is string => Boolean(u));
    return Array.from(new Set(units)).sort();
  }

  get filteredStocks(): Stock[] {
    const query = this.searchQuery.trim().toLowerCase();

    return this.stocks
      .filter((stock) => {
        // Unit filter
        if (this.selectedUnit !== 'ALL' && stock.Unit !== this.selectedUnit) {
          return false;
        }

        // Status filter
        const quantity = Number(stock.In_Stock) || 0;
        if (this.stockStatusFilter === 'OUT' && quantity !== 0) return false;
        if (this.stockStatusFilter === 'LOW' && (quantity <= 0 || quantity >= 10)) return false;
        if (this.stockStatusFilter === 'HEALTHY' && quantity < 10) return false;

        // Search text
        if (!query) return true;
        const text = `${stock.Materials || ''} ${stock.Descriptions || ''} ${stock.Unit || ''}`.toLowerCase();
        return text.includes(query);
      })
      .sort((a, b) => {
        let valA: any = a[this.sortBy];
        let valB: any = b[this.sortBy];

        if (this.sortBy === 'In_Stock') {
          valA = Number(valA) || 0;
          valB = Number(valB) || 0;
          return this.sortAsc ? valA - valB : valB - valA;
        }

        const strA = (valA ?? '').toString().toLowerCase();
        const strB = (valB ?? '').toString().toLowerCase();
        return this.sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
  }

  setSort(column: 'Materials' | 'Descriptions' | 'Unit' | 'In_Stock'): void {
    if (this.sortBy === column) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortBy = column;
      this.sortAsc = true;
    }
  }

  filterByLowStock(): void {
    this.stockStatusFilter = this.stockStatusFilter === 'LOW' ? 'ALL' : 'LOW';
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedUnit = 'ALL';
    this.stockStatusFilter = 'ALL';
  }

  onEdit(stock: Stock): void {
    this.editStock.emit(stock);
  }

  onDelete(stock: Stock): void {
    this.deleteStock.emit(stock);
  }

  onRefresh(): void {
    this.refresh.emit();
  }

  onAddStock(): void {
    this.addStock.emit();
  }

  onExport(): void {
    this.exportCsv.emit(this.filteredStocks);
  }

  onExportPdf(): void {
    this.exportPdf.emit(this.filteredStocks);
  }

  getStatusBadge(stock: Stock): { text: string; cssClass: string } {
    const qty = Number(stock.In_Stock) || 0;
    if (qty <= 0) {
      return { text: 'Out of Stock', cssClass: 'badge-out' };
    }
    if (qty < 10) {
      return { text: `Low: ${qty}`, cssClass: 'badge-low' };
    }
    return { text: 'In Stock', cssClass: 'badge-ok' };
  }
}
