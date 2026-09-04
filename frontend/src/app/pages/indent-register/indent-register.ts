import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IndentService } from '../../services/indent.service';
import { StockService } from '../../services/stock.service';
import {
  Indent,
  IndentItem,
  Engineer,
  INDENT_STATUS_OPTIONS,
  IndentStats,
  MaterialIndentGroup,
  EngineerIndentGroup
} from '../../models/indent.model';
import { Stock, COMMON_UNITS } from '../../models/stock.model';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-indent-register',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './indent-register.html',
  styleUrl: './indent-register.css'
})
export class IndentRegisterComponent implements OnInit {
  indents: Indent[] = [];
  availableStocks: Stock[] = [];
  availableEngineers: Engineer[] = [];
  isStatusDropdownOpen = false;
  loading = false;
  saving = false;
  error: string | null = null;
  notification: { type: 'success' | 'error' | 'info'; message: string } | null = null;

  // Sorting & View
  sortMode: 'material' | 'engineer' = 'material';
  detailViewMode: 'cards' | 'table' = 'cards';

  // Search & Filter
  searchQuery = '';
  statusFilter = 'ALL';

  // Modal form
  isModalOpen = false;
  isEditing = false;
  editingId: number | null = null;
  formError = '';

  statusOptions = INDENT_STATUS_OPTIONS;
  commonUnits = COMMON_UNITS;

  formData: Indent = {
    Indent_Date: new Date().toISOString().split('T')[0],
    Indent_No: '',
    Client_Name: '',
    Site_Engineer: '',
    items: []
  };

  // Delete dialog
  isConfirmDialogOpen = false;
  indentToDelete: Indent | null = null;

  stats: IndentStats = {
    totalIndents: 0,
    uniqueMaterials: 0,
    totalQuantity: 0,
    uniqueEngineers: 0,
    readyCount: 0,
    vendorCount: 0,
    pendingCount: 0
  };

  constructor(
    public indentService: IndentService,
    private stockService: StockService
  ) {}

  ngOnInit(): void {
    // Subscribe to indents state
    this.indentService.indents$.subscribe((list) => {
      this.indents = list;
      this.stats = this.indentService.calculateStats(list);
    });

    this.indentService.loading$.subscribe((l) => (this.loading = l));
    this.indentService.error$.subscribe((e) => (this.error = e));
    this.indentService.notification$.subscribe((n) => (this.notification = n));

    // Fetch existing stocks for material auto-suggestions
    this.stockService.stocks$.subscribe((s) => (this.availableStocks = s));

    // Fetch engineers from database
    this.indentService.getEngineers().subscribe((engineers) => {
      if (engineers && engineers.length > 0) {
        this.availableEngineers = engineers;
      } else {
        this.availableEngineers = [
          { Name: 'V Sharath' },
          { Name: 'K Karthikeyen' },
          { Name: 'S Karthikeyen' },
          { Name: 'Vairamani' },
          { Name: 'Rahul' },
          { Name: 'Soundarajan' },
          { Name: 'Sathish' }
        ];
      }
    });

    this.indentService.loadIndents().subscribe();
    this.stockService.loadStocks().subscribe();
  }

  // Filtered indents based on search and status
  get filteredIndents(): Indent[] {
    const q = this.searchQuery.trim().toLowerCase();

    const list = this.indents.filter((item) => {
      // Status filter: match if ANY material item has this status
      if (this.statusFilter !== 'ALL') {
        const matchesStatus = (item.items || []).some((it) => it.Status === this.statusFilter);
        if (!matchesStatus) {
          return false;
        }
      }

      // Search query across header and line items
      if (!q) return true;
      const itemsText = (item.items || []).map((it) => it.Materials).join(' ');
      const combined = `${item.Indent_No || ''} ${itemsText} ${item.Client_Name || ''} ${item.Site_Engineer || ''}`.toLowerCase();
      return combined.includes(q);
    });

    return list.sort((a, b) => (b.ID || 0) - (a.ID || 0));
  }

