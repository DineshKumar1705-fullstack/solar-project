import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Stock, StockStats } from '../models/stock.model';

@Injectable({
  providedIn: 'root'
})
export class StockService {
  private readonly apiUrl = 'http://localhost:2000/api/stocks';

  private stocksSubject = new BehaviorSubject<Stock[]>([]);
  public stocks$ = this.stocksSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  private notificationSubject = new BehaviorSubject<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  public notification$ = this.notificationSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Fetch all stocks and update reactive state stream
   */
  loadStocks(): Observable<Stock[]> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.http.get<Stock[]>(this.apiUrl).pipe(
      tap({
        next: (data) => {
          this.stocksSubject.next(data);
          this.loadingSubject.next(false);
        },
        error: (err) => {
          const message = err.status === 0
            ? 'Cannot connect to warehouse server. Ensure backend is running on port 2000.'
            : (err.error?.error || 'Failed to fetch warehouse stock items.');
          this.errorSubject.next(message);
          this.loadingSubject.next(false);
        }
      })
    );
  }

  /**
   * Get single stock record by ID
   */
  getById(id: number): Observable<Stock> {
    return this.http.get<Stock>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create new stock item
   */
  create(stock: Stock): Observable<Stock> {
    this.loadingSubject.next(true);
    return this.http.post<Stock>(this.apiUrl, stock).pipe(
      tap({
        next: (newStock) => {
          this.loadingSubject.next(false);
          this.notify('success', `Stock item "${newStock.Materials}" added successfully.`);
          this.loadStocks().subscribe();
        },
        error: (err) => {
          this.loadingSubject.next(false);
          const msg = err.error?.error || 'Failed to add stock item.';
          this.notify('error', msg);
        }
      })
    );
  }

  /**
   * Update existing stock item
   */
  update(id: number, stock: Stock): Observable<Stock> {
    this.loadingSubject.next(true);
    return this.http.put<Stock>(`${this.apiUrl}/${id}`, stock).pipe(
      tap({
        next: (updatedStock) => {
          this.loadingSubject.next(false);
          this.notify('success', `Stock item "${updatedStock.Materials}" updated successfully.`);
          this.loadStocks().subscribe();
        },
        error: (err) => {
          this.loadingSubject.next(false);
          const msg = err.error?.error || 'Failed to update stock item.';
          this.notify('error', msg);
        }
      })
    );
  }

  /**
   * Delete stock item by ID
   */
  delete(id: number): Observable<{ message: string }> {
    this.loadingSubject.next(true);
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`).pipe(
      tap({
        next: () => {
          this.loadingSubject.next(false);
          this.notify('success', 'Stock item deleted successfully.');
          this.loadStocks().subscribe();
        },
        error: (err) => {
          this.loadingSubject.next(false);
          const msg = err.error?.error || 'Failed to delete stock item.';
          this.notify('error', msg);
        }
      })
    );
  }

  /**
   * Calculate warehouse metrics from stock list
   */
  calculateStats(stocks: Stock[], totalIndents = 0, allottedEngineersCount = 0): StockStats {
    const totalSkus = stocks.length;
    const totalQuantity = stocks.reduce(
      (sum, item) => sum + (Number(item.In_Stock) || 0),
      0
    );
    const uniqueUnits = new Set(stocks.map((item) => item.Unit?.trim()).filter(Boolean)).size;
    const lowStockCount = stocks.filter(
      (item) => Number(item.In_Stock || 0) < 10
    ).length;

    return {
      totalSkus,
      totalQuantity,
      uniqueUnits,
      totalIndents,
      allottedEngineersCount,
      lowStockCount
    };
  }

  /**
   * Trigger user notification banner with auto-dismiss
   */
  notify(type: 'success' | 'error' | 'info', message: string, durationMs = 4000): void {
    this.notificationSubject.next({ type, message });
    if (durationMs > 0) {
      setTimeout(() => {
        if (this.notificationSubject.value?.message === message) {
          this.clearNotification();
        }
      }, durationMs);
    }
  }

  clearNotification(): void {
    this.notificationSubject.next(null);
  }

  /**
   * Export stock items to CSV file
   */
  exportToCsv(stocks: Stock[], filename = 'Warehouse_Stock_Register.csv'): void {
    if (!stocks || stocks.length === 0) {
      this.notify('info', 'No stock data available to export.');
      return;
    }

    const headers = ['ID', 'Materials', 'Descriptions', 'Unit', 'In_Stock W.H'];
    const rows = stocks.map((s) => [
      s.ID ?? '',
      `"${(s.Materials || '').replace(/"/g, '""')}"`,
      `"${(s.Descriptions || '').replace(/"/g, '""')}"`,
      `"${(s.Unit || '').replace(/"/g, '""')}"`,
      Number(s.In_Stock) || 0
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    this.notify('success', 'Stock register exported successfully to CSV.');
  }

  /**
   * Export stock items to a styled PDF document
   */
  exportToPdf(stocks: Stock[], filename = 'Warehouse_Stock_Register.pdf'): void {
    if (!stocks || stocks.length === 0) {
      this.notify('info', 'No stock data available to export to PDF.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Header Title
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // #0f172a
    doc.setFont('helvetica', 'bold');
    doc.text('WAREHOUSE STOCK REGISTER', 14, 18);

    // Subtitle & Statistics
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // #64748b
    doc.setFont('helvetica', 'normal');
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const totalUnits = stocks.reduce((sum, item) => sum + (Number(item.In_Stock) || 0), 0);
    doc.text(`Generated on: ${dateStr} at ${timeStr}  |  Total SKUs: ${stocks.length}  |  Total Warehouse Units: ${totalUnits}`, 14, 25);

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(14, 28, 196, 28);

    // Table Content
    const head = [['S.No', 'Material / Item Name', 'Description', 'Unit', 'In-Stock W.H', 'Status']];
    const body = stocks.map((s, index) => {
      const qty = Number(s.In_Stock) || 0;
      const status = qty === 0 ? 'Out of Stock' : (qty < 10 ? 'Low Stock' : 'In Stock');
      return [
        (index + 1).toString(),
        s.Materials || '',
        s.Descriptions || '',
        s.Unit || '',
        qty.toLocaleString(),
        status
      ];
    });

    autoTable(doc, {
      head,
      body,
      startY: 32,
      theme: 'grid',
      headStyles: {
        fillColor: [13, 148, 136], // #0d9488
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 16, halign: 'center' },
        1: { cellWidth: 50, fontStyle: 'bold' },
        2: { cellWidth: 60 },
        3: { cellWidth: 18 },
        4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 24, halign: 'center' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          if (data.cell.raw === 'Out of Stock') {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = 'bold';
          } else if (data.cell.raw === 'Low Stock') {
            data.cell.styles.textColor = [180, 83, 9];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [5, 150, 105];
          }
        }
      },
      didDrawPage: () => {
        const str = `Page ${doc.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(str, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
        doc.text('Warehouse Stock Register - Live Control Report', 14, doc.internal.pageSize.height - 10);
      }
    });

    doc.save(filename);
    this.notify('success', 'Stock register exported successfully to PDF.');
  }
}
