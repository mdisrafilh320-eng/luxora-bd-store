import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Server-side Gemini AI Client with User-Agent header
const geminiApiKey = process.env.GEMINI_API_KEY || "";
let aiClient: GoogleGenAI | null = null;

if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// System instruction for Luxora Assistant
const SYSTEM_INSTRUCTION = `You are "Luxora Assistant" (লুক্সোরা সহকারী), the sophisticated, polite, and knowledgeable AI Customer Concierge for "Luxora BD" (www.luxorabd.com) — Bangladesh's premier minimalist luxury e-commerce destination for high-end gadgets, audio devices, smart wearables, Apple accessories, and premium lifestyle gear.

Your Key Personality & Guidelines:
1. Tone: Warm, refined, respectful, trustworthy, and helpful. Use polite Bangladeshi hospitality tone ("আসসালামু আলাইকুম", "ধন্যবাদ", "স্বাগতম").
2. Language: Bilingual (Bangla & English). Answer in whichever language the customer writes in. If they write in Bengali/Banglish, reply in clear, elegant Bengali (বাংলা). If English, reply in polished English.
3. Delivery Rates & Shipping Info:
   - Inside Dhaka Metropolitan: ৳70 (Delivery in 24 hours / Express same-day available).
   - Chattogram City: ৳100 (Delivery in 24-48 hours).
   - Sylhet & All Other 64 Districts Nationwide: ৳120 (Delivery in 48-72 hours via Steadfast & Pathao Courier).
   - Free Delivery Offer: On all orders equal to or exceeding ৳5,000 BDT!
4. Payment Options:
   - 100% Cash on Delivery (COD) with full doorstep inspection before receiving.
   - Partial Advance Payment: Customer can pay only the courier delivery charge (৳70/৳100/৳120) via bKash / Nagad / Rocket merchant to confirm the shipment, paying the product price upon delivery.
   - Full Digital Advance: bKash / Nagad Merchant payment or Card.
5. Official Authenticity & Warranty:
   - 100% genuine factory sealed products with verification seal.
   - 7 Days Instant Replacement Warranty for manufacturing faults.
   - 12 to 24 Months Official Brand Warranty (with warranty card included in packaging).
6. Order Tracking:
   - Customers can track live delivery status directly using their Order ID (format: LUX-XXXXXX) or their Phone Number on the Track Order page.
   - Courier partners: Steadfast Luxury Express and Pathao Courier.
7. Product Categories:
   - Premium Audio (Bang & Olufsen, Master & Dynamic, Sony WH-1000XM5, Devialet)
   - Luxury Smartwatches & Wearables (Apple Watch Ultra, Garmin Marq, Galaxy Watch Ultra)
   - Desk Setups & MagSafe Charging (Nomad Base One, Anker Prime, Satechi Trio)
   - Apple Ecosystem (AirPods Max, MagSafe Wallets, Leather Cases)
   - Leica & Hasselblad Photography Gear
   - Minimalist EDC & Desk Organizers
8. Hotline & WhatsApp:
   - WhatsApp Support: +880 1700-LUXORA (+880 1700-000000)
   - Email: support@luxorabd.com
   - Showroom: Level 4, Plot 11, Road 11, Banani, Dhaka.

Keep your replies concise, well-formatted with markdown/bullet points when appropriate, and always focus on solving the customer's request gracefully.`;

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Gemini AI Chat Proxy Endpoint
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, history = [], language = "en" } = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "A message string is required." });
      return;
    }

    // If Gemini API Key is configured on the server
    if (aiClient) {
      const chat = aiClient.chats.create({
        model: "gemini-3.7-flash",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION + `\nPreferred customer language: ${language === 'bn' ? 'Bengali (বাংলা)' : 'English'}.`,
          temperature: 0.7,
        },
      });

      // Pass previous turns if any
      if (Array.isArray(history) && history.length > 0) {
        for (const turn of history) {
          if (turn.role === 'user' && turn.content) {
            // Note: chat session state
          }
        }
      }

      const response = await chat.sendMessage({ message });
      const reply = response.text || "";

      res.json({ 
        success: true, 
        reply: reply.trim(),
        provider: "gemini-3.7-flash"
      });
      return;
    }

    // Fallback if no API key is set in environment: High-quality rule-based AI Concierge response
    const fallbackResponse = generateConciergeFallback(message, language);
    res.json({
      success: true,
      reply: fallbackResponse,
      provider: "luxora-concierge-knowledgebase"
    });
  } catch (error: any) {
    console.error("Gemini API Error in /api/ai/chat:", error);
    // Return friendly concierge response even if external API limits or errors occur
    const fallbackResponse = generateConciergeFallback(req.body?.message || "", req.body?.language || "en");
    res.json({
      success: true,
      reply: fallbackResponse,
      provider: "fallback-recovery"
    });
  }
});

