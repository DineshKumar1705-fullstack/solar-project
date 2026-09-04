import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Indent,
  IndentItem,
  Engineer,
  IndentStats,
  MaterialIndentGroup,
  EngineerIndentGroup
} from '../models/indent.model';

@Injectable({
  providedIn: 'root'
})
export class IndentService {
  private readonly apiUrl = 'http://localhost:2000/api/indents';
  private readonly engineersApiUrl = 'http://localhost:2000/api/engineers';

  private indentsSubject = new BehaviorSubject<Indent[]>([]);
  public indents$ = this.indentsSubject.asObservable();

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

  loadIndents(): Observable<Indent[]> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.http.get<Indent[]>(this.apiUrl).pipe(
      tap({
        next: (data) => {
          this.indentsSubject.next(data);
          this.loadingSubject.next(false);
        },
        error: (err) => {
          const message = err.status === 0
            ? 'Cannot connect to backend server. Ensure server is running on port 2000.'
            : (err.error?.error || 'Failed to fetch indent records.');
          this.errorSubject.next(message);
          this.loadingSubject.next(false);
        }
      })
    );
  }

  getById(id: number): Observable<Indent> {
    return this.http.get<Indent>(`${this.apiUrl}/${id}`);
  }

  create(indent: Indent): Observable<Indent> {
    this.loadingSubject.next(true);
    return this.http.post<Indent>(this.apiUrl, indent).pipe(
      tap({
        next: (newIndent) => {
          this.loadingSubject.next(false);
          this.notify('success', `Indent "${newIndent.Indent_No}" created successfully.`);
          this.loadIndents().subscribe();
        },
        error: (err) => {
          this.loadingSubject.next(false);
          const msg = err.error?.error || 'Failed to create indent.';
          this.notify('error', msg);
        }
      })
    );
  }

  update(id: number, indent: Indent): Observable<Indent> {
    this.loadingSubject.next(true);
    return this.http.put<Indent>(`${this.apiUrl}/${id}`, indent).pipe(
      tap({
        next: (updated) => {
          this.loadingSubject.next(false);
          this.notify('success', `Indent "${updated.Indent_No}" updated successfully.`);
          this.loadIndents().subscribe();
        },
        error: (err) => {
          this.loadingSubject.next(false);
          const msg = err.error?.error || 'Failed to update indent.';
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
          this.notify('success', 'Indent record deleted successfully.');
          this.loadIndents().subscribe();
        },
        error: (err) => {
          this.loadingSubject.next(false);
          const msg = err.error?.error || 'Failed to delete indent.';
          this.notify('error', msg);
        }
      })
    );
  }

  getEngineers(): Observable<Engineer[]> {
    return this.http.get<Engineer[]>(this.engineersApiUrl).pipe(
      catchError((err) => {
        console.warn('Could not fetch engineers from API:', err);
        return of([]);
      })
    );
  }

  calculateStats(indents: Indent[]): IndentStats {
    const totalIndents = indents.length;
    const allItems = indents.flatMap((i) => i.items || []);
    const uniqueMaterials = new Set(allItems.map((i) => i.Materials?.trim().toLowerCase()).filter(Boolean)).size;
    const totalQuantity = allItems.reduce((sum, item) => sum + (Number(item.Quantity) || 0), 0);
    const uniqueEngineers = new Set(indents.map((i) => i.Site_Engineer?.trim().toLowerCase()).filter(Boolean)).size;

    const readyCount = allItems.filter((it) => {
      const s = (it.Status || '').toLowerCase();
      return s.includes('ready') || s.includes('issue') || s.includes('in-stock') || s.includes('in stock');
    }).length;

    const vendorCount = allItems.filter((it) => {
      const s = (it.Status || '').toLowerCase();
      return s.includes('vendor') || s.includes('requested');
    }).length;

    const pendingCount = allItems.filter((it) => {
      const s = (it.Status || '').toLowerCase();
      return s.includes('pending') || s.includes('payment');
    }).length;

    return {
      totalIndents,
      uniqueMaterials,
      totalQuantity,
      uniqueEngineers,
      readyCount,
      vendorCount,
      pendingCount
    };
  }

  groupByMaterials(indents: Indent[]): MaterialIndentGroup[] {
    const map = new Map<string, { totalQty: number; unit: string; indents: Indent[] }>();

    for (const indent of indents) {
      const items = indent.items || [];
      for (const item of items) {
        const mat = item.Materials?.trim() || 'Unassigned Material';
        if (!map.has(mat)) {
          map.set(mat, { totalQty: 0, unit: item.Unit || '', indents: [] });
        }
        const entry = map.get(mat)!;
        entry.totalQty += Number(item.Quantity) || 0;
        if (!entry.indents.includes(indent)) {
          entry.indents.push(indent);
        }
      }
    }

    return Array.from(map.entries()).map(([material, data]) => ({
      material,
      totalIndents: data.indents.length,
      totalQuantity: data.totalQty,
      unit: data.unit,
      indents: data.indents
    })).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }

  groupByEngineers(indents: Indent[]): EngineerIndentGroup[] {
    const map = new Map<string, Indent[]>();

    for (const item of indents) {
      const key = item.Site_Engineer?.trim() || 'Unassigned Engineer';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    }

    return Array.from(map.entries()).map(([engineer, list]) => {
      const engineerItems = list.flatMap((i) => i.items || []);
      const totalQuantity = engineerItems.reduce((sum, it) => sum + (Number(it.Quantity) || 0), 0);
      const materialsCount = new Set(engineerItems.map((it) => it.Materials?.trim().toLowerCase()).filter(Boolean)).size;
      return {
        engineer,
        totalIndents: list.length,
        totalQuantity,
        materialsCount,
        indents: list
      };
    }).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }

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

  exportToCsv(indents: Indent[], filename = 'Indent_Register.csv'): void {
    if (!indents || indents.length === 0) {
      this.notify('info', 'No indent data available to export.');
      return;
    }

    const headers = [
      'Indent Date',
      'Indent No',
      'Site Engineer',
      'Client Name',
      'Materials Requested',
      'Status'
    ];

    const rows = indents.map((i) => {
      const items = i.items || [];
      const matSummary = items
        .map((it) => `${it.Materials} (${it.Quantity} ${it.Unit})`)
        .join('; ');
      const statusSummary = items
        .map((it) => `${it.Status || 'Ready to Issue'}${it.PO_WO ? ' [PO/WO]' : ''}`)
        .join('; ');
      return [
        `"${this.formatDateToDDMMYYYY(i.Indent_Date)}"`,
        `"${(i.Indent_No || '').replace(/"/g, '""')}"`,
        `"${(i.Site_Engineer || '').replace(/"/g, '""')}"`,
        `"${(i.Client_Name || '').replace(/"/g, '""')}"`,
        `"${matSummary.replace(/"/g, '""')}"`,
        `"${statusSummary.replace(/"/g, '""')}"`
      ];
    });

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

    this.notify('success', 'Indent register exported successfully to CSV.');
  }

  exportToPdf(indents: Indent[], filename = 'Indent_Register.pdf'): void {
    if (!indents || indents.length === 0) {
      this.notify('info', 'No indent data available to export to PDF.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    doc.setLineHeightFactor(1.55);

    // Header Title
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('INDENT REQUISITION REGISTER', 14, 16);

    // Subtitle & Statistics
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const totalQty = indents.reduce((sum, item) => {
      const items = item.items || [];
      return sum + items.reduce((isum, it) => isum + (Number(it.Quantity) || 0), 0);
    }, 0);
    doc.text(`Generated on: ${dateStr} at ${timeStr}  |  Total Indents: ${indents.length}  |  Total Requisition Quantity: ${totalQty}`, 14, 22);

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(14, 25, 283, 25);

    // Table Content with separate Status column
    const head = [
      ['S.No', 'Date', 'Indent No', 'Site Engineer', 'Client Name', 'Materials Requested', 'Status']
    ];

    const body = indents.map((item, index) => {
      const items = item.items || [];
      const matSummary = items
        .map((it) => `• ${it.Materials} - ${it.Quantity} ${it.Unit}`)
        .join('\n');
      const statusContent = items
        .map((it) => it.Status || 'Ready to Issue')
        .join('\n');

      return [
        (index + 1).toString(),
        this.formatDateToDDMMYYYY(item.Indent_Date),
        item.Indent_No || '',
        item.Site_Engineer || '',
        item.Client_Name || '',
        matSummary || 'No materials added',
        items.length > 0
          ? {
              content: statusContent,
              items: items
            }
          : '-'
      ];
    });

    autoTable(doc, {
      head,
      body,
      startY: 28,
      theme: 'grid',
      tableWidth: 265,
      margin: { left: 16, right: 16, bottom: 20, top: 16 },
      rowPageBreak: 'avoid',
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240]
      },
      headStyles: {
        fillColor: [13, 148, 136],
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 24 },
        2: { cellWidth: 24, fontStyle: 'bold' },
        3: { cellWidth: 38 },
        4: { cellWidth: 55 },
        5: { cellWidth: 80 },
        6: { cellWidth: 32, halign: 'center' }
      },
      willDrawCell: (data) => {
        if (data.column.index === 6 && data.section === 'body') {
          const raw = data.cell.raw as { content?: string; items?: IndentItem[] };
          if (raw && raw.items && raw.items.length > 0) {
            data.cell.text = [];
          }
        }
      },
      didDrawCell: (data) => {
        if (data.column.index === 6 && data.section === 'body') {
          const raw = data.cell.raw as { content?: string; items?: IndentItem[] };
          if (!raw || !raw.items || raw.items.length === 0) return;

          const textPos = data.cell.getTextPos();
          const fontSize = data.cell.styles.fontSize || 7.5;
          const lhFactor = (data.cell.styles as any).lineHeightFactor || 1.55;
          const scale = doc.internal.scaleFactor;
          const lineH = (fontSize * lhFactor) / scale;
          const cellW = data.cell.width;
          const cellX = data.cell.x;

          raw.items.forEach((it, idx) => {
            const lineY = textPos.y + idx * lineH;
            const status = it.Status || 'Ready to Issue';
            const label = it.PO_WO ? `${status} | PO/WO` : status;

            let bg = [220, 252, 231]; // light green (#dcfce7)
            let border = [134, 239, 172]; // (#86efac)
            let textCol = [22, 101, 52]; // dark green (#166534)
            const s = status.toLowerCase();

            if (s.includes('vendor') || s.includes('requested')) {
              bg = [254, 249, 195]; // light yellow (#fef9c3)
              border = [253, 224, 71]; // (#fde047)
              textCol = [133, 77, 14]; // dark amber (#854d0e)
            } else if (s.includes('pending')) {
              bg = [254, 226, 226]; // light pink/red (#fee2e2)
              border = [252, 165, 165]; // (#fca5a5)
              textCol = [153, 27, 27]; // dark red (#991b1b)
            }

            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            const badgeW = 27;
            const badgeH = 3.8;
            const badgeX = cellX + (cellW - badgeW) / 2;
            const badgeY = lineY + (lineH - badgeH) / 2;

            // Draw rounded pill background with 1mm radius
            doc.setFillColor(bg[0], bg[1], bg[2]);
            doc.setDrawColor(border[0], border[1], border[2]);
            doc.setLineWidth(0.15);
            doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'FD');

            // Draw pill text centered both horizontally and vertically
            doc.setTextColor(textCol[0], textCol[1], textCol[2]);
            doc.text(label, badgeX + badgeW / 2, badgeY + badgeH / 2 + 0.8, { align: 'center' });
          });
        }
      },
      didDrawPage: () => {
        const str = `Page ${doc.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(str, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
        doc.text('Warehouse Management System - Indent Requisition Report', 14, doc.internal.pageSize.height - 10);
      }
    });

    doc.save(filename);
    this.notify('success', 'Indent register exported successfully to PDF.');
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
