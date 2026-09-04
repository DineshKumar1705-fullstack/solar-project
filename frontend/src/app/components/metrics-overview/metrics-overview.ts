import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockStats } from '../../models/stock.model';

@Component({
  selector: 'app-metrics-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './metrics-overview.html',
  styleUrl: './metrics-overview.css'
})
export class MetricsOverviewComponent {
  @Input() stats: StockStats = {
    totalSkus: 0,
    totalIndents: 0,
    allottedEngineersCount: 0,
    lowStockCount: 0
  };

  @Output() filterLowStock = new EventEmitter<void>();

  onLowStockClick(): void {
    this.filterLowStock.emit();
  }
}