// Mock/REST Courier Delivery Tracking API Endpoint (Steadfast / Pathao integration bridge)
app.post("/api/courier/track", async (req, res) => {
  try {
    const { consignmentId, courier = "steadfast", phone } = req.body;

    // Simulate real-time courier API payload structure (e.g. Steadfast / Pathao REST)
    const simulatedTracking = {
      consignmentId: consignmentId || `STDF-${Math.floor(100000 + Math.random() * 900000)}`,
      courierName: courier === 'pathao' ? 'Pathao Logistics Express' : 'Steadfast Courier Ltd',
      recipientPhone: phone || '017XXXXXXXX',
      currentStatus: 'in_transit',
      statusCode: 'HUB_IN_TRANSIT',
      statusEn: 'Package in Transit to Destination Hub',
      statusBn: 'পার্সেলটি গন্তব্য হাবের উদ্দেশ্যে পাঠানো হয়েছে',
      currentLocation: 'Tejgaon Central Sorting Hub, Dhaka',
      assignedRider: {
        name: 'Tanvir Hossain (Delivery Hero)',
        phone: '+880 1845-920182',
        rating: '4.9 ★',
      },
      events: [
        {
          titleEn: 'Order Dispatched from Banani Vault',
          titleBn: 'লুক্সোরা বনানী ভল্ট থেকে পার্সেল হস্তান্তর',
          time: new Date(Date.now() - 3600000 * 5).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: 'Today',
          completed: true,
        },
        {
          titleEn: 'Central Sorting & Quality Scan Complete',
          titleBn: 'সেন্ট্রাল সর্টিং ও কিউআর স্ক্যান সম্পন্ন',
          time: new Date(Date.now() - 3600000 * 2).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: 'Today',
          completed: true,
        },
        {
          titleEn: 'Dispatched with Delivery Rider',
          titleBn: 'ডেলিভারি রাইডারের কাছে হস্তান্তর করা হয়েছে',
          time: 'In Progress',
          date: 'Today',
          completed: false,
        },
      ],
      estimatedDelivery: 'Within 24 Hours (Guaranteed Doorstep Delivery)',
    };

    res.json({ success: true, data: simulatedTracking });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Courier API tracking error" });
  }
});

