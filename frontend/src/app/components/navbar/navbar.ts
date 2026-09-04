import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent implements OnInit {
  constructor(
    private router: Router,
    public cartService: CartService
  ) {}

  ngOnInit(): void {
    this.cartService.loadCartItems().subscribe();
  }

  get pageTitle(): string {
    if (this.router.url.includes('/cart')) {
      return 'Add To Cart';
    }
    return this.router.url.includes('/indents') ? 'Indent Register' : 'Stock Register';
  }
}
