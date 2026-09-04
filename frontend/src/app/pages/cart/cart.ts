import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { StockService } from '../../services/stock.service';
import { CartItem, CartStats, CART_STATUS_OPTIONS, CartStatusType } from '../../models/cart.model';
import { Stock, COMMON_UNITS } from '../../models/stock.model';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class CartComponent implements OnInit {
  cartItems: CartItem[] = [];
  availableStocks: Stock[] = [];
  loading = false;
  saving = false;
  error: string | null = null;
  notification: { type: 'success' | 'error' | 'info'; message: string } | null = null;

  stats: CartStats = {
    totalItems: 0,
    totalQuantity: 0,
    uniqueSites: 0,
    uniqueVendors: 0,
    statusCounts: {}
  };

  searchQuery = '';
  statusFilter = 'ALL';
  viewMode: 'cards' | 'table' = 'cards';

  statusOptions = CART_STATUS_OPTIONS;
  commonUnits = COMMON_UNITS;

  // Modal Form State
  isModalOpen = false;
  isEditing = false;
  editingId: number | null = null;
  formError = '';

  formData: CartItem = {
    Order_Date: new Date().toISOString().split('T')[0],
    Materials: '',
    Client_Site: '',
    Quantity: 1,
    Unit: 'Nos',
    Vendor_Name: '',
    Status: 'Yet to Start'
  };

  // Confirm Delete Dialog
  isConfirmDialogOpen = false;
  itemToDelete: CartItem | null = null;

  constructor(
    public cartService: CartService,
    private stockService: StockService
  ) {}

  ngOnInit(): void {
    this.cartService.items$.subscribe((items) => {
      this.cartItems = items;
      this.stats = this.cartService.calculateStats(items);
    });

    this.cartService.loading$.subscribe((l) => (this.loading = l));
    this.cartService.error$.subscribe((e) => (this.error = e));
    this.cartService.notification$.subscribe((n) => (this.notification = n));

    this.stockService.stocks$.subscribe((s) => (this.availableStocks = s));

    this.cartService.loadCartItems().subscribe();
    this.stockService.loadStocks().subscribe();
  }

  get filteredItems(): CartItem[] {
    const q = this.searchQuery.trim().toLowerCase();

    return this.cartItems.filter((item) => {
      // Status filter
      if (this.statusFilter !== 'ALL' && item.Status !== this.statusFilter) {
        return false;
      }

      // Search filter
      if (!q) return true;
      const combined = `${item.Materials || ''} ${item.Client_Site || ''} ${item.Vendor_Name || ''} ${item.Status || ''}`.toLowerCase();
      return combined.includes(q);
    });
  }

  openAddModal(): void {
    this.isEditing = false;
    this.editingId = null;
    this.formError = '';

    this.formData = {
      Order_Date: new Date().toISOString().split('T')[0],
      Materials: '',
      Client_Site: '',
      Quantity: 1,
      Unit: 'Nos',
      Vendor_Name: '',
      Status: 'Yet to Start'
    };
    this.isModalOpen = true;
  }

  openEditModal(item: CartItem): void {
    this.isEditing = true;
    this.editingId = item.ID ?? null;
    this.formError = '';

    this.formData = {
      ...item,
      Order_Date: item.Order_Date || new Date().toISOString().split('T')[0],
      Quantity: Number(item.Quantity) || 1,
      Status: item.Status || 'Yet to Start'
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditing = false;
    this.editingId = null;
    this.formError = '';
  }

  saveItem(): void {
    if (!this.formData.Materials || !this.formData.Materials.trim()) {
      this.formError = 'Please specify or select a Material.';
      return;
    }

    if (!this.formData.Client_Site || !this.formData.Client_Site.trim()) {
      this.formError = 'Please specify the Client / Project Site.';
      return;
    }

    if (this.formData.Quantity < 1) {
      this.formError = 'Quantity must be at least 1.';
      return;
    }

    this.saving = true;
    this.formError = '';

    const payload: CartItem = {
      ...this.formData,
      Materials: this.formData.Materials.trim(),
      Client_Site: this.formData.Client_Site.trim(),
      Vendor_Name: (this.formData.Vendor_Name || '').trim(),
      Quantity: Number(this.formData.Quantity) || 1
    };

    if (this.isEditing && this.editingId) {
      this.cartService.update(this.editingId, payload).subscribe({
        next: () => {
          this.saving = false;
          this.closeModal();
        },
        error: (err) => {
          this.saving = false;
          this.formError = err.error?.error || 'Failed to update item.';
        }
      });
    } else {
      this.cartService.create(payload).subscribe({
        next: () => {
          this.saving = false;
          this.closeModal();
        },
        error: (err) => {
          this.saving = false;
          this.formError = err.error?.error || 'Failed to add item.';
        }
      });
    }
  }

  // Inline Quick Stepper
  updateQuantity(item: CartItem, delta: number): void {
    if (!item.ID) return;
    const newQty = Math.max(1, (Number(item.Quantity) || 1) + delta);
    if (newQty === item.Quantity) return;

    item.Quantity = newQty;
    this.cartService.update(item.ID, { Quantity: newQty }).subscribe();
  }

  // Inline Quick Status Change
  onStatusChange(item: CartItem, newStatus: string): void {
    if (!item.ID || item.Status === newStatus) return;
    item.Status = newStatus;
    this.cartService.update(item.ID, { Status: newStatus }).subscribe();
  }

  // Delete Prompt
  get deleteMessage(): string {
    return `Are you sure you want to remove "${this.itemToDelete?.Materials || 'this item'}" from the cart?`;
  }

  promptDelete(item: CartItem): void {
    this.itemToDelete = item;
    this.isConfirmDialogOpen = true;
  }

  confirmDelete(): void {
    if (this.itemToDelete && this.itemToDelete.ID) {
      this.cartService.delete(this.itemToDelete.ID).subscribe({
        next: () => {
          this.isConfirmDialogOpen = false;
          this.itemToDelete = null;
        }
      });
    }
  }

  cancelDelete(): void {
    this.isConfirmDialogOpen = false;
    this.itemToDelete = null;
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  }

  getStatusClass(status: string | undefined): string {
    const s = (status || '').toLowerCase();
    if (s.includes('dispatched')) return 'status-dispatched';
    if (s.includes('porter')) return 'status-porter';
    if (s.includes('payment')) return 'status-payment';
    if (s.includes('po')) return 'status-po';
    if (s.includes('vendor') || s.includes('requested')) return 'status-vendor';
    return 'status-start';
  }

  exportCsv(): void {
    this.cartService.exportToCsv(this.filteredItems);
  }

  exportPdf(): void {
    this.cartService.exportToPdf(this.filteredItems);
  }

  refresh(): void {
    this.cartService.loadCartItems().subscribe();
  }
}
