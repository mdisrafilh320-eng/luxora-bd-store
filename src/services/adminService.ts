/**
 * Luxora BD - Enterprise Admin & Financial Analytics Service
 * Provides executive metric computations, ledger accounting, profit margin calculators,
 * and reporting export capabilities.
 */

import { Order, Product } from '../types';

export interface ExecutiveMetrics {
  totalRevenue: number;
  todaySales: number;
  ordersCount: number;
  pendingOrdersCount: number;
  lowStockItemsCount: number;
  activeCustomersCount: number;
  averageOrderValue: number;
  grossProfit: number;
  estimatedMarginPercent: number;
  gatewayDistribution: {
    bkash: number;
    nagad: number;
    rocket: number;
    cod: number;
    card: number;
  };
  statusDistribution: {
    pending: number;
    processing: number;
    inTransit: number;
    delivered: number;
    cancelled: number;
  };
  dailyTrend: {
    day: string;
    sales: number;
    orders: number;
  }[];
}

export interface FinancialLedgerEntry {
  id: string;
  orderId: string;
  date: string;
  customerName: string;
  paymentMethod: string;
  grossAmount: number;
  gatewayFee: number; // ~1.5% for MFS
  shippingCost: number; // BDT 120-200
  estimatedCogs: number; // Cost of goods ~ 65% of subtotal
  netProfit: number;
  status: string;
}

/**
 * Calculate comprehensive ERP metrics from orders and products
 */
export function calculateExecutiveMetrics(orders: Order[], products: Product[]): ExecutiveMetrics {
  let totalRevenue = 0;
  let todaySales = 0;
  let pendingOrdersCount = 0;
  const uniqueCustomerSet = new Set<string>();

  const todayStr = new Date().toISOString().split('T')[0];

  const gatewayDistribution = {
    bkash: 0,
    nagad: 0,
    rocket: 0,
    cod: 0,
    card: 0,
  };

  const statusDistribution = {
    pending: 0,
    processing: 0,
    inTransit: 0,
    delivered: 0,
    cancelled: 0,
  };

  // Group daily trend for last 7 days
  const dailyMap: { [dateStr: string]: { sales: number; orders: number } } = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toLocaleDateString('en-US', { weekday: 'short' });
    dailyMap[key] = { sales: 0, orders: 0 };
  }

  orders.forEach((order) => {
    // Only count non-cancelled for gross metrics
    if (order.orderStatus !== 'Cancelled') {
      totalRevenue += order.totalAmount;
      
      const orderDate = order.createdAt ? order.createdAt.split('T')[0] : '';
      if (orderDate === todayStr) {
        todaySales += order.totalAmount;
      }
    }

    if (order.orderStatus === 'Pending') {
      pendingOrdersCount++;
    }

    // Customer tracking
    const custId = order.userId !== 'guest' ? order.userId : (order.customer?.phone || order.id);
    uniqueCustomerSet.add(custId);

    // Gateway
    const method = order.paymentMethod?.toLowerCase() || 'cod';
    if (method.includes('bkash')) gatewayDistribution.bkash += order.totalAmount;
    else if (method.includes('nagad')) gatewayDistribution.nagad += order.totalAmount;
    else if (method.includes('rocket')) gatewayDistribution.rocket += order.totalAmount;
    else if (method.includes('card')) gatewayDistribution.card += order.totalAmount;
    else gatewayDistribution.cod += order.totalAmount;

    // Status
    const st = order.orderStatus;
    if (st === 'Pending') statusDistribution.pending++;
    else if (st === 'Processing' || st === 'Confirmed') statusDistribution.processing++;
    else if (st === 'In Transit' || st === 'Shipped') statusDistribution.inTransit++;
    else if (st === 'Delivered') statusDistribution.delivered++;
    else if (st === 'Cancelled') statusDistribution.cancelled++;

    // Daily bucket
    if (order.createdAt) {
      const dayName = new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
      if (dailyMap[dayName]) {
        dailyMap[dayName].sales += order.totalAmount;
        dailyMap[dayName].orders += 1;
      }
    }
  });

  const lowStockItemsCount = products.filter((p) => (p.stockCount ?? 10) <= 5).length;
  const ordersCount = orders.length;
  const averageOrderValue = ordersCount > 0 ? Math.round(totalRevenue / ordersCount) : 0;
  
  // Luxury gadget margins are typically 32% - 38%
  const grossProfit = Math.round(totalRevenue * 0.35);
  const estimatedMarginPercent = totalRevenue > 0 ? 35.0 : 0;

  const dailyTrend = Object.entries(dailyMap).map(([day, val]) => ({
    day,
    sales: val.sales,
    orders: val.orders,
  }));

  return {
    totalRevenue,
    todaySales,
    ordersCount,
    pendingOrdersCount,
    lowStockItemsCount,
    activeCustomersCount: uniqueCustomerSet.size,
    averageOrderValue,
    grossProfit,
    estimatedMarginPercent,
    gatewayDistribution,
    statusDistribution,
    dailyTrend,
  };
}

/**
 * Generate granular financial ledger entries for all completed and active orders
 */
export function generateFinancialLedger(orders: Order[]): FinancialLedgerEntry[] {
  return orders.map((order, idx) => {
    const grossAmount = order.totalAmount;
    const isMfs = order.paymentMethod === 'bkash' || order.paymentMethod === 'nagad' || order.paymentMethod === 'rocket';
    const gatewayFee = isMfs ? Math.round(grossAmount * 0.015) : 0;
    const shippingCost = order.deliveryCharge > 0 ? order.deliveryCharge : 120;
    const estimatedCogs = Math.round(order.subtotal * 0.65);
    const netProfit = order.orderStatus === 'Cancelled' ? 0 : Math.max(0, grossAmount - gatewayFee - shippingCost - estimatedCogs);

    return {
      id: `LED-${order.id}`,
      orderId: order.id,
      date: new Date(order.createdAt || Date.now()).toLocaleDateString('en-GB'),
      customerName: order.customer?.name || 'Guest Client',
      paymentMethod: (order.paymentMethod || 'COD').toUpperCase(),
      grossAmount,
      gatewayFee,
      shippingCost,
      estimatedCogs,
      netProfit,
      status: order.orderStatus,
    };
  });
}

/**
 * Export Financial Ledger to CSV format and trigger instant browser download
 */
export function exportLedgerToCSV(ledger: FinancialLedgerEntry[]): void {
  const headers = [
    'Ledger Entry ID',
    'Order ID',
    'Date',
    'Customer Name',
    'Payment Gateway',
    'Gross Invoiced (BDT)',
    'MFS Gateway Fee (BDT)',
    'Logistics Shipping Cost (BDT)',
    'Est. COGS (BDT)',
    'Net Margin / Profit (BDT)',
    'Fulfillment Status',
  ];

  const rows = ledger.map((entry) => [
    `"${entry.id}"`,
    `"${entry.orderId}"`,
    `"${entry.date}"`,
    `"${entry.customerName.replace(/"/g, '""')}"`,
    `"${entry.paymentMethod}"`,
    entry.grossAmount,
    entry.gatewayFee,
    entry.shippingCost,
    entry.estimatedCogs,
    entry.netProfit,
    `"${entry.status}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `LUXORA_BD_FINANCIAL_LEDGER_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
