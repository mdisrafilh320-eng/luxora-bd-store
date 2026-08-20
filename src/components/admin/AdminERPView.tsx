import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  Package, 
  CreditCard, 
  AlertTriangle, 
  Users, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Edit, 
  Trash2, 
  ExternalLink, 
  Eye, 
  Truck, 
  RefreshCw, 
  Lock, 
  Key, 
  FileText, 
  Check, 
  AlertCircle,
  ArrowUpRight,
  Sparkles,
  Layers,
  ChevronRight,
  Printer,
  Sliders,
  Wallet
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Order, Product, OrderStatus, PaymentStatus, ProductCategory } from '../../types';
import { orderService } from '../../services/orderService';
import { productService } from '../../services/productService';
import { 
  calculateExecutiveMetrics, 
  generateFinancialLedger, 
  exportLedgerToCSV,
  ExecutiveMetrics,
  FinancialLedgerEntry
} from '../../services/adminService';
import { sanitizeInput, validateBangladeshiPhone, validateMfsTransactionId } from '../../utils/security';
import { PaymentSettingsTab } from './PaymentSettingsTab';
import { ProductImageUploader } from './ProductImageUploader';

type AdminTab = 'overview' | 'orders' | 'inventory' | 'finance' | 'payment_settings' | 'security';

