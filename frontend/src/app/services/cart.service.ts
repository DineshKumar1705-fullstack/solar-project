import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of, map } from 'rxjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CartItem, CartStats } from '../models/cart.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly apiUrl = 'http://localhost:2000/api/cart';

  private itemsSubject = new BehaviorSubject<CartItem[]>([]);
  public items$ = this.itemsSubject.asObservable();

  public cartCount$: Observable<number> = this.items$.pipe(
    map((items) => items.length)
  );

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

  loadCartItems(): Observable<CartItem[]> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.http.get<CartItem[]>(this.apiUrl).pipe(
      tap({
        next: (data) => {
          this.itemsSubject.next(data);
          this.loadingSubject.next(false);
        },
        error: (err) => {
          this.loadingSubject.next(false);
          const msg = err.error?.error || 'Unable to connect to Cart API on Port 2000.';
          this.errorSubject.next(msg);
          this.notify('error', msg);
        }
      }),
      catchError(() => of([]))
    );
  }

  create(item: CartItem): Observable<CartItem> {
    this.loadingSubject.next(true);
    return this.http.post<CartItem>(this.apiUrl, item).pipe(
      tap({
        next: (newItem) => {
          this.loadingSubject.next(false);
          this.notify('success', `Item "${newItem.Materials}" added to cart successfully.`);
          this.loadCartItems().subscribe();
        },
        error: (err) => {
          this.loadingSubject.next(false);
          const msg = err.error?.error || 'Failed to add item to cart.';
          this.notify('error', msg);
        }
      })
    );
  }

  update(id: number, item: Partial<CartItem>): Observable<CartItem> {
    this.loadingSubject.next(true);
    return this.http.put<CartItem>(`${this.apiUrl}/${id}`, item).pipe(
      tap({
        next: (updatedItem) => {
          this.loadingSubject.next(false);
          this.notify('success', `Cart item "${updatedItem.Materials}" updated.`);
          this.loadCartItems().subscribe();
        },
        error: (err) => {
          this.loadingSubject.next(false);
          const msg = err.error?.error || 'Failed to update cart item.';
          this.notify('error', msg);
        }
      })
    );
  }

  delete(id: number): Observable<{ message: string }> {
    this.loadingSubject.next(true);
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`).pipe(
      tap({
        next: () => {
          this.loadingSubject.next(false);
          this.notify('success', 'Item removed from cart.');
          this.loadCartItems().subscribe();
        },
        error: (err) => {
          this.loadingSubject.next(false);
          const msg = err.error?.error || 'Failed to remove item from cart.';
          this.notify('error', msg);
        }
      })
    );
  }

  clearCart(): Observable<{ message: string }> {
    this.loadingSubject.next(true);
    return this.http.delete<{ message: string }>(this.apiUrl).pipe(
      tap({
        next: () => {
          this.loadingSubject.next(false);
          this.notify('info', 'Cart cleared.');
          this.loadCartItems().subscribe();
        },
        error: (err) => {
          this.loadingSubject.next(false);
          this.notify('error', 'Failed to clear cart.');
        }
      })
    );
  }

  calculateStats(items: CartItem[]): CartStats {
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, it) => sum + (Number(it.Quantity) || 0), 0);
    const uniqueSites = new Set(items.map((it) => it.Client_Site?.trim()).filter(Boolean)).size;
    const uniqueVendors = new Set(items.map((it) => it.Vendor_Name?.trim()).filter(Boolean)).size;

    const statusCounts: Record<string, number> = {};
    items.forEach((it) => {
      const st = it.Status || 'Yet to Start';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    return {
      totalItems,
      totalQuantity,
      uniqueSites,
      uniqueVendors,
      statusCounts
    };
  }

  notify(type: 'success' | 'error' | 'info', message: string, durationMs = 4000): void {
    this.notificationSubject.next({ type, message });
    if (durationMs > 0) {
      setTimeout(() => {
        if (this.notificationSubject.value?.message === message) {
          this.notificationSubject.next(null);
        }
      }, durationMs);
    }
  }

  exportToCsv(items: CartItem[], filename = 'Cart_Orders_Register.csv'): void {
    if (!items || items.length === 0) {
      this.notify('info', 'No cart items available to export.');
      return;
    }

    const headers = [
      'Order Date',
      'Materials',
      'Client Site',
      'Quantity',
      'Unit',
      'Vendor Name',
      'Status'
    ];

    const rows = items.map((it) => [
      `"${this.formatDateToDDMMYYYY(it.Order_Date)}"`,
      `"${(it.Materials || '').replace(/"/g, '""')}"`,
      `"${(it.Client_Site || '').replace(/"/g, '""')}"`,
      it.Quantity || 1,
      `"${(it.Unit || 'Nos').replace(/"/g, '""')}"`,
      `"${(it.Vendor_Name || '').replace(/"/g, '""')}"`,
      `"${(it.Status || 'Yet to Start').replace(/"/g, '""')}"`
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

    this.notify('success', 'Cart orders exported successfully to CSV.');
  }

  exportToPdf(items: CartItem[], filename = 'Cart_Orders_Register.pdf'): void {
    if (!items || items.length === 0) {
      this.notify('info', 'No cart items available to export.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    doc.setLineHeightFactor(1.55);

    // Title
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('CART & VENDOR PROCUREMENT REGISTER', 14, 16);

    // Subtitle
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const totalQty = items.reduce((sum, it) => sum + (Number(it.Quantity) || 0), 0);
    doc.text(`Generated on: ${dateStr} at ${timeStr}  |  Total Cart Items: ${items.length}  |  Total Order Quantity: ${totalQty}`, 14, 22);

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(14, 25, 283, 25);

    const head = [
      ['S.No', 'Order Date', 'Materials', 'Client / Project Site', 'Qty', 'Unit', 'Vendor Name', 'Status']
    ];

    const body = items.map((it, idx) => [
      (idx + 1).toString(),
      this.formatDateToDDMMYYYY(it.Order_Date),
      it.Materials || '',
      it.Client_Site || '',
      (it.Quantity || 1).toString(),
      it.Unit || 'Nos',
      it.Vendor_Name || '-',
      it.Status || 'Yet to Start'
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 28,
      theme: 'grid',
      tableWidth: 265,
      margin: { left: 16, right: 16, bottom: 20, top: 16 },
      rowPageBreak: 'avoid',
      styles: {
        fontSize: 8,
        cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240]
      },
      headStyles: {
        fillColor: [37, 99, 235], // Flipkart blue
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 24 },
        2: { cellWidth: 50, fontStyle: 'bold' },
        3: { cellWidth: 65 },
        4: { cellWidth: 15, halign: 'center' },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 41 },
        7: { cellWidth: 40, halign: 'center' }
      }
    });

    doc.save(filename);
    this.notify('success', 'Cart register exported successfully to PDF.');
  }

  private formatDateToDDMMYYYY(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  }
}
