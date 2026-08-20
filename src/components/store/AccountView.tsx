import React, { useState, useEffect } from 'react';
import { 
  User, 
  Package, 
  MapPin, 
  ShieldCheck, 
  LogOut, 
  Phone, 
  Mail, 
  Clock, 
  ChevronRight, 
  Sparkles,
  Truck,
  CheckCircle2,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { orderService } from '../../services/orderService';
import { Order } from '../../types';
import { formatBDT } from '../../translations';

export const AccountView: React.FC = () => {
  const { currentUser, userProfile, logout, setActiveView, language, t, addToast } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'addresses'>('orders');

  useEffect(() => {
    if (!currentUser) return;
    const fetchOrders = async () => {
      setIsLoadingOrders(true);
      try {
        const userOrders = await orderService.getUserOrders(currentUser.id);
        setOrders(userOrders);
      } catch (err) {
        console.error('Failed to load user orders:', err);
      } finally {
        setIsLoadingOrders(false);
      }
    };
    fetchOrders();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="card-bg border border-[#1E1E24] rounded-3xl p-12 max-w-md mx-auto">
          <User className="w-12 h-12 gold-text mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            {language === 'bn' ? 'সাইন ইন প্রয়োজন' : 'Sign In to Access VIP Club'}
          </h2>
          <p className="text-xs text-gray-400 mb-6">
            {language === 'bn'
              ? 'আপনার অর্ডার ট্র্যাক এবং এক্সক্লুসিভ লাক্সারি প্রিভিলেজ দেখতে সাইন ইন করুন।'
              : 'Sign in to view your real-time order tracking, address book, and VIP privileges.'}
          </p>
          <button
            onClick={() => setActiveView('store')}
            className="gold-bg text-black font-bold text-xs uppercase tracking-widest py-3 px-8 rounded-full hover:brightness-110 cursor-pointer"
          >
            {language === 'bn' ? 'হোমে ফিরে যান' : 'Return to Boutique'}
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    setActiveView('store');
    addToast({
      type: 'info',
      titleEn: 'Logged Out',
      titleBn: 'লগ আউট সম্পন্ন',
      descriptionEn: 'You have been safely signed out.',
      descriptionBn: 'সফলভাবে লগআউট হয়েছেন।',
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back button */}
      <button
        onClick={() => setActiveView('store')}
        className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{language === 'bn' ? 'স্টোরে ফিরে যান' : 'Back to Boutique'}</span>
      </button>

      {/* Header Profile Banner */}
      <div className="card-bg border border-[#1E1E24] rounded-3xl p-6 sm:p-8 mb-8 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-2xl">
        <div className="absolute top-0 inset-x-0 h-1 gold-bg" />
        
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl slate-bg border border-white/10 flex items-center justify-center text-xl font-bold font-luxury gold-text shadow-lg">
            {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : 'VIP'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white font-sans">
                {userProfile?.name || currentUser.email || 'Valued Member'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full gold-bg text-black text-[10px] font-black uppercase tracking-wider">
                VIP LUXE
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 font-mono">
              {currentUser.email || currentUser.phoneNumber || 'Authenticated User'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="slate-bg border border-white/10 hover:border-red-500/40 hover:text-red-400 text-gray-300 text-xs font-semibold px-5 py-2.5 rounded-full flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'লগ আউট' : 'Sign Out'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1E1E24] mb-8">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-5 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'gold-text border-b-2 gold-border'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>{language === 'bn' ? 'অর্ডার হিস্টোরি' : 'Orders & Shipments'}</span>
          {orders.length > 0 && (
            <span className="w-5 h-5 rounded-full slate-bg border border-white/10 text-[10px] flex items-center justify-center font-mono">
              {orders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-5 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'gold-text border-b-2 gold-border'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{language === 'bn' ? 'মেম্বারশিপ প্রোফাইল' : 'VIP Profile'}</span>
        </button>
      </div>

      {/* 1. Orders Tab Content */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {isLoadingOrders ? (
            <div className="card-bg border border-[#1E1E24] rounded-2xl p-10 text-center text-xs text-gray-400">
              <span className="animate-pulse">{language === 'bn' ? 'অর্ডার লোড হচ্ছে...' : 'Loading order history from secure Firestore...'}</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="card-bg border border-[#1E1E24] rounded-3xl p-12 text-center">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">
                {language === 'bn' ? 'কোনো অর্ডার নেই' : 'No Orders Found Yet'}
              </h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6">
                {language === 'bn'
                  ? 'আপনি এখনও কোনো গ্যাজেট অর্ডার করেননি। আমাদের ক্যাটালগ ব্রাউজ করুন।'
                  : 'You have not placed any orders yet. Explore our curated gadgets to elevate your setup.'}
              </p>
              <button
                onClick={() => setActiveView('store')}
                className="gold-bg text-black font-bold text-xs uppercase tracking-widest py-3 px-8 rounded-full hover:brightness-110 cursor-pointer"
              >
                {language === 'bn' ? 'কালেকশন দেখুন' : 'Explore Collections'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="card-bg border border-[#1E1E24] hover:border-white/20 rounded-2xl p-5 sm:p-6 transition-all shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E1E24]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white">
                          #{order.id.slice(0, 10).toUpperCase()}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          order.orderStatus === 'Delivered'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                            : 'bg-amber-950 text-amber-300 border border-amber-800/40'
                        }`}>
                          {order.orderStatus}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 font-mono mt-1 block">
                        Payment: {order.paymentMethod.toUpperCase()} • Delivery: {order.customer?.district || 'Bangladesh'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-bold gold-text font-sans block">
                        {formatBDT(order.totalAmount, language)}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="py-4 space-y-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-3">
                          <img src={item.image} alt={item.nameEn} referrerPolicy="no-referrer" className="w-10 h-10 rounded-lg object-cover" />
                          <div>
                            <span className="font-semibold text-white block">{language === 'bn' ? item.nameBn : item.nameEn}</span>
                            <span className="text-[11px] text-gray-400">Qty: {item.quantity} {item.selectedColor ? `• ${item.selectedColor}` : ''}</span>
                          </div>
                        </div>
                        <span className="font-mono text-gray-300">{formatBDT(item.price * item.quantity, language)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Progress tracker & Actions */}
                  <div className="pt-4 border-t border-[#1E1E24] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-gray-400">
                    <div className="flex items-center gap-2 text-emerald-400 font-medium">
                      <Truck className="w-4 h-4" />
                      <span>{language === 'bn' ? `ডেলিভারি স্ট্যাটাস: ${order.orderStatus}` : `Status: ${order.orderStatus} & Live Tracking Enabled`}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-gray-500 hidden sm:inline">
                        {order.customer?.name} ({order.customer?.phone})
                      </span>
                      <button
                        onClick={() => setActiveView('track')}
                        className="px-3 py-1.5 rounded-lg gold-bg text-black font-bold text-[10px] uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'ট্র্যাক করুন' : 'Track Consignment'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Profile Tab Content */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-bg border border-[#1E1E24] rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider gold-text mb-4 font-mono">
              {language === 'bn' ? 'ব্যক্তিগত তথ্য' : 'VIP Credentials'}
            </h3>
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-gray-500 block mb-1">Full Name</span>
                <span className="text-white font-semibold text-sm">{userProfile?.name || 'Not Set'}</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">Email Address</span>
                <span className="text-white font-semibold">{currentUser.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">Phone Number</span>
                <span className="text-white font-semibold">{currentUser.phoneNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">VIP Tier</span>
                <span className="gold-text font-bold uppercase">Gold Concierge Member</span>
              </div>
            </div>
          </div>

          <div className="card-bg border border-[#1E1E24] rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider gold-text mb-4 font-mono">
              {language === 'bn' ? 'সাপোর্ট ও কনসিয়ার্জ' : 'Concierge Assistance'}
            </h3>
            <p className="text-xs text-gray-300 mb-4 leading-relaxed">
              {language === 'bn'
                ? 'যেকোনো প্রযুক্তিগত পরামর্শ, সিরিয়াল ভেরিফিকেশন বা কাস্টম অর্ডারের জন্য আমাদের ডেডিকেটেড কনসিয়ার্জের সাথে যোগাযোগ করুন।'
                : 'Need immediate serial code validation, pre-orders, or private consultations? Reach our Dhaka concierge desk.'}
            </p>
            <div className="space-y-2.5 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 gold-text" />
                <span>Hotline: +880 1700-LUXORA (+880 1700-589672)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 gold-text" />
                <span>Concierge: vip@luxorabd.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 gold-text" />
                <span>Showroom: Level 4, Gulshan Avenue, Dhaka-1212</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
