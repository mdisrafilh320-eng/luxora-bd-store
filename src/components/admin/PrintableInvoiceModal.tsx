import React from 'react';
import { motion } from 'motion/react';
import { Printer, Download, X, ShieldCheck, Phone, MapPin, Package } from 'lucide-react';
import { Order } from '../../types';

interface PrintableInvoiceModalProps {
  order: Order;
  onClose: () => void;
}

const CHANNEL_LABELS: Record<string, string> = {
  luxora_web: 'Luxora Storefront',
  web: 'Website Live Chat',
  messenger: 'Facebook Messenger',
  whatsapp: 'WhatsApp Business',
  instagram: 'Instagram Direct',
  tiktok: 'TikTok Shop / DM',
  shopify: 'Shopify Sync',
  woocommerce: 'WooCommerce Sync',
};

export const PrintableInvoiceModal: React.FC<PrintableInvoiceModalProps> = ({ order, onClose }) => {
  const formatBDT = (amount: number) => `৳${Number(amount || 0).toLocaleString('en-US')}`;
  const dueAmount =
    order.paymentStatus === 'paid'
      ? 0
      : Math.max(0, Number(order.paymentDetails?.dueAmount ?? order.totalAmount));
  const paidAmount = Math.max(0, order.totalAmount - dueAmount);

  const handleDownloadHtml = () => {
    const itemsHtml = order.items
      .map(
        (item, idx) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${idx + 1}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;"><strong>${item.nameEn}</strong>${
          item.selectedColor ? ` (${item.selectedColor})` : ''
        }${item.sku ? `<br/><span style="font-size:11px;color:#6b7280;">SKU: ${item.sku}</span>` : ''}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatBDT(item.price)}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;">${formatBDT(
          item.price * item.quantity
        )}</td>
      </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${order.id} - Luxora BD</title>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;color:#111827;padding:32px;max-width:780px;margin:0 auto;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #D4AF37;padding-bottom:16px;">
    <div>
      <h1 style="margin:0;font-size:26px;letter-spacing:2px;">LUXORA BD</h1>
      <p style="margin:4px 0 0;font-size:12px;color:#4b5563;">Curated Tech & Luxury Lifestyle • Bhola Sadar / Dhaka Dispatch</p>
      <p style="margin:2px 0 0;font-size:12px;color:#4b5563;">Hotline: 01871693050 • Email: mdisrafilh320@gmail.com</p>
    </div>
    <div style="text-align:right;">
      <div style="font-size:18px;font-weight:800;">INVOICE #${order.id}</div>
      <div style="font-size:12px;color:#4b5563;">Date: ${new Date(order.createdAt).toLocaleString()}</div>
      <div style="font-size:12px;color:#4b5563;">Source: ${CHANNEL_LABELS[order.sourceChannel || 'luxora_web'] || 'Luxora Store'}</div>
    </div>
  </div>
  <div style="display:flex;justify-content:space-between;margin:20px 0;gap:24px;">
    <div>
      <div style="font-size:11px;text-transform:uppercase;color:#6b7280;font-weight:700;">Billed & Shipped To</div>
      <div style="font-size:15px;font-weight:700;margin-top:4px;">${order.customer.name}</div>
      <div style="font-size:13px;">Phone: ${order.customer.phone}</div>
      <div style="font-size:13px;">${order.customer.shippingAddress}, ${order.customer.district}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;text-transform:uppercase;color:#6b7280;font-weight:700;">Payment & Courier</div>
      <div style="font-size:13px;margin-top:4px;">Method: ${order.paymentMethod.toUpperCase()} (${order.paymentStatus.toUpperCase()})</div>
      ${
        order.paymentDetails?.transactionId
          ? `<div style="font-size:12px;">TrxID: ${order.paymentDetails.transactionId}</div>`
          : ''
      }
      ${
        order.trackingInfo?.consignmentId
          ? `<div style="font-size:12px;">Courier: ${order.trackingInfo.courier} (${order.trackingInfo.consignmentId})</div>`
          : ''
      }
    </div>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
    <thead>
      <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
        <th style="padding:10px;text-align:left;">#</th>
        <th style="padding:10px;text-align:left;">Product</th>
        <th style="padding:10px;text-align:center;">Qty</th>
        <th style="padding:10px;text-align:right;">Unit Price</th>
        <th style="padding:10px;text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div style="margin-top:20px;margin-left:auto;max-width:280px;font-size:13px;">
    <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Subtotal:</span><strong>${formatBDT(order.subtotal)}</strong></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Delivery Fee:</span><strong>${
      order.deliveryCharge === 0 ? 'FREE' : formatBDT(order.deliveryCharge)
    }</strong></div>
    ${
      order.discount > 0
        ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:#059669;"><span>Discount:</span><strong>-${formatBDT(
            order.discount
          )}</strong></div>`
        : ''
    }
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid #111827;font-size:16px;font-weight:800;"><span>Grand Total:</span><span>${formatBDT(
      order.totalAmount
    )}</span></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;color:#059669;"><span>Paid:</span><strong>${formatBDT(
      paidAmount
    )}</strong></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;color:#b45309;"><span>COD Due:</span><strong>${formatBDT(
      dueAmount
    )}</strong></div>
  </div>
  <p style="margin-top:32px;padding-top:12px;border-top:1px dashed #d1d5db;font-size:11px;color:#6b7280;text-align:center;">
    Thank you for choosing Luxora BD • 100% Authentic Sealed Tech & 7-Day Replacement Guarantee
  </p>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LuxoraBD-Invoice-${order.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl bg-[#111118] border border-[#2A2A38] rounded-3xl shadow-2xl overflow-hidden my-auto"
      >
        {/* Top Action Bar (Hidden when printing) */}
        <div className="no-print px-5 py-3.5 bg-[#171722] border-b border-[#262636] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <Package className="w-4 h-4 text-[#D4AF37]" />
            <span className="font-bold text-white">Invoice Preview</span>
            <span className="font-mono text-[#D4AF37]">{order.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="px-3 py-1.5 rounded-xl bg-[#1E1E2B] hover:bg-[#282838] border border-[#343448] text-gray-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#D4AF37]" /> Download Invoice
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-1.5 rounded-xl gold-bg text-black text-xs font-bold flex items-center gap-1.5 hover:brightness-110 cursor-pointer shadow-md"
            >
              <Printer className="w-3.5 h-3.5" /> Print Invoice
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
              aria-label="Close invoice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable A4 Invoice Surface */}
        <div
          id="luxora-printable-invoice"
          className="bg-white text-gray-900 p-6 sm:p-8 space-y-6 text-xs sm:text-sm"
        >
          {/* Brand Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-[#D4AF37] pb-5">
            <div>
              <h2 className="text-2xl font-black tracking-wider font-luxury text-gray-950">LUXORA BD</h2>
              <p className="text-xs text-gray-600 mt-0.5">Curated Luxury Tech & Lifestyle Atelier</p>
              <p className="text-xs text-gray-600 flex items-center gap-1.5 mt-1">
                <Phone className="w-3 h-3 text-[#B68F1E]" /> Helpline: +880 1871-693050 • mdisrafilh320@gmail.com
              </p>
              <p className="text-xs text-gray-600 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-[#B68F1E]" /> Dispatch Hub: Dhaka & Bhola Sadar, Bangladesh
              </p>
            </div>

            <div className="sm:text-right space-y-1">
              <div className="inline-block px-3 py-1 rounded-lg bg-gray-900 text-[#D4AF37] font-mono font-bold text-sm">
                INVOICE #{order.id}
              </div>
              <p className="text-xs text-gray-600">
                Issued: <span className="font-semibold text-gray-900">{new Date(order.createdAt).toLocaleString()}</span>
              </p>
              <p className="text-xs text-gray-600">
                Source:{' '}
                <span className="font-semibold text-gray-900">
                  {CHANNEL_LABELS[order.sourceChannel || 'luxora_web'] || 'Luxora Web'}
                </span>
              </p>
            </div>
          </div>

          {/* Customer & Courier Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Customer & Shipping Address</p>
              <p className="text-sm font-bold text-gray-900">{order.customer.name}</p>
              <p className="text-xs font-mono text-gray-700">{order.customer.phone}</p>
              <p className="text-xs text-gray-700">
                {order.customer.shippingAddress}, <span className="font-semibold">{order.customer.district}</span>
              </p>
              {order.customer.notes && (
                <p className="text-[11px] text-amber-700 italic mt-1">Note: {order.customer.notes}</p>
              )}
            </div>

            <div className="space-y-1 sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Payment & Courier Status</p>
              <p className="text-xs text-gray-800">
                Method:{' '}
                <span className="font-bold uppercase">{order.paymentMethod}</span>{' '}
                <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-800 text-[10px] font-bold uppercase">
                  {order.paymentStatus}
                </span>
              </p>
              {order.paymentDetails?.transactionId && (
                <p className="text-xs font-mono text-gray-700">TrxID: {order.paymentDetails.transactionId}</p>
              )}
              {order.trackingInfo?.consignmentId ? (
                <div className="mt-1 p-2 rounded-xl bg-emerald-50 border border-emerald-200 inline-block text-left sm:text-right">
                  <p className="text-[11px] font-bold text-emerald-800">{order.trackingInfo.courier}</p>
                  <p className="text-xs font-mono font-bold text-emerald-950">
                    CN: {order.trackingInfo.consignmentId}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Order Stage: {order.orderStatus}</p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-[11px] uppercase tracking-wider text-gray-600 border-b border-gray-200">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Product Item</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs">
                {order.items.map((item, i) => (
                  <tr key={`${item.productId}-${i}`}>
                    <td className="py-3 px-3 font-mono text-gray-500">{i + 1}</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-gray-900">{item.nameEn}</p>
                      <div className="flex flex-wrap gap-2 text-[11px] text-gray-500">
                        {item.selectedColor && <span>Color: {item.selectedColor}</span>}
                        {item.sku && <span className="font-mono">SKU: {item.sku}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">{item.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono">{formatBDT(item.price)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-gray-950">
                      {formatBDT(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
            <div className="flex items-start gap-2 text-[11px] text-gray-600 max-w-sm bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
              <ShieldCheck className="w-4 h-4 text-[#B68F1E] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900">Luxora Authenticity & Replacement Seal</p>
                <p>
                  100% genuine factory-sealed item. Eligible for 7-day replacement guarantee for any technical
                  manufacturing defect.
                </p>
              </div>
            </div>

            <div className="w-full sm:w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-gray-900">{formatBDT(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery ({order.customer.district})</span>
                <span className="font-mono font-semibold text-gray-900">
                  {order.deliveryCharge === 0 ? 'FREE' : formatBDT(order.deliveryCharge)}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span className="font-mono font-semibold">-{formatBDT(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t-2 border-gray-900 text-sm font-black text-gray-950">
                <span>Grand Total</span>
                <span className="font-mono">{formatBDT(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 pt-1">
                <span>Advance / Paid</span>
                <span className="font-mono font-bold">{formatBDT(paidAmount)}</span>
              </div>
              <div className="flex justify-between text-amber-700 font-bold text-sm bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                <span>COD Payable Due</span>
                <span className="font-mono">{formatBDT(dueAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