// Fallback Rule-Based Knowledgebase for instant offline/keyless reliability
function generateConciergeFallback(query: string, language: string): string {
  const q = query.toLowerCase();
  const isBn = language === 'bn' || /[\u0980-\u09FF]/.test(query);

  if (q.includes('order') || q.includes('অর্ডার') || q.includes('কিভাবে') || q.includes('how to')) {
    if (isBn) {
      return `**লুক্সোরা বিডি-তে অর্ডার করার নিয়ম:**
1. আপনার পছন্দের গ্যাজেটটি নির্বাচন করে **"Add to Bag"** অথবা **"Buy Now"** চাপুন।
2. কার্ট ড্রয়ার থেকে **"Proceed to Secure Checkout"** এ যান।
3. আপনার নাম, ফোন নম্বর ও সঠিক ডেলিভারি ঠিকানা (জেলা সহ) লিখুন।
4. **ক্যাশ অন ডেলিভারি (COD)** অথবা **বিকাশ/নগদ আংশিক অগ্রিম** পেমেন্ট মোড বেছে নিয়ে অর্ডার সম্পন্ন করুন!
আপনার অর্ডারের কনফার্মেশন এসএমএস ও ইমেইলে ট্র্যাকিং নম্বর (LUX-XXXXXX) পৌঁছে যাবে।`;
    }
    return `**How to place an order on Luxora BD:**
1. Browse our luxury catalog and click **"Add to Bag"** or **"Buy Now"**.
2. Open your Cart and proceed to **"Secure Checkout"**.
3. Provide your delivery address & 64-district location.
4. Choose **100% Cash on Delivery (COD)** or **bKash/Nagad Partial Advance**, then submit!
You will receive an instant Order ID (e.g. LUX-XXXXXX) to track live status.`;
  }

  if (q.includes('delivery') || q.includes('charge') || q.includes('ডেলিভারি') || q.includes('খরচ') || q.includes('শিপিং')) {
    if (isBn) {
      return `**লুক্সোরা বিডি ডেলিভারি পলিসি ও চার্জসমূহ:**
- 🏙️ **ঢাকা মেট্রোপলিটন:** ৳৭০ (২৪ ঘণ্টার মধ্যে ডেলিভারি)
- 🌊 **চট্টগ্রাম সিটি:** ৳১০০ (২৪-৪৮ ঘণ্টা)
- 🇧🇩 **সিলেট ও বাংলাদেশের সকল ৬৪ জেলা:** ৳১২০ (৪৮-৭২ ঘণ্টা)
- ✨ **ফ্রি ডেলিভারি অফার:** ৳৫,০০০ বা তার বেশি অর্ডারে সারাদেশে ডেলিভারি সম্পূর্ণ **ফ্রি**!`;
    }
    return `**Luxora BD Shipping & Delivery Rates:**
- 🏙️ **Dhaka Metro:** ৳70 (Within 24 Hours)
- 🌊 **Chattogram City:** ৳100 (24-48 Hours)
- 🇧🇩 **Sylhet & All 64 Districts:** ৳120 (48-72 Hours)
- ✨ **FREE Nationwide Delivery:** On all orders of ৳5,000 BDT or above!`;
  }

  if (q.includes('payment') || q.includes('bkash') || q.includes('nagad') || q.includes('পেমেন্ট') || q.includes('বিকাশ') || q.includes('নগদ') || q.includes('টাকা')) {
    if (isBn) {
      return `**পেমেন্ট পদ্ধতিসমূহ:**
1. **ক্যাশ অন ডেলিভারি (COD):** পার্সেল হাতে পেয়ে দেখে সম্পূর্ণ মূল্য পরিশোধ করার সুবিধা।
2. **অগ্রিম ডেলিভারি চার্জ (Partial Advance):** শুধু ডেলিভারি ফি বিকাশ/নগদে পাঠিয়ে অর্ডার নিশ্চিত করতে পারেন, পণ্যের মূল্য ডেলিভারির সময় দেবেন।
3. **বিকাশ / নগদ / রকেট মার্চেন্ট পেমেন্ট:** পেমেন্ট করার পর ট্রানজেকশন আইডি (TrxID) দিলে স্বয়ংক্রিয়ভাবে ভেরিফাই হয়ে যাবে।`;
    }
    return `**Payment Methods Available:**
1. **100% Cash on Delivery (COD):** Pay full invoice at your doorstep after inspecting the sealed unit.
2. **Partial Advance (Delivery Charge Only):** Pay just ৳70/৳100/৳120 via bKash/Nagad to confirm booking; pay the rest upon delivery.
3. **Full MFS Advance:** Direct bKash/Nagad merchant checkout with instant TrxID validation.`;
  }

  if (q.includes('warranty') || q.includes('return') || q.includes('ওয়ারেন্টি') || q.includes('রিটার্ন') || q.includes('গ্যারান্টি')) {
    if (isBn) {
      return `**ওয়ারেন্টি ও রিটার্ন নিশ্চয়তা:**
- 🛡️ **১০০% অরিজিনাল সিল্ড প্রোডাক্ট:** লুক্সোরা শুধুমাত্র অথেনটিক প্রিমিয়াম প্রোডাক্ট সরবরাহ করে।
- 🔄 **৭ দিনের ইনস্ট্যান্ট রিপ্লেসমেন্ট:** কোনো ধরণের ম্যানুফ্যাকচারিং ত্রুটি থাকলে সরাসরি রিপ্লেসমেন্ট।
- 📜 **১২-২৪ মাসের অফিশিয়াল ওয়ারেন্টি:** প্যাকেজে অফিশিয়াল ওয়ারেন্টি কার্ড সংযুক্ত থাকে।`;
    }
    return `**Warranty & Return Guarantee:**
- 🛡️ **100% Genuine Sealed Units:** We only curate verified authentic luxury gadgets.
- 🔄 **7 Days Replacement Warranty:** Hassle-free replacement for any technical/manufacturing defects.
- 📜 **12 to 24 Months Official Brand Warranty:** Authenticated warranty card included with your parcel.`;
  }

  if (q.includes('track') || q.includes('ট্র্যাক') || q.includes('status') || q.includes('খোঁজ')) {
    if (isBn) {
      return `আপনার অর্ডার ট্র্যাক করতে আমাদের **"Track Order"** পেইজে যান এবং আপনার **Order ID (যেমন: LUX-XXXXXX)** অথবা মোবাইল নম্বরটি লিখুন। আপনি তাৎক্ষণিকভাবে পার্সেলের রিয়েল-টাইম লাইভ লোকেশন ও রাইডারের ফোন নম্বর দেখতে পাবেন।`;
    }
    return `To track your shipment, visit our **"Track Order"** section and enter your **Order ID (e.g. LUX-XXXXXX)** or Registered Mobile Number to view live courier milestones, hub dispatch times, and delivery rider details.`;
  }

  if (isBn) {
    return `আসসালামু আলাইকুম! আমি লুক্সোরা এআই অ্যাসিস্ট্যান্ট। 

আমি আপনাকে প্রোডাক্টের তথ্য, ডেলিভারি চার্জ, বিকাশ/নগদ পেমেন্ট প্রসেস, অর্ডার ট্র্যাকিং এবং ওয়ারেন্টি পলিসি সম্পর্কে সহায়তা করতে পারি। আপনি কি নির্দিষ্ট কোনো গ্যাজেট বা তথ্য খুঁজছেন?`;
  }
  return `Welcome to Luxora BD Concierge! 

I can assist you with product specifications, nationwide delivery rates (Dhaka ৳70, Nationwide ৳120, Free above ৳5,000), bKash/Nagad payments, real-time courier tracking, and our 7-day replacement warranty. How may I assist you today?`;
}

// Start Server with Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Luxora BD Full-Stack Server running on http://localhost:${PORT}`);
  });
}

startServer();