  get activeIndentsList(): Indent[] {
    return this.filteredIndents;
  }

  toggleSortMode(): void {
    this.sortMode = this.sortMode === 'material' ? 'engineer' : 'material';
    this.detailViewMode = 'cards';
  }

  openAddModal(): void {
    this.isEditing = false;
    this.editingId = null;
    this.formError = '';

    const todayStr = new Date().toISOString().split('T')[0];
    const defaultMat = this.availableStocks[0]?.Materials || '';
    const defaultUnit = this.availableStocks[0]?.Unit || 'Nos';

    this.formData = {
      Indent_Date: todayStr,
      Indent_No: this.generateIndentNumber(),
      Client_Name: '',
      Site_Engineer: '',
      items: [
        {
          Materials: '',
          Quantity: 1,
          Unit: 'Nos',
          Status: 'Ready to Issue',
          PO_WO: false
        }
      ]
    };
    this.isModalOpen = true;
    this.isStatusDropdownOpen = false;
  }

  openEditModal(indent: Indent): void {
    this.isEditing = true;
    this.editingId = indent.ID ?? null;
    this.formError = '';
    const cleanIndentNo = (indent.Indent_No || '').replace(/^IND-/i, 'IN-');
    this.formData = {
      ...indent,
      Indent_No: cleanIndentNo,
      items: (indent.items || []).map((it) => ({
        ...it,
        Quantity: Number(it.Quantity) || 1,
        Status: it.Status || 'Ready to Issue',
        PO_WO: !!it.PO_WO
      }))
    };
    if (!this.formData.items || this.formData.items.length === 0) {
      this.addMaterialItem();
    }
    if (
      indent.Site_Engineer &&
      !this.availableEngineers.some(
        (e) => e.Name.toLowerCase() === indent.Site_Engineer.trim().toLowerCase()
      )
    ) {
      this.availableEngineers.push({ Name: indent.Site_Engineer.trim() });
    }
    this.isModalOpen = true;
    this.isStatusDropdownOpen = false;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditing = false;
    this.editingId = null;
    this.formError = '';
    this.isStatusDropdownOpen = false;
  }

  toggleStatusDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
  }

  selectStatus(status: string): void {
    this.formData.Status = status;
    this.isStatusDropdownOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown-wrap')) {
      this.isStatusDropdownOpen = false;
    }
  }

  addMaterialItem(): void {
    if (!this.formData.items) {
      this.formData.items = [];
    }
    this.formData.items.push({
      Materials: '',
      Quantity: 1,
      Unit: 'Nos',
      Status: 'Ready to Issue',
      PO_WO: false
    });
  }

  removeMaterialItem(index: number): void {
    if (this.formData.items && this.formData.items.length > 1) {
      this.formData.items.splice(index, 1);
    }
  }

  onItemMaterialChange(item: IndentItem, matName: string): void {
    item.Materials = matName || '';
    if (!matName) return;
    const match = this.availableStocks.find(
      (s) => s.Materials && s.Materials.toLowerCase() === matName.trim().toLowerCase()
    );
    if (match && match.Unit) {
      item.Unit = match.Unit;
    }
  }

  togglePoWo(item: IndentItem, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    item.PO_WO = !item.PO_WO;
  }

  getIndentTotalQuantity(indent: Indent): number {
    return (indent.items || []).reduce((sum, it) => sum + (Number(it.Quantity) || 0), 0);
  }

  openDatePicker(event: Event): void {
    const input = event.target as HTMLInputElement;
    try {
      if (typeof input?.showPicker === 'function') {
        input.showPicker();
      }
    } catch {
      // Graceful fallback
    }
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  }

  saveIndent(): void {
    this.formError = '';

    if (!this.formData.Indent_Date) {
      this.formData.Indent_Date = new Date().toISOString().split('T')[0];
    }
    if (!this.formData.Indent_No?.trim()) {
      this.formError = 'Please enter an Indent Number.';
      return;
    }
    if (!this.formData.Client_Name?.trim()) {
      this.formError = 'Please enter Client Name.';
      return;
    }
    if (!this.formData.Site_Engineer?.trim()) {
      this.formError = 'Please enter Site Engineer name.';
      return;
    }

    const validItems: IndentItem[] = (this.formData.items || [])
      .filter((it) => it.Materials && it.Materials.trim().length > 0)
      .map((it) => ({
        ...it,
        Materials: it.Materials.trim(),
        Quantity: Math.max(0, Number(it.Quantity) || 0),
        Unit: (it.Unit || 'Nos').trim(),
        Status: it.Status || 'Ready to Issue',
        PO_WO: !!it.PO_WO
      }));

    if (validItems.length === 0) {
      this.formError = 'Please add at least one material to the indent.';
      return;
    }

    const payload: Indent = {
      Indent_Date: this.formData.Indent_Date,
      Indent_No: this.formData.Indent_No.trim(),
      Client_Name: this.formData.Client_Name.trim(),
      Site_Engineer: this.formData.Site_Engineer.trim(),
      Status: validItems[0]?.Status || 'Ready to Issue',
      items: validItems
    };

    this.saving = true;

    if (this.isEditing && this.editingId) {
      this.indentService.update(this.editingId, payload).subscribe({
        next: () => {
          this.saving = false;
          this.closeModal();
          this.indentService.notify('success', `Indent #${payload.Indent_No} updated successfully.`);
        },
        error: (err) => {
          this.saving = false;
          this.formError = err?.error?.error || 'Failed to update indent. Please try again.';
        }
      });
    } else {
      this.indentService.create(payload).subscribe({
        next: () => {
          this.saving = false;
          this.closeModal();
          this.indentService.notify('success', `Indent #${payload.Indent_No} created successfully.`);
        },
        error: (err) => {
          this.saving = false;
          this.formError = err?.error?.error || 'Failed to create indent. Please try again.';
        }
      });
    }
  }

  promptDelete(indent: Indent): void {
    this.indentToDelete = indent;
    this.isConfirmDialogOpen = true;
  }

  cancelDelete(): void {
    this.isConfirmDialogOpen = false;
    this.indentToDelete = null;
  }

  confirmDelete(): void {
    if (!this.indentToDelete?.ID) return;
    this.indentService.delete(this.indentToDelete.ID).subscribe({
      next: () => this.cancelDelete(),
      error: () => this.cancelDelete()
    });
  }

  onRefresh(): void {
    this.indentService.loadIndents().subscribe();
  }

  onExportCsv(): void {
    this.indentService.exportToCsv(this.activeIndentsList);
  }

  onExportPdf(): void {
    this.indentService.exportToPdf(this.activeIndentsList);
  }

  dismissNotification(): void {
    this.indentService.clearNotification();
  }

  getStatusBadgeClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s.includes('ready') || s.includes('issue') || s.includes('in-stock') || s.includes('in stock')) {
      return 'badge-ready';
    }
    if (s.includes('vendor') || s.includes('requested')) {
      return 'badge-vendor';
    }
    if (s.includes('pending') || s.includes('payment')) {
      return 'badge-pending';
    }
    return 'badge-default';
  }

  get deleteConfirmationMessage(): string {
    const no = this.indentToDelete?.Indent_No || '';
    return `Are you sure you want to permanently delete Indent #${no}? All requested materials under this indent will also be deleted.`;
  }

  private generateIndentNumber(): string {
    let maxNum = 0;
    for (const ind of this.indents) {
      if (ind.Indent_No) {
        const match = ind.Indent_No.match(/IN-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
    if (maxNum > 0) {
      const nextNum = maxNum + 1;
      return `IN-${nextNum.toString().padStart(3, '0')}`;
    }
    return 'IN-001';
  }
}