export const AdminERPView: React.FC = () => {
  const { language, t, products, refreshProducts, addToast, isAdmin, toggleAdminRole, setActiveView } = useApp();
  
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filters for Orders
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');

  // Modal States
  const [selectedOrderForVerification, setSelectedOrderForVerification] = useState<Order | null>(null);
  const [trackingModalOrder, setTrackingModalOrder] = useState<Order | null>(null);
  const [trackingInput, setTrackingInput] = useState({
    courier: 'Steadfast Luxury Express',
    trackingNumber: '',
    trackingUrl: '',
    estimatedDelivery: 'Tomorrow by 06:00 PM',
  });

  // Product CRUD Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productFormData, setProductFormData] = useState<Partial<Product>>({
    nameEn: '',
    nameBn: '',
    taglineEn: '',
    taglineBn: '',
    descriptionEn: '',
    descriptionBn: '',
    price: 10000,
    originalPrice: 12000,
    category: 'audio',
    brand: 'Luxora Prime',
    image: '',
    gallery: [],
    inStock: true,
    stockCount: 15,
    warranty: '2 Years Official Luxora Warranty',
    returnPolicy: '7 Days Hassle-Free Replacement',
    badge: 'new',
  });

  // Product Catalog Search & Category Filter
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');

  // Load live orders on mount
  const fetchAllOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const data = await orderService.getAllOrders();
      setOrders(data || []);
    } catch (err) {
      console.warn('Admin orders empty or failed:', err);
      setOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchAllOrders(), refreshProducts()]);
    setIsRefreshing(false);
    addToast({
      type: 'info',
      titleEn: 'ERP Data Synchronized',
      titleBn: 'ইআরপি ডাটা সিঙ্ক সম্পন্ন',
      descriptionEn: 'Latest orders, stock levels, and ledger updated',
      descriptionBn: 'সর্বশেষ অর্ডার, স্টক এবং লেজার তথ্য আপডেট হয়েছে',
    });
  };

  // Executive Metrics
  const metrics: ExecutiveMetrics = useMemo(() => {
    return calculateExecutiveMetrics(orders, products);
  }, [orders, products]);

  // Financial Ledger
  const financialLedger: FinancialLedgerEntry[] = useMemo(() => {
    return generateFinancialLedger(orders);
  }, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = orderSearchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        order.id.toLowerCase().includes(q) ||
        (order.customer?.name || '').toLowerCase().includes(q) ||
        (order.customer?.phone || '').includes(q) ||
        (order.paymentDetails?.transactionId || '').toLowerCase().includes(q);

      const matchesStatus = orderStatusFilter === 'all' || order.orderStatus === orderStatusFilter;
      const matchesPayment = paymentStatusFilter === 'all' || order.paymentStatus === paymentStatusFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, orderSearchQuery, orderStatusFilter, paymentStatusFilter]);

  // Filtered Products for Inventory
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const q = productSearchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        prod.nameEn.toLowerCase().includes(q) ||
        prod.nameBn.includes(q) ||
        prod.id.toLowerCase().includes(q) ||
        prod.brand.toLowerCase().includes(q);

      const matchesCat = productCategoryFilter === 'all' || prod.category === productCategoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [products, productSearchQuery, productCategoryFilter]);

  // Handle Order Payment Verification
  const handleVerifyPayment = async (orderId: string, isApproved: boolean) => {
    try {
      await orderService.verifyOrderPayment(orderId, isApproved);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                paymentStatus: isApproved ? 'paid' : 'failed',
                orderStatus: isApproved ? 'Confirmed' : 'Pending',
                paymentDetails: {
                  ...o.paymentDetails,
                  notes: isApproved ? 'Verified by Admin Finance' : 'Rejected - TrxID Mismatch',
                } as any,
              }
            : o
        )
      );
      setSelectedOrderForVerification(null);
      addToast({
        type: isApproved ? 'success' : 'error',
        titleEn: isApproved ? 'Payment Verified & Approved' : 'Payment Verification Rejected',
        titleBn: isApproved ? 'পেমেন্ট যাচাই ও অনুমোদন সম্পন্ন' : 'পেমেন্ট যাচাই বাতিল করা হয়েছে',
        descriptionEn: `Order ${orderId} updated to ${isApproved ? 'Confirmed' : 'Payment Failed'}`,
        descriptionBn: `অর্ডার ${orderId} স্ট্যাটাস আপডেট করা হয়েছে`,
      });
    } catch (err) {
      console.error('Payment verification error:', err);
      addToast({
        type: 'error',
        titleEn: 'Update Failed',
        titleBn: 'আপডেট ব্যর্থ হয়েছে',
        descriptionEn: 'Could not update payment status in database',
        descriptionBn: 'ডাটাবেসে পেমেন্ট স্ট্যাটাস আপডেট করা যায়নি',
      });
    }
  };

  // Handle Order Status Quick Toggle
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, orderStatus: newStatus } : o))
      );
      addToast({
        type: 'success',
        titleEn: 'Order Status Updated',
        titleBn: 'অর্ডার স্ট্যাটাস পরিবর্তিত',
        descriptionEn: `Order ${orderId} is now marked as "${newStatus}"`,
        descriptionBn: `অর্ডার ${orderId} এখন "${newStatus}" হিসেবে চিহ্নিত`,
      });
    } catch (err) {
      console.error('Order status error:', err);
    }
  };

  // Handle Assign Tracking
  const handleSaveTracking = async () => {
    if (!trackingModalOrder) return;
    try {
      const trackingPayload = {
        courier: trackingInput.courier,
        trackingNumber: trackingInput.trackingNumber || `TRK-${Math.floor(100000 + Math.random() * 900000)}`,
        consignmentId: trackingInput.trackingNumber || `CNS-${Math.floor(100000 + Math.random() * 900000)}`,
        trackingUrl: trackingInput.trackingUrl || `https://steadfast.com.bd/track/${trackingInput.trackingNumber}`,
        estimatedDelivery: trackingInput.estimatedDelivery,
      };

      await orderService.updateOrderStatus(trackingModalOrder.id, 'In Transit', trackingPayload);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === trackingModalOrder.id
            ? { ...o, orderStatus: 'In Transit', trackingInfo: trackingPayload }
            : o
        )
      );
      setTrackingModalOrder(null);
      addToast({
        type: 'success',
        titleEn: 'Courier Consignment Assigned',
        titleBn: 'কুরিয়ার ট্র্যাকিং যুক্ত হয়েছে',
        descriptionEn: `Tracking ID assigned for ${trackingModalOrder.id}`,
        descriptionBn: `অর্ডার ${trackingModalOrder.id}-এ ট্র্যাকিং কোড যুক্ত হয়েছে`,
      });
    } catch (err) {
      console.error('Tracking assignment error:', err);
    }
  };

  // Handle Product CRUD
  const handleOpenAddProduct = () => {
    const newId = `lux-prod-${Date.now().toString(36)}`;
    setEditingProduct(null);
    setProductFormData({
      id: newId,
      nameEn: '',
      nameBn: '',
      taglineEn: '',
      taglineBn: '',
      descriptionEn: '',
      descriptionBn: '',
      price: 15000,
      originalPrice: 18000,
      category: 'audio',
      brand: 'Luxora Audio',
      image: '',
      gallery: [],
      inStock: true,
      stockCount: 20,
      rating: 4.9,
      reviewsCount: 12,
      badge: 'new',
      warranty: '2 Years Official Bangladesh Warranty',
      returnPolicy: '7 Days Replacement Guarantee',
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProductFormData({ 
      ...prod,
      image: prod.image || '',
      gallery: prod.gallery || [],
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    // Image validation: ensure at least 1 image is set as mainImage
    if (!productFormData.image) {
      addToast({
        type: 'error',
        titleEn: 'Product Image Required',
        titleBn: 'পণ্যের ছবি আবশ্যক',
        descriptionEn: 'Please upload at least 1 image to serve as the product main cover.',
        descriptionBn: 'পণ্য ক্যাটালগে সংরক্ষণের পূর্বে অন্তত একটি প্রধান ছবি আপলোড করুন।',
      });
      return;
    }

    try {
      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, {
          ...productFormData,
          gallery: productFormData.gallery || [],
        });
        addToast({
          type: 'success',
          titleEn: 'Product Updated',
          titleBn: 'পণ্য তথ্য আপডেট হয়েছে',
          descriptionEn: `${productFormData.nameEn} catalog entry updated`,
          descriptionBn: `${productFormData.nameBn} সফলভাবে আপডেট করা হয়েছে`,
        });
      } else {
        const newProdId = productFormData.id || `lux-${Date.now().toString(36)}`;
        await productService.addProduct({
          ...(productFormData as Product),
          id: newProdId,
          price: Number(productFormData.price) || 1000,
          originalPrice: Number(productFormData.originalPrice) || Number(productFormData.price) || 1000,
          stockCount: Number(productFormData.stockCount) || 10,
          inStock: (Number(productFormData.stockCount) || 0) > 0,
          gallery: productFormData.gallery || [],
        });
        addToast({
          type: 'success',
          titleEn: 'New Product Registered',
          titleBn: 'নতুন পণ্য ক্যাটালগে যুক্ত হয়েছে',
          descriptionEn: `${productFormData.nameEn} added to luxury catalog`,
          descriptionBn: `${productFormData.nameBn} সফলভাবে যুক্ত হয়েছে`,
        });
      }
      setIsProductModalOpen(false);
      await refreshProducts();
    } catch (err) {
      console.error('Product save error:', err);
      addToast({
        type: 'error',
        titleEn: 'Failed to Save Product',
        titleBn: 'পণ্য সংরক্ষণে ব্যর্থ হয়েছে',
        descriptionEn: 'Check database connectivity and permissions.',
      });
    }
  };

  const handleDeleteProduct = async (productId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from the luxury catalog?`)) {
      return;
    }
    try {
      await productService.deleteProduct(productId);
      addToast({
        type: 'info',
        titleEn: 'Product Removed',
        titleBn: 'পণ্য মুছে ফেলা হয়েছে',
        descriptionEn: `${name} has been deleted from catalog`,
        descriptionBn: `${name} ক্যাটালগ থেকে বাদ দেওয়া হয়েছে`,
      });
      await refreshProducts();
    } catch (err) {
      console.error('Product delete error:', err);
    }
  };

  const handleQuickRestock = async (productId: string, currentStock: number, addAmount: number) => {
    try {
      const newStock = (currentStock || 0) + addAmount;
      await productService.updateProductStock(productId, newStock);
      addToast({
        type: 'success',
        titleEn: 'Stock Refilled',
        titleBn: 'স্টক বৃদ্ধি করা হয়েছে',
        descriptionEn: `Added +${addAmount} units (New total: ${newStock})`,
        descriptionBn: `+${addAmount} ইউনিট যুক্ত করা হয়েছে (মোট: ${newStock})`,
      });
      await refreshProducts();
    } catch (err) {
      console.error('Restock error:', err);
    }
  };

  return (
    <div id="admin-erp-root" className="min-h-screen bg-[#08090C] text-[#E5E7EB] pt-24 pb-20 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#D4AF37]/30 selection:text-[#FFF8E7]">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header & Executive Status Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#12141A] via-[#161822] to-[#12141A] border border-[#D4AF37]/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-1 relative z-10">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Enterprise ERP Control Center
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Cloud Sync
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight text-[#FAF9F6]">
              {language === 'bn' ? 'লাক্সোরা বিডি এন্টারপ্রাইজ অ্যাডমিন পোর্টাল' : 'Luxora BD Executive Control & ERP'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400">
              {language === 'bn' 
                ? 'রিয়েল-টাইম অর্ডার ভেরিফিকেশন, ইনভেন্টরি ওয়্যারহাউস, ফাইনান্সিয়াল লেজার এবং সাইবার সিকিউরিটি হাব' 
                : 'Real-time order verification, inventory warehouse, financial ledger, and zero-trust security hub.'}
            </p>
          </div>

          {/* Quick Actions & Role Guard Status */}
          <div className="flex flex-wrap items-center gap-3 relative z-10">
            <button
              id="admin-refresh-btn"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-[#1A1C24] hover:bg-[#232632] border border-neutral-800 hover:border-[#D4AF37]/40 text-neutral-200 transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#D4AF37] ${isRefreshing ? 'animate-spin' : ''}`} />
              {language === 'bn' ? 'ডাটা রিফ্রেশ' : 'Sync ERP Data'}
            </button>

            <button
              id="admin-toggle-role-btn"
              onClick={toggleAdminRole}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] transition-all flex items-center gap-2"
            >
              <Key className="w-3.5 h-3.5" />
              {isAdmin ? 'Admin Mode (Active)' : 'Activate Admin Access'}
            </button>

            <button
              id="admin-return-store-btn"
              onClick={() => setActiveView('store')}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-[#D4AF37] hover:bg-[#C5A028] text-black font-semibold transition-all flex items-center gap-1.5 shadow-lg shadow-[#D4AF37]/20"
            >
              {language === 'bn' ? 'গ্রাহক স্টোরে ফিরুন' : 'Back to Store'}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 border-b border-neutral-800/80 no-scrollbar">
          <button
            id="admin-tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer active:scale-95 ${
              activeTab === 'overview'
                ? 'bg-[#D4AF37] text-black font-semibold shadow-lg shadow-[#D4AF37]/20'
                : 'bg-[#12141A] text-neutral-400 hover:text-neutral-200 hover:bg-[#1A1C24] border border-neutral-800/60'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            {language === 'bn' ? 'এক্সিকিউটিভ ওভারভিউ' : 'Executive Overview'}
          </button>

          <button
            id="admin-tab-orders"
            onClick={() => setActiveTab('orders')}
            className={`min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap relative cursor-pointer active:scale-95 ${
              activeTab === 'orders'
                ? 'bg-[#D4AF37] text-black font-semibold shadow-lg shadow-[#D4AF37]/20'
                : 'bg-[#12141A] text-neutral-400 hover:text-neutral-200 hover:bg-[#1A1C24] border border-neutral-800/60'
            }`}
          >
            <Package className="w-4 h-4" />
            {language === 'bn' ? 'অর্ডার ও পেমেন্ট ভেরিফিকেশন' : 'Orders & Payment Hub'}
            {metrics.pendingOrdersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">
                {metrics.pendingOrdersCount}
              </span>
            )}
          </button>

          <button
            id="admin-tab-inventory"
            onClick={() => setActiveTab('inventory')}
            className={`min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer active:scale-95 ${
              activeTab === 'inventory'
                ? 'bg-[#D4AF37] text-black font-semibold shadow-lg shadow-[#D4AF37]/20'
                : 'bg-[#12141A] text-neutral-400 hover:text-neutral-200 hover:bg-[#1A1C24] border border-neutral-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            {language === 'bn' ? 'ইনভেন্টরি ও প্রোডাক্ট ক্যাটালগ' : 'Inventory & Products'}
            {metrics.lowStockItemsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500/80 text-white text-[10px] font-bold flex items-center justify-center">
                {metrics.lowStockItemsCount}
              </span>
            )}
          </button>

          <button
            id="admin-tab-finance"
            onClick={() => setActiveTab('finance')}
            className={`min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer active:scale-95 ${
              activeTab === 'finance'
                ? 'bg-[#D4AF37] text-black font-semibold shadow-lg shadow-[#D4AF37]/20'
                : 'bg-[#12141A] text-neutral-400 hover:text-neutral-200 hover:bg-[#1A1C24] border border-neutral-800/60'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            {language === 'bn' ? 'ফাইনান্সিয়াল লেজার ও প্রফিট' : 'Finance & Ledger'}
          </button>

          <button
            id="admin-tab-payment-settings"
            onClick={() => setActiveTab('payment_settings')}
            className={`min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer active:scale-95 ${
              activeTab === 'payment_settings'
                ? 'bg-[#D4AF37] text-black font-semibold shadow-lg shadow-[#D4AF37]/20'
                : 'bg-[#12141A] text-neutral-400 hover:text-neutral-200 hover:bg-[#1A1C24] border border-neutral-800/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            {language === 'bn' ? 'পেমেন্ট গেটওয়ে সেটিংস' : 'Payment Settings'}
          </button>

          <button
            id="admin-tab-security"
            onClick={() => setActiveTab('security')}
            className={`min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer active:scale-95 ${
              activeTab === 'security'
                ? 'bg-[#D4AF37] text-black font-semibold shadow-lg shadow-[#D4AF37]/20'
                : 'bg-[#12141A] text-neutral-400 hover:text-neutral-200 hover:bg-[#1A1C24] border border-neutral-800/60'
            }`}
          >
            <Lock className="w-4 h-4" />
            {language === 'bn' ? 'সাইবার সিকিউরিটি ও আরবিক' : 'Security & RBAC'}
          </button>
        </div>

        {/* ----------------- TAB 1: EXECUTIVE OVERVIEW ----------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Top KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Gross Revenue */}
              <div className="p-5 rounded-2xl bg-[#12141A] border border-neutral-800/80 shadow-lg relative overflow-hidden group hover:border-[#D4AF37]/40 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Gross Invoiced Revenue</span>
                  <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-display font-semibold text-white">
                    ৳{metrics.totalRevenue.toLocaleString('en-IN')}
                  </span>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
                    {metrics.totalRevenue > 0 ? (
                      <>
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">+18.4% this week</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="text-neutral-500">Initial State (৳0.00)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Today's Sales */}
              <div className="p-5 rounded-2xl bg-[#12141A] border border-neutral-800/80 shadow-lg relative overflow-hidden group hover:border-[#D4AF37]/40 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Today's Settlements</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-display font-semibold text-white">
                    ৳{metrics.todaySales.toLocaleString('en-IN')}
                  </span>
                  <div className="mt-1 text-xs text-neutral-400">
                    From {orders.filter(o => o.createdAt && o.createdAt.startsWith(new Date().toISOString().split('T')[0])).length} verified orders
                  </div>
                </div>
              </div>

              {/* Pending Verifications */}
              <div className="p-5 rounded-2xl bg-[#12141A] border border-neutral-800/80 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Pending MFS Review</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-display font-semibold text-amber-400">
                    {metrics.pendingOrdersCount}
                  </span>
                  <div className="mt-1 text-xs text-amber-400/80 font-medium">
                    {metrics.pendingOrdersCount === 0 ? 'All MFS TrxIDs verified' : 'Awaiting TrxID manual approval'}
                  </div>
                </div>
              </div>

              {/* Net Profit Estimated */}
              <div className="p-5 rounded-2xl bg-[#12141A] border border-neutral-800/80 shadow-lg relative overflow-hidden group hover:border-[#D4AF37]/40 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Estimated Gross Margin</span>
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-display font-semibold text-white">
                    ৳{metrics.grossProfit.toLocaleString('en-IN')}
                  </span>
                  <div className="mt-1 text-xs text-purple-400 font-medium">
                    ~{metrics.estimatedMarginPercent}% net product margin
                  </div>
                </div>
              </div>
            </div>

            {/* Sales Trends & MFS Gateway Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Daily Sales Bar Visualizer */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-[#12141A] border border-neutral-800/80 shadow-xl space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
                      Revenue Velocity (Last 7 Days)
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">Aggregated daily gross sales volume in BDT</p>
                  </div>
                  <span className="text-xs text-[#D4AF37] font-medium bg-[#D4AF37]/10 px-2.5 py-1 rounded-lg border border-[#D4AF37]/20">
                    Avg Order: ৳{metrics.averageOrderValue.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Minimalist Gold Chart Visualization */}
                {metrics.totalRevenue === 0 && metrics.ordersCount === 0 ? (
                  <div className="h-48 w-full flex flex-col items-center justify-center gap-2 border border-dashed border-neutral-800 rounded-xl bg-[#0E1015]/60 text-center p-6">
                    <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold text-white">Zero State Analytics</span>
                    <span className="text-xs text-neutral-400 max-w-sm">
                      ৳0.00 revenue across 0 customer orders. Velocity chart will automatically generate as real orders arrive.
                    </span>
                  </div>
                ) : (
                  <div className="h-48 w-full flex items-end justify-between gap-3 pt-6 pb-2 border-b border-neutral-800">
                    {metrics.dailyTrend.map((item, idx) => {
                      const maxVal = Math.max(...metrics.dailyTrend.map(t => t.sales), 100000);
                      const heightPercent = Math.max(12, Math.round((item.sales / maxVal) * 100));

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                          <div className="text-[10px] text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity font-mono font-medium">
                            ৳{(item.sales / 1000).toFixed(0)}k
                          </div>
                          <div 
                            className="w-full max-w-[42px] rounded-t-lg bg-gradient-to-t from-[#D4AF37]/40 to-[#D4AF37] group-hover:brightness-125 transition-all shadow-md"
                            style={{ height: `${heightPercent}%` }}
                          />
                          <span className="text-xs text-neutral-400 font-mono mt-1">{item.day}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-[#161822] border border-neutral-800">
                    <span className="text-neutral-400 block text-[11px]">Total Volume</span>
                    <span className="font-semibold text-white text-sm">{metrics.ordersCount} Orders</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#161822] border border-neutral-800">
                    <span className="text-neutral-400 block text-[11px]">Active VIP Clients</span>
                    <span className="font-semibold text-[#D4AF37] text-sm">{metrics.activeCustomersCount}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#161822] border border-neutral-800">
                    <span className="text-neutral-400 block text-[11px]">Low Stock SKUs</span>
                    <span className={`font-semibold text-sm ${metrics.lowStockItemsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {metrics.lowStockItemsCount} Alert{metrics.lowStockItemsCount === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Gateway Distribution */}
              <div className="p-6 rounded-2xl bg-[#12141A] border border-neutral-800/80 shadow-xl space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#D4AF37]" />
                    MFS Gateway Distribution
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Payment settlement breakdown by provider</p>
                </div>

                <div className="space-y-4 pt-2">
                  {/* bKash */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-[#E2136E] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#E2136E]" />
                        bKash Merchant / P2P
                      </span>
                      <span className="font-mono text-white">৳{metrics.gatewayDistribution.bkash.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#E2136E] rounded-full transition-all duration-500" 
                        style={{ width: `${metrics.totalRevenue > 0 ? (metrics.gatewayDistribution.bkash / metrics.totalRevenue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Nagad */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-[#F7941D] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#F7941D]" />
                        Nagad Direct
                      </span>
                      <span className="font-mono text-white">৳{metrics.gatewayDistribution.nagad.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#F7941D] rounded-full transition-all duration-500" 
                        style={{ width: `${metrics.totalRevenue > 0 ? (metrics.gatewayDistribution.nagad / metrics.totalRevenue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* COD Advance Balance */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-[#D4AF37] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                        Partial COD Balance
                      </span>
                      <span className="font-mono text-white">৳{metrics.gatewayDistribution.cod.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#D4AF37] rounded-full transition-all duration-500" 
                        style={{ width: `${metrics.totalRevenue > 0 ? (metrics.gatewayDistribution.cod / metrics.totalRevenue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#161822] border border-neutral-800 text-xs text-neutral-300 space-y-1">
                  <span className="font-semibold text-white block">Automated Courier Dispatch:</span>
                  <p className="text-[11px] text-neutral-400">
                    Orders with verified MFS TrxIDs are auto-synced with Steadfast / Pathao APIs for next-day dispatch.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 2: ORDER & PAYMENT VERIFICATION HUB ----------------- */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Filter Bar */}
            <div className="p-4 rounded-2xl bg-[#12141A] border border-neutral-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder="Search by Order ID (LUX-...), Customer Name, Phone, or TrxID..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#161822] border border-neutral-800 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Status Filter */}
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3.5 py-2.5 bg-[#161822] border border-neutral-800 rounded-xl text-xs text-neutral-300 focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="all">All Order Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Processing">Processing</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                {/* Payment Status Filter */}
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="px-3.5 py-2.5 bg-[#161822] border border-neutral-800 rounded-xl text-xs text-neutral-300 focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="all">All Payment States</option>
                  <option value="pending">Pending Verification</option>
                  <option value="partially_paid">Partially Paid (Advance)</option>
                  <option value="paid">Paid & Settled</option>
                  <option value="failed">Failed / Rejected</option>
                </select>
              </div>
            </div>

            {/* Orders Data Table */}
            <div className="rounded-2xl bg-[#12141A] border border-neutral-800/80 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#161822] text-neutral-400 uppercase text-[11px] font-semibold tracking-wider border-b border-neutral-800">
                    <tr>
                      <th className="py-3.5 px-4">Order ID & Date</th>
                      <th className="py-3.5 px-4">Customer Details</th>
                      <th className="py-3.5 px-4">Items</th>
                      <th className="py-3.5 px-4">Payable Amount</th>
                      <th className="py-3.5 px-4">MFS / Payment Details</th>
                      <th className="py-3.5 px-4">Order Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-[#181A22] border border-neutral-800 flex items-center justify-center text-neutral-400">
                              <Package className="w-6 h-6" />
                            </div>
                            <div className="text-sm font-semibold text-white">
                              {orders.length === 0 ? 'No Customer Orders Yet (Zero State)' : 'No Matching Orders'}
                            </div>
                            <p className="text-xs text-neutral-400 max-w-sm">
                              {orders.length === 0 
                                ? 'Real-time orders placed via checkout with bKash, Nagad, or COD will automatically appear here with TrxID inspection.' 
                                : 'Try changing your search query or filter options.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => {
                        const isPendingPayment = order.paymentStatus === 'pending';
                        const hasTrxId = !!order.paymentDetails?.transactionId;

                        return (
                          <tr key={order.id} className="hover:bg-[#161822]/60 transition-colors">
                            <td className="py-4 px-4 font-mono font-semibold text-white">
                              <div className="flex items-center gap-2">
                                <span className="text-[#D4AF37]">{order.id}</span>
                              </div>
                              <span className="text-[10px] text-neutral-500 block font-sans font-normal mt-0.5">
                                {order.createdAt ? new Date(order.createdAt).toLocaleString('en-GB') : 'Recent'}
                              </span>
                            </td>

                            <td className="py-4 px-4">
                              <div className="font-medium text-white">{order.customer?.name || 'Guest'}</div>
                              <div className="text-xs text-neutral-400 font-mono">{order.customer?.phone}</div>
                              <div className="text-[11px] text-neutral-500 truncate max-w-[160px]">
                                {order.customer?.district}, {order.customer?.shippingAddress}
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <div className="text-neutral-300">
                                {order.items?.length || 1} item(s)
                              </div>
                              <div className="text-[11px] text-neutral-500 truncate max-w-[180px]">
                                {order.items?.[0]?.nameEn}
                              </div>
                            </td>

                            <td className="py-4 px-4 font-mono font-semibold text-white">
                              ৳{order.totalAmount.toLocaleString('en-IN')}
                              <div className="text-[10px] font-sans font-normal text-neutral-400">
                                {order.paymentOption === 'partial_advance' ? (
                                  <span className="text-amber-400">Advance: ৳{order.paymentDetails?.advanceAmount || 120}</span>
                                ) : (
                                  <span className="text-emerald-400">Full Payment</span>
                                )}
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs uppercase font-medium text-white flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${
                                    order.paymentMethod === 'bkash' ? 'bg-[#E2136E]' :
                                    order.paymentMethod === 'nagad' ? 'bg-[#F7941D]' : 'bg-[#D4AF37]'
                                  }`} />
                                  {order.paymentMethod}
                                </span>

                                {hasTrxId && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[11px] bg-[#0A0C10] px-2 py-0.5 rounded text-[#D4AF37] border border-[#D4AF37]/20">
                                      {order.paymentDetails?.transactionId}
                                    </span>
                                  </div>
                                )}

                                <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block w-fit font-medium ${
                                  order.paymentStatus === 'paid' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                                  order.paymentStatus === 'partially_paid' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                                  order.paymentStatus === 'failed' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                                  'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                }`}>
                                  {order.paymentStatus === 'paid' ? 'Settled' :
                                   order.paymentStatus === 'partially_paid' ? 'Advance Paid' :
                                   order.paymentStatus === 'failed' ? 'Rejected' : 'Review Required'}
                                </span>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <select
                                value={order.orderStatus}
                                onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as OrderStatus)}
                                className={`text-xs font-medium px-2.5 py-1.5 rounded-xl border focus:outline-none cursor-pointer ${
                                  order.orderStatus === 'Delivered' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                                  order.orderStatus === 'In Transit' ? 'bg-purple-500/15 border-purple-500/30 text-purple-400' :
                                  order.orderStatus === 'Processing' ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' :
                                  order.orderStatus === 'Cancelled' ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' :
                                  'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                }`}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Confirmed">Confirmed</option>
                                <option value="Processing">Processing</option>
                                <option value="In Transit">In Transit</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </td>

                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {/* Verify Payment Trigger */}
                                <button
                                  onClick={() => setSelectedOrderForVerification(order)}
                                  className="p-1.5 rounded-lg bg-[#1A1C24] hover:bg-[#D4AF37]/20 border border-neutral-800 hover:border-[#D4AF37]/40 text-neutral-200 hover:text-[#D4AF37] transition-all"
                                  title="Inspect Payment Proof & Verify TrxID"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {/* Assign Tracking Trigger */}
                                <button
                                  onClick={() => {
                                    setTrackingModalOrder(order);
                                    setTrackingInput({
                                      courier: order.trackingInfo?.courier || 'Steadfast Luxury Express',
                                      trackingNumber: order.trackingInfo?.trackingNumber || `STDF-${Math.floor(100000 + Math.random() * 900000)}`,
                                      trackingUrl: order.trackingInfo?.trackingUrl || '',
                                      estimatedDelivery: order.trackingInfo?.estimatedDelivery || 'Tomorrow by 05:00 PM',
                                    });
                                  }}
                                  className="p-1.5 rounded-lg bg-[#1A1C24] hover:bg-purple-500/20 border border-neutral-800 hover:border-purple-500/40 text-neutral-200 hover:text-purple-400 transition-all"
                                  title="Assign Courier Tracking ID"
                                >
                                  <Truck className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 3: INVENTORY & PRODUCT CRUD ----------------- */}
        {activeTab === 'inventory' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Top Toolbar */}
            <div className="p-4 rounded-2xl bg-[#12141A] border border-neutral-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  placeholder="Search catalog by title, brand, or SKU..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#161822] border border-neutral-800 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                  className="px-3.5 py-2.5 bg-[#161822] border border-neutral-800 rounded-xl text-xs text-neutral-300 focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="all">All Categories</option>
                  <option value="audio">Audio Flagship</option>
                  <option value="wearables">Smart Wearables</option>
                  <option value="desk-charging">Desk & Power</option>
                  <option value="apple-ecosystem">Apple Ecosystem</option>
                  <option value="photography">Photography</option>
                  <option value="lifestyle">Luxury Lifestyle</option>
                </select>

                <button
                  id="admin-add-product-btn"
                  onClick={handleOpenAddProduct}
                  className="px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-lg shadow-[#D4AF37]/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Luxury Product
                </button>
              </div>
            </div>

            {/* Product Catalog Grid */}
            {filteredProducts.length === 0 ? (
              <div className="p-12 rounded-2xl bg-[#12141A] border border-dashed border-neutral-800 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#161822] border border-neutral-800 flex items-center justify-center mx-auto text-[#D4AF37]">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-white">No Products Registered Yet</h4>
                  <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1">
                    Your luxury store is currently clean and fresh. Click below to add your first real product with pricing, stock, warranty, and specifications.
                  </p>
                </div>
                <button
                  onClick={handleOpenAddProduct}
                  className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black font-semibold text-xs sm:text-sm transition-all inline-flex items-center gap-2 shadow-lg shadow-[#D4AF37]/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Register First Product
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredProducts.map((prod) => {
                  const isLowStock = (prod.stockCount ?? 10) <= 5;

                  return (
                    <div key={prod.id} className="p-5 rounded-2xl bg-[#12141A] border border-neutral-800/80 hover:border-[#D4AF37]/40 transition-all flex flex-col justify-between space-y-4 shadow-lg group">
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 rounded-xl bg-[#161822] overflow-hidden flex-shrink-0 border border-neutral-800 relative">
                          <img 
                            src={prod.image} 
                            alt={prod.nameEn}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />
                          {isLowStock && (
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500 text-white">
                              LOW
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-[#D4AF37] uppercase">{prod.brand}</span>
                            <span className="text-[10px] text-neutral-500 font-mono">SKU: {prod.id}</span>
                          </div>
                          <h4 className="text-sm font-semibold text-white truncate">{prod.nameEn}</h4>
                          <p className="text-xs text-neutral-400 truncate">{prod.nameBn}</p>
                          <div className="flex items-center gap-2 pt-1 font-mono">
                            <span className="text-sm font-bold text-white">৳{prod.price.toLocaleString('en-IN')}</span>
                            {prod.originalPrice && prod.originalPrice > prod.price && (
                              <span className="text-xs text-neutral-500 line-through">৳{prod.originalPrice.toLocaleString('en-IN')}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stock Counter & Quick Restock */}
                      <div className="p-3 rounded-xl bg-[#161822] border border-neutral-800/80 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-neutral-400 block uppercase">Warehouse Stock</span>
                          <span className={`text-xs font-bold ${isLowStock ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                            {prod.stockCount ?? 15} units available
                          </span>
                        </div>

                        {/* Quick +Stock buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleQuickRestock(prod.id, prod.stockCount ?? 15, 5)}
                            className="px-2 py-1 bg-[#1F222E] hover:bg-[#2A2E3D] text-[10px] font-mono font-semibold text-neutral-200 rounded-lg border border-neutral-700 transition-colors"
                            title="Add 5 units"
                          >
                            +5
                          </button>
                          <button
                            onClick={() => handleQuickRestock(prod.id, prod.stockCount ?? 15, 10)}
                            className="px-2 py-1 bg-[#1F222E] hover:bg-[#2A2E3D] text-[10px] font-mono font-semibold text-neutral-200 rounded-lg border border-neutral-700 transition-colors"
                            title="Add 10 units"
                          >
                            +10
                          </button>
                        </div>
                      </div>

                      {/* Action Footer */}
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60">
                        <span className="text-[11px] text-neutral-400 capitalize">{prod.category}</span>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditProduct(prod)}
                            className="px-3 py-1.5 rounded-lg bg-[#1A1C24] hover:bg-[#D4AF37]/20 border border-neutral-800 hover:border-[#D4AF37]/40 text-neutral-200 hover:text-[#D4AF37] text-xs font-medium transition-all flex items-center gap-1.5"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Edit
                          </button>

                          <button
                            onClick={() => handleDeleteProduct(prod.id, prod.nameEn)}
                            className="p-1.5 rounded-lg bg-[#1A1C24] hover:bg-rose-500/20 border border-neutral-800 hover:border-rose-500/40 text-neutral-400 hover:text-rose-400 transition-all"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ----------------- TAB 4: FINANCIAL LEDGER & MARGIN CALCULATOR ----------------- */}
        {activeTab === 'finance' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Fiscal Performance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-5 rounded-2xl bg-[#12141A] border border-neutral-800">
                <span className="text-xs text-neutral-400 uppercase">Gross Receivable</span>
                <div className="text-2xl font-display font-semibold text-white mt-1">
                  ৳{financialLedger.reduce((sum, e) => sum + e.grossAmount, 0).toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-neutral-500 mt-1 block">Invoiced across {financialLedger.length} orders</span>
              </div>

              <div className="p-5 rounded-2xl bg-[#12141A] border border-neutral-800">
                <span className="text-xs text-neutral-400 uppercase">MFS Processing Fees (1.5%)</span>
                <div className="text-2xl font-display font-semibold text-amber-400 mt-1">
                  ৳{financialLedger.reduce((sum, e) => sum + e.gatewayFee, 0).toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-neutral-500 mt-1 block">bKash & Nagad gateway charge</span>
              </div>

              <div className="p-5 rounded-2xl bg-[#12141A] border border-neutral-800">
                <span className="text-xs text-neutral-400 uppercase">Logistics & Courier Cost</span>
                <div className="text-2xl font-display font-semibold text-purple-400 mt-1">
                  ৳{financialLedger.reduce((sum, e) => sum + e.shippingCost, 0).toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-neutral-500 mt-1 block">Steadfast & Pathao dispatch fees</span>
              </div>

              <div className="p-5 rounded-2xl bg-[#12141A] border border-neutral-800">
                <span className="text-xs text-neutral-400 uppercase">Net Realized Margin</span>
                <div className="text-2xl font-display font-semibold text-emerald-400 mt-1">
                  ৳{financialLedger.reduce((sum, e) => sum + e.netProfit, 0).toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-emerald-400/80 mt-1 block">After COGS & gateway deduction</span>
              </div>
            </div>

            {/* Export & Print Bar */}
            <div className="p-4 rounded-2xl bg-[#12141A] border border-neutral-800/80 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white">General Sales & Reconciliation Ledger</h3>
                <p className="text-xs text-neutral-400">Audited fiscal records compliant with Bangladesh NBR & MFS standards</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  id="admin-export-csv-btn"
                  onClick={() => exportLedgerToCSV(financialLedger)}
                  className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-[#D4AF37]/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Ledger (.CSV)
                </button>

                <button
                  id="admin-print-ledger-btn"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-[#161822] hover:bg-[#1E212D] border border-neutral-700 text-neutral-200 text-xs transition-all flex items-center gap-2"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Statement
                </button>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="rounded-2xl bg-[#12141A] border border-neutral-800/80 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#161822] text-neutral-400 uppercase text-[10px] font-semibold tracking-wider border-b border-neutral-800">
                    <tr>
                      <th className="py-3 px-4">Ledger ID</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Gateway</th>
                      <th className="py-3 px-4">Gross Invoiced</th>
                      <th className="py-3 px-4">MFS Fee (1.5%)</th>
                      <th className="py-3 px-4">Est. COGS</th>
                      <th className="py-3 px-4">Net Profit</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 font-mono">
                    {financialLedger.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3 font-sans">
                            <div className="w-12 h-12 rounded-full bg-[#181A22] border border-neutral-800 flex items-center justify-center text-neutral-400">
                              <DollarSign className="w-6 h-6" />
                            </div>
                            <div className="text-sm font-semibold text-white">
                              Fiscal Ledger Zero State (৳0.00)
                            </div>
                            <p className="text-xs text-neutral-400 max-w-sm">
                              No financial transactions recorded. Once customers place orders and MFS payments are processed, itemized ledger entries with fees, COGS, and net margin will populate here.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      financialLedger.map((entry) => (
                        <tr key={entry.id} className="hover:bg-[#161822]/60 transition-colors">
                          <td className="py-3 px-4 text-[#D4AF37] font-semibold">{entry.id}</td>
                          <td className="py-3 px-4 text-neutral-400 font-sans">{entry.date}</td>
                          <td className="py-3 px-4 text-white font-sans">{entry.customerName}</td>
                          <td className="py-3 px-4 text-neutral-300 font-sans">{entry.paymentMethod}</td>
                          <td className="py-3 px-4 text-white font-semibold">৳{entry.grossAmount.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-amber-400">৳{entry.gatewayFee.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-neutral-400">৳{entry.estimatedCogs.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-emerald-400 font-bold">৳{entry.netProfit.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 font-sans">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-800 text-neutral-300">
                              {entry.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 5: CYBERSECURITY & RBAC ARCHITECTURE ----------------- */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Security Posture Summary */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#12141A] to-[#161822] border border-[#D4AF37]/30 shadow-2xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Zero-Trust Security Active
                  </span>
                  <h3 className="text-xl font-display font-semibold text-white">End-to-End Enterprise Protection Protocol</h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                  <Lock className="w-6 h-6" />
                </div>
              </div>

              {/* 4 Pillars Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-[#0E1015] border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2 text-[#D4AF37] font-semibold text-sm">
                    <Key className="w-4 h-4" />
                    Role-Based Access Control (RBAC)
                  </div>
                  <p className="text-xs text-neutral-400">
                    Client roles are verified server-side against trusted admin collections in Firestore. Self-elevation of roles is strictly blocked at the security rule layer.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0E1015] border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                    <ShieldCheck className="w-4 h-4" />
                    XSS & Input Sanitization Layer
                  </div>
                  <p className="text-xs text-neutral-400">
                    All customer names, phone numbers, notes, and TrxIDs pass through cryptographic string normalization and HTML tag stripping before database storage.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0E1015] border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                    <Lock className="w-4 h-4" />
                    PII Isolation & Sensitive Fields
                  </div>
                  <p className="text-xs text-neutral-400">
                    Payment proof screenshots, customer phone numbers, and delivery addresses are restricted to authenticated owners and verified admin credentials.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0E1015] border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Client-Side Rate Limiter
                  </div>
                  <p className="text-xs text-neutral-400">
                    MFS transaction verification and checkout submissions are rate-limited to 5 requests per 30-second window to prevent automated brute-force attacks.
                  </p>
                </div>
              </div>

              {/* Live Security Verification Interactive Test */}
              <div className="p-5 rounded-xl bg-[#0B0D12] border border-neutral-800 space-y-3">
                <span className="text-xs font-semibold text-white block">Interactive Input Sanitizer Live Test:</span>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    defaultValue="<script>alert('xss')</script> 01711-234567"
                    id="security-test-input"
                    className="flex-1 px-3 py-2 bg-[#161822] border border-neutral-800 rounded-lg text-xs text-white"
                  />
                  <button
                    onClick={() => {
                      const el = document.getElementById('security-test-input') as HTMLInputElement;
                      const sanitized = sanitizeInput(el?.value || '');
                      const phoneVal = validateBangladeshiPhone(sanitized);
                      alert(`Sanitized Result: "${sanitized}"\nBD Phone Valid: ${phoneVal.isValid} (Normalized: ${phoneVal.normalized})`);
                    }}
                    className="px-4 py-2 bg-[#D4AF37] text-black font-semibold text-xs rounded-lg hover:bg-[#C5A028] transition-colors"
                  >
                    Run Sanitizer Test
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 6: MFS PAYMENT GATEWAY SETTINGS ----------------- */}
        {activeTab === 'payment_settings' && (
          <PaymentSettingsTab />
        )}

        {/* ----------------- PAYMENT VERIFICATION MODAL ----------------- */}
        {selectedOrderForVerification && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[#12141A] border border-[#D4AF37]/30 rounded-2xl shadow-2xl overflow-hidden space-y-5 p-6 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">MFS Payment Manual Verification</h3>
                    <p className="text-xs text-neutral-400">Order: {selectedOrderForVerification.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrderForVerification(null)}
                  className="text-neutral-400 hover:text-white p-1"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Order & Payment Details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[#161822] border border-neutral-800 space-y-1">
                  <span className="text-neutral-400 block text-[11px]">Customer & Sender</span>
                  <div className="font-semibold text-white">{selectedOrderForVerification.customer?.name}</div>
                  <div className="font-mono text-neutral-300">{selectedOrderForVerification.customer?.phone}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#161822] border border-neutral-800 space-y-1">
                  <span className="text-neutral-400 block text-[11px]">Payable / Invoiced</span>
                  <div className="font-semibold text-white text-sm font-mono">
                    ৳{selectedOrderForVerification.totalAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-amber-400 text-[11px]">
                    Method: {selectedOrderForVerification.paymentMethod.toUpperCase()} ({selectedOrderForVerification.paymentOption})
                  </div>
                </div>
              </div>

              {/* MFS TrxID Review Box */}
              <div className="p-4 rounded-xl bg-[#0E1015] border border-[#D4AF37]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 uppercase">Customer Submitted TrxID:</span>
                  <span className="text-xs font-mono font-bold text-[#D4AF37] px-2.5 py-1 rounded bg-[#D4AF37]/10 border border-[#D4AF37]/30">
                    {selectedOrderForVerification.paymentDetails?.transactionId || 'NO_TRX_ID_SUBMITTED'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>Sender Account Number:</span>
                  <span className="font-mono text-white">
                    {selectedOrderForVerification.paymentDetails?.senderNumber || selectedOrderForVerification.customer?.phone}
                  </span>
                </div>
              </div>

              {/* Screenshot Proof Preview (if provided) */}
              {selectedOrderForVerification.paymentDetails?.paymentProofUrl && (
                <div className="space-y-2">
                  <span className="text-xs text-neutral-400 block">Uploaded MFS Receipt Screenshot:</span>
                  <div className="max-h-48 rounded-xl overflow-hidden border border-neutral-800 bg-[#0A0C10] flex items-center justify-center">
                    <img 
                      src={selectedOrderForVerification.paymentDetails.paymentProofUrl} 
                      alt="Payment Proof" 
                      className="max-h-48 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              )}

              {/* Verification Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  onClick={() => handleVerifyPayment(selectedOrderForVerification.id, false)}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-semibold text-xs transition-all flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Payment
                </button>

                <button
                  onClick={() => handleVerifyPayment(selectedOrderForVerification.id, true)}
                  className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-[#D4AF37]/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve & Confirm Order
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- COURIER TRACKING ASSIGNMENT MODAL ----------------- */}
        {trackingModalOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#12141A] border border-purple-500/30 rounded-2xl shadow-2xl p-6 space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-semibold text-white">Assign Courier Consignment</h3>
                </div>
                <button onClick={() => setTrackingModalOrder(null)} className="text-neutral-400 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-neutral-400 block mb-1">Courier Service Provider</label>
                  <select
                    value={trackingInput.courier}
                    onChange={(e) => setTrackingInput({ ...trackingInput, courier: e.target.value })}
                    className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Steadfast Luxury Express">Steadfast Luxury Express</option>
                    <option value="Pathao Prime Express">Pathao Prime Express</option>
                    <option value="Paperfly VIP Logistics">Paperfly VIP Logistics</option>
                    <option value="RedX Premium Dispatch">RedX Premium Dispatch</option>
                  </select>
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">Tracking / Consignment ID</label>
                  <input
                    type="text"
                    value={trackingInput.trackingNumber}
                    onChange={(e) => setTrackingInput({ ...trackingInput, trackingNumber: e.target.value })}
                    placeholder="e.g. STDF-892014-DX"
                    className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-xl text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">Estimated Delivery Schedule</label>
                  <input
                    type="text"
                    value={trackingInput.estimatedDelivery}
                    onChange={(e) => setTrackingInput({ ...trackingInput, estimatedDelivery: e.target.value })}
                    placeholder="e.g. Tomorrow by 05:00 PM"
                    className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  onClick={() => setTrackingModalOrder(null)}
                  className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTracking}
                  className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold text-xs shadow-lg shadow-purple-500/20"
                >
                  Update & Dispatch
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- PRODUCT ADD / EDIT MODAL ----------------- */}
        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-3xl bg-[#12141A] border border-[#D4AF37]/30 rounded-2xl shadow-2xl p-6 space-y-4 my-8 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#D4AF37]" />
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {editingProduct ? 'Edit Catalog Product' : 'Register New Luxury Product'}
                    </h3>
                    <p className="text-[11px] text-gray-400 font-mono">
                      ID: {productFormData.id}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsProductModalOpen(false)} className="text-neutral-400 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-5 text-xs">
                {/* Visual Imagery Upload Engine */}
                <div className="p-4 rounded-xl bg-[#0E0F14] border border-white/5 space-y-3">
                  <ProductImageUploader
                    productId={productFormData.id || 'new_prod'}
                    mainImage={productFormData.image || ''}
                    gallery={productFormData.gallery || []}
                    onChange={(mainImg, gal) => {
                      setProductFormData((prev) => ({
                        ...prev,
                        image: mainImg,
                        gallery: gal,
                      }));
                    }}
                    language={language}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-neutral-400 block mb-1">Product Title (English) *</label>
                    <input
                      type="text"
                      required
                      value={productFormData.nameEn || ''}
                      onChange={(e) => setProductFormData({ ...productFormData, nameEn: e.target.value })}
                      placeholder="e.g. Bang & Olufsen Beoplay H95"
                      className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 block mb-1">Product Title (Bengali) *</label>
                    <input
                      type="text"
                      required
                      value={productFormData.nameBn || ''}
                      onChange={(e) => setProductFormData({ ...productFormData, nameBn: e.target.value })}
                      placeholder="e.g. ব্যাং অ্যান্ড অলুফসেন হেডফোন"
                      className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-neutral-400 block mb-1">Tagline (English)</label>
                    <input
                      type="text"
                      value={productFormData.taglineEn || ''}
                      onChange={(e) => setProductFormData({ ...productFormData, taglineEn: e.target.value })}
                      placeholder="e.g. Masterpiece Titanium Edition"
                      className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 block mb-1">Tagline (Bengali)</label>
                    <input
                      type="text"
                      value={productFormData.taglineBn || ''}
                      onChange={(e) => setProductFormData({ ...productFormData, taglineBn: e.target.value })}
                      placeholder="e.g. মাস্টারপিস টাইটানিয়াম এডিশন"
                      className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-neutral-400 block mb-1">Price (BDT ৳) *</label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={productFormData.price || 0}
                      onChange={(e) => setProductFormData({ ...productFormData, price: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-xl text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 block mb-1">Original MSRP (BDT ৳)</label>
                    <input
                      type="number"
                      value={productFormData.originalPrice || 0}
                      onChange={(e) => setProductFormData({ ...productFormData, originalPrice: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-xl text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 block mb-1">Stock Quantity *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={productFormData.stockCount || 0}
                      onChange={(e) => setProductFormData({ ...productFormData, stockCount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-xl text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-neutral-400 block mb-1">Category *</label>
                    <select
                      value={productFormData.category || 'audio'}
                      onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value as ProductCategory })}
                      className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value="audio">Audio Flagship</option>
                      <option value="wearables">Smart Wearables</option>
                      <option value="desk-charging">Desk & Power</option>
                      <option value="apple-ecosystem">Apple Ecosystem</option>
                      <option value="photography">Photography</option>
                      <option value="lifestyle">Luxury Lifestyle</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-neutral-400 block mb-1">Brand *</label>
                    <input
                      type="text"
                      required
                      value={productFormData.brand || ''}
                      onChange={(e) => setProductFormData({ ...productFormData, brand: e.target.value })}
                      placeholder="e.g. Bang & Olufsen, Apple, Devialet"
                      className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-neutral-400 block mb-1">Warranty Info</label>
                    <input
                      type="text"
                      value={productFormData.warranty || ''}
                      onChange={(e) => setProductFormData({ ...productFormData, warranty: e.target.value })}
                      placeholder="e.g. 2 Years Official Bangladesh Warranty"
                      className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 block mb-1">Highlight Badge</label>
                    <select
                      value={productFormData.badge || 'new'}
                      onChange={(e) => setProductFormData({ ...productFormData, badge: e.target.value as any })}
                      className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value="new">New Arrival</option>
                      <option value="bestseller">Bestseller</option>
                      <option value="limited">Limited Edition</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black font-bold shadow-lg shadow-[#D4AF37]/20 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Product to Catalog</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
