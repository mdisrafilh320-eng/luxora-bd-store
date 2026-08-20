import { Language } from '../types';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isError?: boolean;
}

export interface QuickSuggestion {
  id: string;
  textEn: string;
  textBn: string;
  query: string;
}

export const QUICK_SUGGESTIONS: QuickSuggestion[] = [
  {
    id: 'how-to-order',
    textEn: 'How to place an order?',
    textBn: 'কীভাবে অর্ডার করব?',
    query: 'কীভাবে Luxora BD তে অর্ডার করতে হবে?'
  },
  {
    id: 'delivery-charges',
    textEn: 'Delivery fees & time?',
    textBn: 'ডেলিভারি চার্জ ও সময় কত?',
    query: 'ঢাকা ও সারাদেশে ডেলিভারি চার্জ কত এবং কত সময় লাগে?'
  },
  {
    id: 'payment-methods',
    textEn: 'bKash / COD payment process',
    textBn: 'বিকাশ ও ক্যাশ অন ডেলিভারি',
    query: 'ক্যাশ অন ডেলিভারি এবং বিকাশ বা নগদে আংশিক অগ্রিম পেমেন্টের নিয়ম কি?'
  },
  {
    id: 'warranty-policy',
    textEn: 'Official Warranty & 7-Day Return',
    textBn: 'ওয়ারেন্টি ও ৭ দিনের রিটার্ন পলিসি',
    query: 'প্রোডাক্টের অফিশিয়াল ওয়ারেন্টি ও রিপ্লেসমেন্ট গ্যারান্টি কীভাবে কাজ করে?'
  },
  {
    id: 'track-my-order',
    textEn: 'How to track my shipment?',
    textBn: 'আমার অর্ডার ট্র্যাক করব কীভাবে?',
    query: 'আমার পার্সেল বা অর্ডার কীভাবে ট্র্যাক করতে পারি?'
  },
  {
    id: 'contact-hotline',
    textEn: 'Banani Showroom & WhatsApp',
    textBn: 'বনানী শোরুম ও হোয়াটসঅ্যাপ',
    query: 'আপনাদের বনানী শোরুমের ঠিকানা এবং হোয়াটসঅ্যাপ নম্বর দিন।'
  }
];

/**
 * Send user query to the server-side Gemini AI proxy
 */
export async function sendChatMessageToAI(
  message: string,
  history: ChatMessage[],
  language: Language
): Promise<string> {
  try {
    const formattedHistory = history.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      content: msg.text,
    }));

    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history: formattedHistory,
        language,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    if (data && data.reply) {
      return data.reply;
    }

    throw new Error('Invalid response structure from AI proxy');
  } catch (error: any) {
    console.warn('AI Assistant API call fallback triggered:', error);
    // Local fallback responder
    return getLocalAssistantFallback(message, language);
  }
}

/**
 * High quality offline knowledgebase fallback in case network / API quota is limited
 */
