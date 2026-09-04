import { Routes } from '@angular/router';
import { StockRegisterComponent } from './pages/stock-register/stock-register';
import { IndentRegisterComponent } from './pages/indent-register/indent-register';
import { CartComponent } from './pages/cart/cart';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'stocks',
    pathMatch: 'full'
  },
  {
    path: 'stocks',
    component: StockRegisterComponent,
    title: 'Warehouse Stock Register'
  },
  {
    path: 'indents',
    component: IndentRegisterComponent,
    title: 'Warehouse Indent Register'
  },
  {
    path: 'cart',
    component: CartComponent,
    title: 'Add To Cart - Procurement'
  },
  {
    path: '**',
    redirectTo: 'stocks'
  }
];
