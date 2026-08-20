import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HelpCircle, 
  ChevronDown, 
  Phone, 
  MessageSquare, 
  Mail, 
  MapPin, 
  Clock, 
  Truck, 
  CreditCard, 
  ShieldCheck, 
  RefreshCw, 
  ExternalLink,
  ArrowLeft,
  Sparkles,
  Bot
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface FAQItem {
  id: string;
  category: 'delivery' | 'payment' | 'warranty' | 'authenticity';
  questionEn: string;
  questionBn: string;
  answerEn: string;
  answerBn: string;
}

export const CustomerSupportHub: React.FC = () => {
  const { language, setActiveView } = useApp();
  const [activeCategory, setActiveCategory] = useState<'all' | 'delivery' | 'payment' | 'warranty' | 'authenticity'>('all');
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');

  const faqs: FAQItem[] = [
    {
      id: 'faq-1',
      category: 'delivery',
      questionEn: 'What are the delivery charges and timelines across Bangladesh?',
      questionBn: 'ঢাকা ও সারাদেশে ডেলিভারি চার্জ কত এবং কত সময় লাগে?',
      answerEn: 'Inside Dhaka Metropolitan area, delivery is ৳70 (typically delivered in 24 hours). Chattogram City is ৳100 (24-48 hours). All other 64 districts nationwide are ৳120 (48-72 hours via Steadfast & Pathao Logistics). Nationwide delivery is completely FREE on all orders of ৳5,000 BDT or above!',
      answerBn: 'ঢাকা মেট্রোপলিটন এলাকায় ডেলিভারি চার্জ মাত্র ৳৭০ (২৪ ঘণ্টার মধ্যে ডেলিভারি)। চট্টগ্রাম সিটিতে ৳১০০ (২৪-৪৮ ঘণ্টা) এবং অন্যান্য সকল ৬৪ জেলায় ৳১২০ (স্টেডফাস্ট ও পাঠাও এক্সপ্রেসের মাধ্যমে ৪৮-৭২ ঘণ্টা)। যেকোনো ৳৫,০০০ বা তার বেশি মূল্যের অর্ডারে সারাদেশে ডেলিভারি সম্পূর্ণ ফ্রি!',
    },
    {
      id: 'faq-2',
      category: 'delivery',
      questionEn: 'How can I track my shipment in real-time?',
      questionBn: 'আমার পার্সেলের লাইভ ডেলিভারি স্ট্যাটাস কীভাবে ট্র্যাক করব?',
      answerEn: 'You can navigate to our "Track Order" page and input your Order ID (format: LUX-XXXXXX) or registered phone number. You will receive real-time courier consignment checkpoints, sorting hub statuses, and the assigned delivery rider contact info.',
      answerBn: 'আমাদের "Track Order" পেইজে গিয়ে আপনার Order ID (যেমন: LUX-892014) অথবা ফোন নম্বরটি লিখলে তাৎক্ষণিকভাবে লাইভ কুরিয়ার কনসাইনমেন্ট, সর্টিং হাবের অবস্থান ও রাইডারের ফোন নম্বর দেখতে পাবেন।',
    },
    {
      id: 'faq-3',
      category: 'payment',
      questionEn: 'Can I pay via 100% Cash on Delivery (COD)?',
      questionBn: 'আমি কি ১০০% ক্যাশ অন ডেলিভারিতে অর্ডার করতে পারব?',
      answerEn: 'Yes! Luxora BD supports 100% Cash on Delivery nationwide. You can inspect the factory-sealed parcel upon arrival at your doorstep before paying the delivery agent.',
      answerBn: 'অবশ্যই! লুক্সোরা বিডি সারাদেশে ১০০% ক্যাশ অন ডেলিভারি সুবিধা দেয়। পার্সেল আপনার ঠিকানায় পৌঁছানোর পর দেখে নিশ্চিন্তে ডেলিভারি রাইডারকে টাকা পরিশোধ করতে পারেন।',
    },
    {
      id: 'faq-4',
      category: 'payment',
      questionEn: 'How does the Partial Advance Payment (Delivery Fee only) work?',
      questionBn: 'আংশিক অগ্রিম (শুধু ডেলিভারি চার্জ) পেমেন্ট প্রক্রিয়াটি কী?',
      answerEn: 'To secure non-serious order cancellations, you can optionally pay only the courier charge (৳70/৳100/৳120) via bKash or Nagad Merchant. The full product price remains payable at your doorstep upon arrival.',
      answerBn: 'অর্ডার নিশ্চিত করতে আপনি চাইলে শুধুমাত্র কুরিয়ার ডেলিভারি চার্জটি (৳৭০/৳১০০/৳১২০) বিকাশ বা নগদ মার্চেন্টে পরিশোধ করতে পারেন। মূল পণ্যের টাকা ডেলিভারির সময় ক্যাশ পরিশোধ করলেই চলবে।',
    },
    {
      id: 'faq-5',
      category: 'warranty',
      questionEn: 'What is Luxora BD’s replacement and warranty policy?',
      questionBn: 'লুক্সোরা বিডি-র রিপ্লেসমেন্ট এবং ওয়ারেন্টি পলিসি কেমন?',
      answerEn: 'Every luxury tech product comes with an Instant 7-Day Replacement Warranty against any manufacturing defects. In addition, 12 to 24 Months Official Brand Warranty is provided with official warranty cards in the packaging.',
      answerBn: 'প্রতিটি প্রিমিয়াম গ্যাজেটের সাথে ৭ দিনের ইনস্ট্যান্ট রিপ্লেসমেন্ট গ্যারান্টি রয়েছে (কোনো ম্যানুফ্যাকচারিং সমস্যা থাকলে সরাসরি পরিবর্তন)। এছাড়া ১২ থেকে ২৪ মাসের অফিশিয়াল ওয়ারেন্টি কার্ড প্যাকেজের সাথে সংযুক্ত থাকে।',
    },
    {
      id: 'faq-6',
      category: 'authenticity',
      questionEn: 'Are all products 100% genuine and factory sealed?',
      questionBn: 'সব প্রোডাক্ট কি শতভাগ অরিজিনাল ও ইনট্যাক্ট সিল্ড?',
      answerEn: 'Every item curated on Luxora BD is sourced directly from authorized global brands (Apple, Sony, Bang & Olufsen, Nomad, Leica). We never sell refurbished, cloned, or replica products. Each unit includes a tamper-proof verification seal.',
      answerBn: 'লুক্সোরা বিডি শুধুমাত্র অনুমোদিত গ্লোবাল ব্র্যান্ড (Apple, Sony, B&O, Nomad) থেকে আমদানিকৃত ১০০% অরিজিনাল ইনট্যাক্ট সিল্ড প্রোডাক্ট সরবরাহ করে। কোনো মাস্টার কপি বা ক্লোন প্রোডাক্ট আমরা বিক্রি করি না।',
    },
  ];

  const filteredFaqs = activeCategory === 'all' 
    ? faqs 
    : faqs.filter(f => f.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#09090C] text-[#EDEDED] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E1E28] pb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView('store')}
              className="p-2 rounded-xl bg-[#14141C] border border-[#262634] text-gray-400 hover:text-white hover:border-[#D4AF37] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full gold-bg animate-pulse" />
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#D4AF37]">
                  {language === 'bn' ? '২৪/৭ কাস্টমার সার্ভিস' : 'CONCIERGE & CLIENT CARE'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-luxury tracking-wide mt-0.5">
                {language === 'bn' ? 'সহায়তা কেন্দ্র ও প্রশ্নোত্তর' : 'Client Support & FAQ Hub'}
              </h1>
            </div>
          </div>

          <button
            onClick={() => setActiveView('track')}
            className="px-4 py-2.5 rounded-xl gold-bg text-black text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-[#D4AF37]/20"
          >
            <Truck className="w-4 h-4" />
            <span>{language === 'bn' ? 'অর্ডার ট্র্যাক করুন' : 'Track Consignment'}</span>
          </button>
        </div>

        {/* Direct Connect Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* WhatsApp Hotline */}
          <a
            href="https://wa.me/8801700000000"
            target="_blank"
            rel="noreferrer"
            className="p-5 rounded-3xl bg-[#121218] border border-[#242434] hover:border-emerald-500/50 hover:bg-[#161622] transition-all group cursor-pointer block space-y-2"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white font-luxury">WhatsApp Helpline</h3>
            <p className="text-xs text-emerald-400 font-mono">+880 1700-000000</p>
            <span className="text-[11px] text-gray-400 block">{language === 'bn' ? 'তাৎক্ষণিক চ্যাট ও কনফার্মেশন' : 'Instant 24/7 Chat & Ordering'}</span>
          </a>

          {/* Voice Phone Call */}
          <a
            href="tel:+8801700000000"
            className="p-5 rounded-3xl bg-[#121218] border border-[#242434] hover:border-[#D4AF37]/50 hover:bg-[#161622] transition-all group cursor-pointer block space-y-2"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Phone className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white font-luxury">VIP Concierge Call</h3>
            <p className="text-xs text-[#D4AF37] font-mono">+880 1700-LUXORA</p>
            <span className="text-[11px] text-gray-400 block">{language === 'bn' ? 'সকাল ৯টা - রাত ১১টা' : '09:00 AM – 11:00 PM Daily'}</span>
          </a>

          {/* Email Support */}
          <a
            href="mailto:support@luxorabd.com"
            className="p-5 rounded-3xl bg-[#121218] border border-[#242434] hover:border-blue-500/50 hover:bg-[#161622] transition-all group cursor-pointer block space-y-2"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-950/40 border border-blue-800/40 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white font-luxury">Official Email</h3>
            <p className="text-xs text-blue-400 font-mono">support@luxorabd.com</p>
            <span className="text-[11px] text-gray-400 block">{language === 'bn' ? 'কর্পোরেট ও ওয়ারেন্টি সেবা' : 'Corporate & Warranty Queries'}</span>
          </a>

          {/* Flagship Showroom */}
          <div className="p-5 rounded-3xl bg-[#121218] border border-[#242434] space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-950/40 border border-purple-800/40 text-purple-400 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white font-luxury">Banani Showroom</h3>
            <p className="text-xs text-purple-300">Level 4, Plot 11, Road 11</p>
            <span className="text-[11px] text-gray-400 block">Banani, Dhaka 1213</span>
          </div>

        </div>

        {/* AI Assistant Callout Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#14141E] via-[#1A1A28] to-[#14141E] border border-[#D4AF37]/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-xs text-[#D4AF37] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'স্মার্ট এআই সহায়তা' : 'Google Gemini-Powered AI Concierge'}</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold font-luxury text-white">
              {language === 'bn' ? 'কোনো জিজ্ঞাসা আছে? আমাদের এআই অ্যাসিস্ট্যান্টকে প্রশ্ন করুন!' : 'Have a question? Ask Luxora AI Assistant right now!'}
            </h3>
            <p className="text-xs text-gray-400 max-w-xl">
              {language === 'bn'
                ? 'পণ্য স্পেসিফিকেশন, ৬৪ জেলার ডেলিভারি চার্জ ও বিকাশ পেমেন্ট সম্পর্কে বাংলায় অথবা ইংরেজিতে তাৎক্ষণিক সঠিক উত্তর পান।'
                : 'Get instant bilingual answers about premium gadget specs, doorstep delivery timelines, and MFS payment verification.'}
            </p>
          </div>

          <button
            onClick={() => {
              // Trigger AI widget
              const btn = document.querySelector('button[aria-label="Open AI Assistant"]') as HTMLButtonElement;
              if (btn) btn.click();
            }}
            className="px-6 py-3.5 rounded-2xl gold-bg text-black text-xs font-black uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-xl shadow-[#D4AF37]/20"
          >
            <Bot className="w-4 h-4" />
            <span>{language === 'bn' ? 'এআই চ্যাট শুরু করুন' : 'Chat with AI Concierge'}</span>
          </button>
        </div>

        {/* FAQ Accordion Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-luxury text-white">
                {language === 'bn' ? 'সাধারণ জিজ্ঞাসাসমূহ (FAQ)' : 'Frequently Asked Questions'}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {language === 'bn' ? 'গ্রাহকদের সাধারণ প্রশ্নের স্পষ্ট ও বিস্তারিত উত্তর' : 'Clear and transparent answers to popular client inquiries.'}
              </p>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'all', labelEn: 'All', labelBn: 'সকল' },
                { id: 'delivery', labelEn: 'Shipping', labelBn: 'ডেলিভারি' },
                { id: 'payment', labelEn: 'Payment', labelBn: 'পেমেন্ট' },
                { id: 'warranty', labelEn: 'Warranty', labelBn: 'ওয়ারেন্টি' },
                { id: 'authenticity', labelEn: 'Authenticity', labelBn: 'অথেনটিসিটি' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap text-xs font-medium ${
                    activeCategory === tab.id
                      ? 'gold-bg text-black font-bold shadow-md shadow-[#D4AF37]/15'
                      : 'bg-[#14141C] text-gray-400 hover:text-white border border-[#222230]'
                  }`}
                >
                  {language === 'bn' ? tab.labelBn : tab.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Accordion List */}
          <div className="space-y-3">
            {filteredFaqs.map((faq) => {
              const isOpen = openFaqId === faq.id;

              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isOpen 
                      ? 'bg-[#13131C] border-[#D4AF37]/40 shadow-xl' 
                      : 'bg-[#101016] border-[#20202C] hover:border-[#2E2E40]'
                  }`}
                >
                  <button
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className={`text-sm font-bold font-luxury ${isOpen ? 'gold-text' : 'text-white'}`}>
                      {language === 'bn' ? faq.questionBn : faq.questionEn}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 shrink-0 ${
                      isOpen ? 'rotate-180 text-[#D4AF37]' : ''
                    }`} />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-5 pb-5 text-xs text-gray-300 leading-relaxed border-t border-[#1C1C28] pt-3">
                          {language === 'bn' ? faq.answerBn : faq.answerEn}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