export function getLocalAssistantFallback(query: string, language: Language): string {
  const q = query.toLowerCase();
  const isBn = language === 'bn' || /[\u0980-\u09FF]/.test(query);

  if (q.includes('order') || q.includes('অর্ডার') || q.includes('how to') || q.includes('কীভাবে') || q.includes('কিভাবে')) {
    if (isBn) {
      return `**লুক্সোরা বিডি-তে অর্ডার করার সহজ ধাপসমূহ:**
1. আপনার কাঙ্ক্ষিত গ্যাজেটটি নির্বাচন করে **"Add to Bag"** বা **"Buy Now"** চাপুন।
2. কার্ট ওপেন করে **"Proceed to Secure Checkout"** এ যান।
3. আপনার নাম, মোবাইল নম্বর এবং ৬৪ জেলার মধ্যে সঠিক ডেলিভারি ঠিকানা লিখুন।
4. **ক্যাশ অন ডেলিভারি (COD)** অথবা **বিকাশ/নগদ আংশিক অগ্রিম** অপশন বেছে নিয়ে অর্ডার সম্পন্ন করুন!
অর্ডার নিশ্চিত হওয়ার সাথে সাথে আপনার ট্র্যাকিং আইডি (যেমন: **LUX-892014**) জেনারেট হবে।`;
    }
    return `**How to order on Luxora BD:**
1. Select your luxury gadget and click **"Add to Bag"** or **"Buy Now"**.
2. Open your cart and proceed to **"Secure Checkout"**.
3. Fill in your delivery coordinates across Bangladesh's 64 districts.
4. Select **100% Cash on Delivery (COD)** or **bKash/Nagad Partial Advance**, then submit!
You will immediately receive your unique Order ID (e.g., **LUX-892014**).`;
  }

  if (q.includes('charge') || q.includes('delivery') || q.includes('fee') || q.includes('ডেলিভারি') || q.includes('খরচ') || q.includes('ভাড়া')) {
    if (isBn) {
      return `**লুক্সোরা বিডি ডেলিভারি রেট ও সময়সীমা:**
- 🏙️ **ঢাকা মেট্রোপলিটন:** ৳৭০ (২৪ ঘণ্টার মধ্যে ডেলিভারি)
- 🌊 **চট্টগ্রাম সিটি:** ৳১০০ (২৪-৪৮ ঘণ্টা)
- 🇧🇩 **সিলেট ও বাংলাদেশের অন্যান্য সকল জেলা:** ৳১২০ (৪৮-৭২ ঘণ্টা)
- ✨ **ফ্রি ডেলিভারি:** ৳৫,০০০ বা তদূর্ধ্ব অর্ডারে সারাদেশে ডেলিভারি সম্পূর্ণ ফ্রি!`;
    }
    return `**Luxora BD Nationwide Shipping Rates:**
- 🏙️ **Dhaka Metropolitan:** ৳70 (Within 24 Hours)
- 🌊 **Chattogram City:** ৳100 (24-48 Hours)
- 🇧🇩 **Sylhet & Rest of Bangladesh:** ৳120 (48-72 Hours)
- ✨ **FREE Shipping:** On all orders of ৳5,000 BDT or higher!`;
  }

  if (q.includes('bkash') || q.includes('nagad') || q.includes('payment') || q.includes('পেমেন্ট') || q.includes('বিকাশ') || q.includes('নগদ') || q.includes('টাকা')) {
    if (isBn) {
      return `**লুক্সোরা পেমেন্ট অপশনসমূহ:**
1. **ক্যাশ অন ডেলিভারি (COD):** পার্সেল হাতে পাওয়ার পর পণ্য দেখে সম্পূর্ণ মূল্য পরিশোধ করার ১০০% নিরাপদ সুবিধা।
2. **ডেলিভারি চার্জ অগ্রিম (Partial Advance):** শুধু ডেলিভারি চার্জ বিকাশ/নগদ মার্চেন্টে পাঠিয়ে অর্ডার বুকিং করতে পারেন, মূল পণ্যের দাম ডেলিভারির সময় দেবেন।
3. **ফুল ডিজিটাল পেমেন্ট:** বিকাশ/নগদ মার্চেন্ট নম্বরে পে করে Transaction ID (TrxID) দিলে স্বয়ংক্রিয়ভাবে পেমেন্ট ভেরিফাই হবে।`;
    }
    return `**Payment Methods Available:**
1. **100% Cash on Delivery (COD):** Full payment at doorstep after inspection.
2. **Partial Advance (Delivery Fee Only):** Pay only ৳70/৳100/৳120 via bKash/Nagad to secure booking.
3. **Full MFS Advance:** Direct merchant checkout with instant TrxID validation.`;
  }

  if (q.includes('warranty') || q.includes('return') || q.includes('রিটার্ন') || q.includes('ওয়ারেন্টি') || q.includes('নষ্ট') || q.includes('গ্যারান্টি')) {
    if (isBn) {
      return `**ওয়ারেন্টি ও রিপ্লেসমেন্ট পলিসি:**
- 🛡️ **১০০% জেনুইন সিল্ড প্রোডাক্ট:** প্রতিটি গ্যাজেটের সাথে অথেনটিসিটি সিরিয়াল নিশ্চিত করা হয়।
- 🔄 **৭ দিনের রিপ্লেসমেন্ট ওয়ারেন্টি:** কোনো ম্যানুফ্যাকচারিং ত্রুটি থাকলে সরাসরি ৭ দিনের মধ্যে বদল।
- 📜 **১২-২৪ মাসের অফিশিয়াল ওয়ারেন্টি:** প্যাকেজে অফিশিয়াল ওয়ারেন্টি কার্ড সংযুক্ত থাকে।`;
    }
    return `**Authenticity & Warranty Policy:**
- 🛡️ **100% Genuine Sealed Units:** We guarantee authentic products from official distributors.
- 🔄 **7 Days Replacement Warranty:** Immediate replacement for any technical/manufacturing defects.
- 📜 **12 to 24 Months Official Warranty:** Complete with stamped warranty cards.`;
  }

  if (q.includes('track') || q.includes('ট্র্যাক') || q.includes('কোথায়') || q.includes('stdf') || q.includes('lux-')) {
    if (isBn) {
      return `আপনার অর্ডার ট্র্যাক করতে উপরের নেভিগেশন বারের **"Track Order"** বাটনে যান। সেখানে আপনার **Order ID (যেমন: LUX-892014)** অথবা মোবাইল নম্বরটি লিখলে লাইভ কুরিয়ার স্ট্যাটাস, সর্টিং হাব ও রাইডারের ফোন নম্বর দেখতে পাবেন।`;
    }
    return `To track your order, navigate to the **"Track Order"** section and enter your **Order ID (e.g. LUX-892014)** or phone number to view live consignment milestones and assigned courier rider info.`;
  }

  if (isBn) {
    return `আসসালামু আলাইকুম! আমি **লুক্সোরা এআই কনসিয়ার্জ**।

আপনাকে কীভাবে সহায়তা করতে পারি? আপনি আমাদের প্রিমিয়াম গ্যাজেট সম্ভার, ৬৪ জেলায় ক্যাশ অন ডেলিভারি, বিকাশ/নগদ পেমেন্ট অথবা ৭ দিনের ওয়ারেন্টি পলিসি সম্পর্কে যেকোনো প্রশ্ন করতে পারেন।`;
  }
  return `Welcome to **Luxora BD AI Concierge**.

How may I assist you today? You can inquire about our premium curated tech products, nationwide shipping fees, bKash/Nagad payment verification, or official brand warranties.`;
}
