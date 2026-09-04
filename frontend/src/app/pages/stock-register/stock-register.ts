import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockService } from '../../services/stock.service';
import { IndentService } from '../../services/indent.service';
import { Stock, StockStats } from '../../models/stock.model';
import { MetricsOverviewComponent } from '../../components/metrics-overview/metrics-overview';
import { StockListComponent } from '../../components/stock-list/stock-list';
import { StockFormModalComponent } from '../../components/stock-form-modal/stock-form-modal';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-stock-register',
  standalone: true,
  imports: [
    CommonModule,
    MetricsOverviewComponent,
    StockListComponent,
    StockFormModalComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './stock-register.html',
  styleUrl: './stock-register.css'
})
export class StockRegisterComponent implements OnInit {
  @ViewChild(StockListComponent) stockListComponent?: StockListComponent;

  stocks: Stock[] = [];
  loading = false;
  saving = false;
  error: string | null = null;
  notification: { type: 'success' | 'error' | 'info'; message: string } | null = null;

  stats: StockStats = {
    totalSkus: 0,
    totalIndents: 0,
    allottedEngineersCount: 0,
    lowStockCount: 0
  };

  // Form modal state
  isFormModalOpen = false;
  selectedStockForEdit: Stock | null = null;

  // Confirm delete dialog state
  isConfirmDialogOpen = false;
  stockToDelete: Stock | null = null;

  constructor(
    public stockService: StockService,
    public indentService: IndentService
  ) {}

  ngOnInit(): void {
    // Subscribe to stock list stream
    this.stockService.stocks$.subscribe((data) => {
      this.stocks = data;
      this.stats = {
        ...this.stats,
        totalSkus: data.length,
        lowStockCount: data.filter((item) => Number(item.In_Stock || 0) < 10).length
      };
    });

    // Subscribe to indents stream to compute indent KPIs
    this.indentService.indents$.subscribe((indents) => {
      const uniqueEngineers = new Set(
        indents.map((i) => i.Site_Engineer?.trim().toLowerCase()).filter(Boolean)
      ).size;
      this.stats = {
        ...this.stats,
        totalIndents: indents.length,
        allottedEngineersCount: uniqueEngineers
      };
    });

    // Subscribe to loading stream
    this.stockService.loading$.subscribe((l) => {
      this.loading = l;
    });

    // Subscribe to error stream
    this.stockService.error$.subscribe((err) => {
      this.error = err;
    });

    // Subscribe to notification stream
    this.stockService.notification$.subscribe((notif) => {
      this.notification = notif;
    });

    // Initial load
    this.stockService.loadStocks().subscribe();
    this.indentService.loadIndents().subscribe();
  }

  openAddModal(): void {
    this.selectedStockForEdit = null;
    this.isFormModalOpen = true;
  }

  openEditModal(stock: Stock): void {
    this.selectedStockForEdit = stock;
    this.isFormModalOpen = true;
  }

  closeFormModal(): void {
    this.isFormModalOpen = false;
    this.selectedStockForEdit = null;
  }

  onSaveStock(stock: Stock): void {
    this.saving = true;
    if (this.selectedStockForEdit && this.selectedStockForEdit.ID) {
      this.stockService.update(this.selectedStockForEdit.ID, stock).subscribe({
        next: () => {
          this.saving = false;
          this.closeFormModal();
        },
        error: () => {
          this.saving = false;
        }
      });
    } else {
      this.stockService.create(stock).subscribe({
        next: () => {
          this.saving = false;
          this.closeFormModal();
        },
        error: () => {
          this.saving = false;
        }
      });
    }
  }

  promptDelete(stock: Stock): void {
    this.stockToDelete = stock;
    this.isConfirmDialogOpen = true;
  }

  cancelDelete(): void {
    this.isConfirmDialogOpen = false;
    this.stockToDelete = null;
  }

  confirmDelete(): void {
    if (!this.stockToDelete?.ID) return;

    const id = this.stockToDelete.ID;
    this.stockService.delete(id).subscribe({
      next: () => {
        this.cancelDelete();
      },
      error: () => {
        this.cancelDelete();
      }
    });
  }

  onRefresh(): void {
    this.stockService.loadStocks().subscribe();
  }

  onExportCsv(filteredStocks: Stock[]): void {
    this.stockService.exportToCsv(filteredStocks);
  }

  onExportPdf(filteredStocks: Stock[]): void {
    this.stockService.exportToPdf(filteredStocks);
  }

  filterLowStock(): void {
    if (this.stockListComponent) {
      this.stockListComponent.filterByLowStock();
    }
  }

  dismissNotification(): void {
    this.stockService.clearNotification();
  }

  get deleteMessage(): string {
    const name = this.stockToDelete?.Materials || 'this item';
    return `Are you sure you want to permanently remove "${name}" from the warehouse register?`;
  }
}
