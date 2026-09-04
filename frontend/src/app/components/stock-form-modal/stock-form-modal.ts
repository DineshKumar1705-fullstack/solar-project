import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Stock, COMMON_UNITS } from '../../models/stock.model';

@Component({
  selector: 'app-stock-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-form-modal.html',
  styleUrl: './stock-form-modal.css'
})
export class StockFormModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() stockToEdit: Stock | null = null;
  @Input() saving = false;

  @Output() save = new EventEmitter<Stock>();
  @Output() cancel = new EventEmitter<void>();

  commonUnits = COMMON_UNITS;
  isCustomUnit = false;
  customUnitValue = '';

  formData: Stock = {
    Materials: '',
    Descriptions: '',
    Unit: 'Nos',
    In_Stock: 0
  };

  errorMessage = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.initForm();
    }
  }

  initForm(): void {
    this.errorMessage = '';
    if (this.stockToEdit) {
      this.formData = {
        ID: this.stockToEdit.ID,
        Materials: this.stockToEdit.Materials || '',
        Descriptions: this.stockToEdit.Descriptions || '',
        Unit: this.stockToEdit.Unit || 'Nos',
        In_Stock: Number(this.stockToEdit.In_Stock) || 0
      };

      const isKnown = this.commonUnits.includes(this.formData.Unit as any);
      if (!isKnown && this.formData.Unit) {
        this.isCustomUnit = true;
        this.customUnitValue = this.formData.Unit;
      } else {
        this.isCustomUnit = false;
        this.customUnitValue = '';
      }
    } else {
      this.formData = {
        Materials: '',
        Descriptions: '',
        Unit: 'Nos',
        In_Stock: 0
      };
      this.isCustomUnit = false;
      this.customUnitValue = '';
    }
  }

  onUnitSelectChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    if (val === '__CUSTOM__') {
      this.isCustomUnit = true;
      this.formData.Unit = this.customUnitValue || '';
    } else {
      this.isCustomUnit = false;
      this.formData.Unit = val;
    }
  }

  onCustomUnitInput(val: string): void {
    this.customUnitValue = val;
    this.formData.Unit = val;
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (!this.formData.Materials?.trim()) {
      this.errorMessage = 'Please enter material or item name.';
      return;
    }

    if (!this.formData.Descriptions?.trim()) {
      this.errorMessage = 'Please enter item description or specifications.';
      return;
    }

    const finalUnit = this.isCustomUnit ? this.customUnitValue?.trim() : this.formData.Unit?.trim();
    if (!finalUnit) {
      this.errorMessage = 'Please specify a unit of measurement.';
      return;
    }

    const inStock = Number(this.formData.In_Stock);
    if (isNaN(inStock) || inStock < 0) {
      this.errorMessage = 'In-Stock warehouse quantity must be 0 or greater.';
      return;
    }

    const payload: Stock = {
      ...this.formData,
      Materials: this.formData.Materials.trim(),
      Descriptions: this.formData.Descriptions.trim(),
      Unit: finalUnit,
      In_Stock: Math.floor(inStock)
    };

    this.save.emit(payload);
  }

  onClose(): void {
    this.errorMessage = '';
    this.cancel.emit();
  }

  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onClose();
    }
  }
}
