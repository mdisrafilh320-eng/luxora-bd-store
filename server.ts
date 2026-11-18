import express from "express";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import dotenv from "dotenv";

dotenv.config();

// Load Firebase config & initialize server-side Firestore SDK for reliable crawler OG previews & admin auth checks
let serverDb: ReturnType<typeof getFirestore> | null = null;
let firebaseApiKey = process.env.VITE_FIREBASE_API_KEY || "";
try {
  const cfgPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(cfgPath)) {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
    if (cfg.apiKey) firebaseApiKey = cfg.apiKey;
    const fbApp = getApps().length > 0 ? getApps()[0] : initializeApp(cfg);
    serverDb = getFirestore(fbApp, cfg.firestoreDatabaseId);
  }
} catch (err) {
  console.warn("Server Firestore init notice:", err);
}

const PRIMARY_SUPER_ADMIN_EMAIL = "mdisrafilh320@gmail.com";

interface OgProductRecord {
  id: string;
  nameEn: string;
  nameBn: string;
  taglineEn: string;
  descriptionEn: string;
  price: number;
  originalPrice: number;
  image: string;
}

const ogProductCache = new Map<string, { data: OgProductRecord | null; expiresAt: number }>();

function escapeHtmlAttr(val: string): string {
  return String(val || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getRequestPublicOrigin(req: express.Request): string {
  const proto =
    (req.headers["x-forwarded-proto"] as string)?.split(",")[0]?.trim() ||
    req.protocol ||
    "https";
  const host =
    (req.headers["x-forwarded-host"] as string)?.split(",")[0]?.trim() ||
    req.get("host") ||
    "";

  if (host && !/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(host)) {
    return `${proto}://${host}`;
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, "");
  }
  return host ? `${proto}://${host}` : "";
}

async function fetchProductForOpenGraph(productId: string): Promise<OgProductRecord | null> {
  const cleanId = productId.replace(/[^a-zA-Z0-9_.@-]/g, "_").trim();
  if (!cleanId || !serverDb) return null;

  const cached = ogProductCache.get(cleanId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  let resolved: OgProductRecord | null = null;
  const collections = ["products", "luxora-products"];

  for (const col of collections) {
    try {
      const snap = await Promise.race([
        getDoc(doc(serverDb, col, cleanId)),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("OG fetch timeout")), 3500)),
      ]);

      if (snap.exists()) {
        const d: any = snap.data() || {};
        const galleryArr = Array.isArray(d.gallery) ? d.gallery : [];
        const coverImage = String(d.image || galleryArr[0] || "").trim();
        resolved = {
          id: String(d.id || snap.id || cleanId),
          nameEn: String(d.nameEn || d.nameBn || "Luxora Curated Edition").trim(),
          nameBn: String(d.nameBn || "").trim(),
          taglineEn: String(d.taglineEn || "").trim(),
          descriptionEn: String(d.descriptionEn || "").trim(),
          price: Number(d.price) || 0,
          originalPrice: Number(d.originalPrice) || 0,
          image: coverImage,
        };
        break;
      }

      // Fallback check in case document ID differs from `id` field
      const qSnap = await getDocs(query(collection(serverDb, col), where("id", "==", productId.trim())));
      if (!qSnap.empty) {
        const firstDoc = qSnap.docs[0];
        const d: any = firstDoc.data() || {};
        const galleryArr = Array.isArray(d.gallery) ? d.gallery : [];
        const coverImage = String(d.image || galleryArr[0] || "").trim();
        resolved = {
          id: String(d.id || firstDoc.id || cleanId),
          nameEn: String(d.nameEn || d.nameBn || "Luxora Curated Edition").trim(),
          nameBn: String(d.nameBn || "").trim(),
          taglineEn: String(d.taglineEn || "").trim(),
          descriptionEn: String(d.descriptionEn || "").trim(),
          price: Number(d.price) || 0,
          originalPrice: Number(d.originalPrice) || 0,
          image: coverImage,
        };
        break;
      }
    } catch {
      // Try next collection
    }
  }

  ogProductCache.set(cleanId, {
    data: resolved,
    expiresAt: Date.now() + (resolved ? 60_000 : 10_000),
  });
  return resolved;
}

function stripMetaTag(html: string, attrName: "property" | "name", attrVal: string): string {
  const escaped = attrVal.replace(/[:.]/g, "\\$&");
  const regex = new RegExp(`<meta\\b[^>]*\\b${attrName}=["']${escaped}["'][^>]*>\\s*`, "gi");
  return html.replace(regex, "");
}

function replaceOrInsertMeta(html: string, attrName: "property" | "name", attrVal: string, content: string): string {
  const cleaned = stripMetaTag(html, attrName, attrVal);
  const tag = `<meta ${attrName}="${attrVal}" content="${escapeHtmlAttr(content)}" />`;
  return cleaned.replace("</head>", `  ${tag}\n  </head>`);
}

function injectProductOpenGraphIntoHtml(
  html: string,
  product: OgProductRecord | null,
  req: express.Request
): string {
  if (!product) return html;

  const origin = getRequestPublicOrigin(req);
  const canonicalUrl = origin
    ? `${origin}/product/${encodeURIComponent(product.id)}`
    : `/product/${encodeURIComponent(product.id)}`;

  const formattedPrice = product.price > 0 ? `৳${product.price.toLocaleString("en-IN")}` : "";
  const ogTitle = formattedPrice
    ? `${product.nameEn} — ${formattedPrice} | Luxora BD`
    : `${product.nameEn} | Luxora BD`;
  const msrpPart =
    product.originalPrice > product.price
      ? ` (MSRP ৳${product.originalPrice.toLocaleString("en-IN")})`
      : "";
  const bodySnippet = (
    product.taglineEn ||
    product.descriptionEn ||
    "100% Authentic Luxury Collection — Cash on Delivery across Bangladesh."
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 145);
  const ogDescription = `${formattedPrice ? `${formattedPrice}${msrpPart} · ` : ""}${bodySnippet}`;

  let ogImage = "";
  let ogImageType = "";
  if (product.image) {
    if (/^https?:\/\//i.test(product.image)) {
      ogImage = product.image;
    } else if (product.image.startsWith("data:image/")) {
      const mimeMatch = product.image.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/i);
      ogImageType = mimeMatch?.[1]?.toLowerCase() || "image/webp";
      ogImage = origin
        ? `${origin}/api/og-image/${encodeURIComponent(product.id)}`
        : `/api/og-image/${encodeURIComponent(product.id)}`;
    } else if (product.image.startsWith("/")) {
      ogImage = origin ? `${origin}${product.image}` : product.image;
    }
  }

  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlAttr(ogTitle)}</title>`);
  out = replaceOrInsertMeta(out, "name", "description", ogDescription);
  out = replaceOrInsertMeta(out, "property", "og:type", "product");
  out = replaceOrInsertMeta(out, "property", "og:site_name", "Luxora BD");
  out = replaceOrInsertMeta(out, "property", "og:title", ogTitle);
  out = replaceOrInsertMeta(out, "property", "og:description", ogDescription);
  out = replaceOrInsertMeta(out, "property", "og:url", canonicalUrl);

  if (ogImage) {
    out = replaceOrInsertMeta(out, "property", "og:image", ogImage);
    out = replaceOrInsertMeta(out, "property", "og:image:alt", product.nameEn);
    if (ogImageType) {
      out = replaceOrInsertMeta(out, "property", "og:image:type", ogImageType);
    }
    out = replaceOrInsertMeta(out, "name", "twitter:image", ogImage);
  } else {
    out = stripMetaTag(out, "property", "og:image");
    out = stripMetaTag(out, "property", "og:image:type");
    out = stripMetaTag(out, "property", "og:image:alt");
    out = stripMetaTag(out, "name", "twitter:image");
  }

  if (product.price > 0) {
    out = replaceOrInsertMeta(out, "property", "product:price:amount", String(product.price));
    out = replaceOrInsertMeta(out, "property", "product:price:currency", "BDT");
  }
  out = replaceOrInsertMeta(out, "name", "twitter:card", "summary_large_image");
  out = replaceOrInsertMeta(out, "name", "twitter:title", ogTitle);
  out = replaceOrInsertMeta(out, "name", "twitter:description", ogDescription);
  return out;
}

const app = express();
const PORT = 3000;

app.use(
  express.json({
    limit: "15mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

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
8. Hotline, Email & Business Info:
   - Phone / Hotline: 01871693050
   - WhatsApp Support: 01871693050
   - Email: mdisrafilh320@gmail.com
   - Address: Bhola Sadar, Bhola, বাংলাদেশ
   - Working Hours: Every day: 10:00 AM - 10:00 PM

Keep your replies concise, well-formatted with markdown/bullet points when appropriate, and always focus on solving the customer's request gracefully.`;

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve actual binary product cover image for social crawlers (Facebook, WhatsApp, Messenger)
// Converts stored data:image/*;base64 payloads into standard HTTP image responses
app.get("/api/og-image/:productId", async (req, res) => {
  try {
    const rawId = decodeURIComponent(String(req.params.productId || "")).trim();
    if (!rawId) {
      res.status(404).end();
      return;
    }

    const product = await fetchProductForOpenGraph(rawId);
    if (!product || !product.image) {
      res.status(404).end();
      return;
    }

    if (/^https?:\/\//i.test(product.image)) {
      res.redirect(302, product.image);
      return;
    }

    const dataUriMatch = product.image.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/i);
    if (dataUriMatch) {
      const mimeType = dataUriMatch[1].toLowerCase();
      const buffer = Buffer.from(dataUriMatch[2], "base64");
      res
        .status(200)
        .set({
          "Content-Type": mimeType,
          "Content-Length": String(buffer.length),
          "Cache-Control": "public, max-age=3600",
        })
        .send(buffer);
      return;
    }

    res.status(404).end();
  } catch (err) {
    console.warn("OG image endpoint error:", err);
    res.status(404).end();
  }
});

// Gemini AI Chat Proxy Endpoint (Website Live Chat -> Unified Inbox Bridge)
app.post("/api/ai/chat", async (req, res) => {
  try {
    const {
      message,
      history = [],
      language = "en",
      sessionId,
      visitorName,
      visitorPhone,
      syncToInbox = true,
    } = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "A message string is required." });
      return;
    }

    let replyText = "";
    let providerUsed = "luxora-concierge-knowledgebase";

    // Build live trained catalog & rules context for accurate Website Live Chat answers
    const liveCatalog = await fetchAllLiveProductsForSalesAI().catch(() => []);
    const matchedWebProducts = searchProductsFuzzyServer(message, liveCatalog, 3);
    const trainingRules = runtimeAiTrainingConfig?.businessRules
      ? `\n\nActive Store Training Rules:\n${runtimeAiTrainingConfig.businessRules}`
      : "";
    const faqContext =
      runtimeAiTrainingConfig?.faqs?.length > 0
        ? `\n\nTrained Store FAQs:\n${runtimeAiTrainingConfig.faqs
            .slice(0, 8)
            .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
            .join("\n")}`
        : "";
    const catalogContext =
      liveCatalog.length > 0
        ? `\n\nLive Catalog Snapshot (Top matches & pricing in BDT):\n${JSON.stringify(
            (matchedWebProducts.length > 0 ? matchedWebProducts : liveCatalog.slice(0, 8)).map((p) => ({
              id: p.id,
              nameEn: p.nameEn,
              priceBDT: p.price,
              inStock: p.inStock,
              stockCount: p.stockCount,
              freeDelivery: p.freeDelivery || false,
            }))
          )}`
        : "";

    if (aiClient) {
      try {
        const formattedHistory = Array.isArray(history)
          ? history
              .filter(
                (turn: any) =>
                  turn &&
                  (turn.role === "user" || turn.role === "model" || turn.role === "assistant") &&
                  typeof turn.content === "string" &&
                  turn.content.trim().length > 0
              )
              .slice(-10)
              .map((turn: any) => ({
                role: turn.role === "assistant" ? "model" : (turn.role as "user" | "model"),
                parts: [{ text: turn.content.trim() }],
              }))
          : [];

        const chat = aiClient.chats.create({
          model: "gemini-4-hydrogen",
          history: formattedHistory,
          config: {
            systemInstruction:
              SYSTEM_INSTRUCTION +
              `\nLanguage Support: Understand & reply naturally in Bengali (বাংলা), English, or Banglish (Romanized Bengali) matching the user's style. Preferred UI language: ${language === "bn" ? "Bengali (বাংলা)" : "English"}.` +
              trainingRules +
              faqContext +
              catalogContext,
          },
        });

        const response = await chat.sendMessage({ message });
        replyText = (response.text || "").trim();
        providerUsed = "gemini-4-hydrogen";
      } catch (aiErr) {
        console.warn("Gemini chat fallback triggered:", aiErr);
      }
    }

    if (!replyText) {
      replyText = generateConciergeFallback(message, language);
    }

    // Bridge website live chat conversation into the Omnichannel Unified Sales Inbox (`channel: 'web'`)
    if (syncToInbox && sessionId) {
      const escalationCheck = detectComplaintEscalationServer(message);
      enqueueWebhookEvent({
        queueId: `web-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        channel: "web",
        entryType: "web_chat",
        customerId: String(sessionId),
        customerName: String(visitorName || `Web Visitor ${String(sessionId).slice(-4)}`),
        customerPhone: visitorPhone ? String(visitorPhone) : undefined,
        text: message.trim(),
        aiAutoReply: replyText,
        aiMatchedProductIds: matchedWebProducts.map((p) => p.id),
        aiDetectedLanguage: /[\u0980-\u09FF]/.test(message) ? "bn" : language === "bn" ? "bn" : "en",
        requiresEscalation: escalationCheck.requiresEscalation,
        escalationReason: escalationCheck.reason,
        escalationPriority: escalationCheck.priority,
        dispatchStatus: "sent_live: Website Live Chat Concierge",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      reply: replyText,
      provider: providerUsed,
      matchedProductIds: matchedWebProducts.map((p) => p.id),
    });
  } catch (error: any) {
    console.error("Gemini API Error in /api/ai/chat:", error);
    const fallbackResponse = generateConciergeFallback(req.body?.message || "", req.body?.language || "en");
    res.json({
      success: true,
      reply: fallbackResponse,
      provider: "fallback-recovery",
    });
  }
});

// AI-Powered Product Auto-Fill & Spec Formatter Endpoint
app.post("/api/ai/format-product", async (req, res) => {
  try {
    const { rawNotes, categories = [], language = "en" } = req.body || {};

    if (!rawNotes || typeof rawNotes !== "string" || !rawNotes.trim()) {
      res.status(400).json({ error: "Please paste raw product notes or specs first." });
      return;
    }

    const availableCategories = Array.isArray(categories)
      ? categories
          .filter((c: any) => c && typeof c.slug === "string")
          .map((c: any) => ({
            slug: String(c.slug),
            nameEn: String(c.nameEn || c.slug),
            nameBn: String(c.nameBn || c.nameEn || c.slug),
          }))
      : [];

    if (aiClient) {
      try {
        const categorySummary = availableCategories.length > 0
          ? availableCategories.map((c) => `- slug: "${c.slug}" (EN: ${c.nameEn}, BN: ${c.nameBn})`).join("\n")
          : `- slug: "gadgets" (EN: Gadgets, BN: গ্যাজেট)\n- slug: "audio" (EN: Audio, BN: অডিও)\n- slug: "wearables" (EN: Wearables, BN: স্মার্টওয়াচ)\n- slug: "fashion" (EN: Fashion, BN: ফ্যাশন)\n- slug: "luxury" (EN: Luxury, BN: লাক্সারি)`;

        const prompt = `Transform the following raw product notes/specifications into a polished, luxury e-commerce catalog entry for Luxora BD (Bangladesh).

Available Store Categories (pick the SINGLE best matching slug for suggestedCategory):
${categorySummary}

Raw Product Notes / Specs:
"""
${rawNotes.trim()}
"""

Requirements:
1. Format clean, attractive English and Bengali product titles (nameEn, nameBn) and short taglines (taglineEn, taglineBn).
2. Identify the Brand name.
3. Choose the best matching category slug from the Available Store Categories list above.
4. Parse technical features/specs into 4-8 clean structured specification key-value items (specs array with labelEn, labelBn, valueEn, valueBn).
5. Write a persuasive, professional luxury product description in English (descriptionEn) and Bengali (descriptionBn), each opening with a 2-sentence overview followed by concise "• " bullet-point highlights.
6. Extract price, originalPrice, stockCount, warrantyEn, and freeDelivery if mentioned in the notes (use 0 for prices/stock if not mentioned).`;

        const response = await aiClient.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: prompt,
          config: {
            systemInstruction:
              "You are a senior e-commerce merchandiser and bilingual copywriter for Luxora BD, a minimalist luxury store in Bangladesh. Output strictly valid JSON matching the requested schema.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                nameEn: { type: Type.STRING, description: "Polished English product title" },
                nameBn: { type: Type.STRING, description: "Polished Bengali product title" },
                taglineEn: { type: Type.STRING, description: "Short English tagline (4-8 words)" },
                taglineBn: { type: Type.STRING, description: "Short Bengali tagline" },
                brand: { type: Type.STRING, description: "Product brand name" },
                suggestedCategory: { type: Type.STRING, description: "Exact slug from available categories" },
                descriptionEn: { type: Type.STRING, description: "Professional English description with bullet points" },
                descriptionBn: { type: Type.STRING, description: "Professional Bengali description with bullet points" },
                specs: {
                  type: Type.ARRAY,
                  description: "Key technical specs parsed as label/value pairs",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      labelEn: { type: Type.STRING },
                      labelBn: { type: Type.STRING },
                      valueEn: { type: Type.STRING },
                      valueBn: { type: Type.STRING },
                    },
                  },
                },
                suggestedPrice: { type: Type.NUMBER, description: "Selling price in BDT if present, else 0" },
                suggestedOriginalPrice: { type: Type.NUMBER, description: "Original MSRP in BDT if present, else 0" },
                suggestedStockCount: { type: Type.NUMBER, description: "Stock count if present, else 0" },
                freeDelivery: { type: Type.BOOLEAN, description: "True if notes mention free delivery" },
                warrantyEn: { type: Type.STRING, description: "Warranty text if mentioned or standard Luxora warranty" },
                suggestedBadge: { type: Type.STRING, description: "One of: new, bestseller, limited" },
              },
            },
          },
        });

        const jsonText = (response.text || "").trim();
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          res.json({
            success: true,
            provider: "gemini-4-hydrogen",
            data: parsed,
          });
          return;
        }
      } catch (aiErr: any) {
        console.warn("Gemini product formatting fallback triggered:", aiErr?.message || aiErr);
      }
    }

    // Deterministic smart spec parser fallback if Gemini API key is missing or temporarily unavailable
    const fallbackData = parseRawProductNotesFallback(rawNotes, availableCategories, language);
    res.json({
      success: true,
      provider: "smart-spec-parser",
      data: fallbackData,
    });
  } catch (error: any) {
    console.error("Error in /api/ai/format-product:", error);
    res.status(500).json({ error: error?.message || "Failed to format product notes." });
  }
});

// ============================================================================
// ADMIN-ONLY AI SALES COPILOT (GEMINI VISION + PSYCHOLOGICAL CLOSER) & OMNICHANNEL WEBHOOKS
// ============================================================================

interface SalesCatalogProduct {
  id: string;
  nameEn: string;
  nameBn: string;
  taglineEn: string;
  taglineBn: string;
  brand: string;
  category: string;
  price: number;
  originalPrice: number;
  inStock: boolean;
  stockCount: number;
  image: string;
  sku?: string;
  freeDelivery?: boolean;
  warrantyEn?: string;
  descriptionEn?: string;
}

let salesCatalogCache: { items: SalesCatalogProduct[]; expiresAt: number } | null = null;

type StandardAdminRole = "super_admin" | "admin" | "staff";

function isActiveAdminDoc(data: any): { ok: boolean; role: StandardAdminRole } {
  if (!data || data.active === false) {
    return { ok: false, role: "staff" };
  }
  const rawRole = String(data.role || "").toLowerCase().trim();
  if (rawRole === "super_admin") {
    return { ok: true, role: "super_admin" };
  }
  if (rawRole === "admin" || rawRole === "supervisor") {
    return { ok: true, role: "admin" };
  }
  if (rawRole === "staff") {
    return { ok: true, role: "staff" };
  }
  if (data.isAdmin === true) {
    return { ok: true, role: "admin" };
  }
  return { ok: false, role: "staff" };
}

async function verifyAdminBearerToken(
  req: express.Request
): Promise<
  | { ok: true; uid: string; email: string; role: StandardAdminRole }
  | { ok: false; status: number; error: string }
> {
  const authHeader = String(req.headers.authorization || "");
  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Unauthorized: Missing Bearer token." };
  }
  const idToken = authHeader.slice(7).trim();
  if (!idToken) {
    return { ok: false, status: 401, error: "Unauthorized: Empty token." };
  }
  if (!firebaseApiKey) {
    return { ok: false, status: 500, error: "Server Firebase configuration missing." };
  }

  try {
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!lookupRes.ok) {
      return { ok: false, status: 401, error: "Invalid or expired Firebase session token." };
    }
    const lookupData: any = await lookupRes.json();
    const fbUser = lookupData?.users?.[0];
    if (!fbUser || !fbUser.localId) {
      return { ok: false, status: 401, error: "User record not found for token." };
    }

    const uid = String(fbUser.localId);
    const email = String(fbUser.email || "").toLowerCase().trim();
    const emailVerified = Boolean(fbUser.emailVerified);

    if (email === PRIMARY_SUPER_ADMIN_EMAIL && emailVerified) {
      return { ok: true, uid, email, role: "super_admin" };
    }

    if (serverDb) {
      if (email && emailVerified) {
        const emailSnap = await getDoc(doc(serverDb, "admins", email));
        if (emailSnap.exists()) {
          const parsed = isActiveAdminDoc(emailSnap.data());
          if (parsed.ok) {
            return { ok: true, uid, email, role: parsed.role };
          }
          return { ok: false, status: 403, error: "Forbidden: Admin account is suspended." };
        }
      }

      const uidSnap = await getDoc(doc(serverDb, "admins", uid));
      if (uidSnap.exists()) {
        const parsed = isActiveAdminDoc(uidSnap.data());
        if (parsed.ok) {
          return { ok: true, uid, email, role: parsed.role };
        }
        return { ok: false, status: 403, error: "Forbidden: Admin account is suspended." };
      }

      const userSnap = await getDoc(doc(serverDb, "users", uid));
      if (userSnap.exists()) {
        const parsed = isActiveAdminDoc(userSnap.data());
        if (parsed.ok) {
          return { ok: true, uid, email, role: parsed.role };
        }
      }
    }

    return { ok: false, status: 403, error: "Forbidden: Admin privileges required." };
  } catch (err: any) {
    console.warn("Admin token verification error:", err?.message || err);
    return { ok: false, status: 401, error: "Failed to verify credentials." };
  }
}

async function fetchAllLiveProductsForSalesAI(fallbackItems?: any[]): Promise<SalesCatalogProduct[]> {
  if (salesCatalogCache && salesCatalogCache.expiresAt > Date.now() && salesCatalogCache.items.length > 0) {
    return salesCatalogCache.items;
  }

  const merged = new Map<string, SalesCatalogProduct>();
  if (serverDb) {
    for (const col of ["products", "luxora-products"]) {
      try {
        const snap = await Promise.race([
          getDocs(collection(serverDb, col)),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Catalog fetch timeout")), 4500)),
        ]);
        snap.forEach((docSnap) => {
          const d: any = docSnap.data() || {};
          const id = String(d.id || docSnap.id).trim();
          if (!id || merged.has(id)) return;
          const galleryArr = Array.isArray(d.gallery) ? d.gallery : [];
          merged.set(id, {
            id,
            nameEn: String(d.nameEn || d.nameBn || "Luxora Edition").trim(),
            nameBn: String(d.nameBn || d.nameEn || "").trim(),
            taglineEn: String(d.taglineEn || "").trim(),
            taglineBn: String(d.taglineBn || "").trim(),
            brand: String(d.brand || "Luxora Prime").trim(),
            category: String(d.category || "gadgets").trim(),
            price: Number(d.price) || 0,
            originalPrice: Number(d.originalPrice) || 0,
            inStock: d.inStock !== false && (Number(d.stockCount ?? 10) > 0),
            stockCount: Number(d.stockCount ?? 10),
            image: String(d.image || galleryArr[0] || "").trim(),
            sku: d.sku ? String(d.sku) : undefined,
            freeDelivery: Boolean(d.freeDelivery),
            warrantyEn: d.warrantyEn ? String(d.warrantyEn) : undefined,
            descriptionEn: String(d.descriptionEn || "").slice(0, 220),
          });
        });
      } catch {
        // try next collection
      }
    }
  }

  if (merged.size === 0 && Array.isArray(fallbackItems)) {
    for (const d of fallbackItems) {
      if (!d || !d.id) continue;
      merged.set(String(d.id), {
        id: String(d.id),
        nameEn: String(d.nameEn || d.nameBn || "Luxora Edition").trim(),
        nameBn: String(d.nameBn || d.nameEn || "").trim(),
        taglineEn: String(d.taglineEn || "").trim(),
        taglineBn: String(d.taglineBn || "").trim(),
        brand: String(d.brand || "Luxora Prime").trim(),
        category: String(d.category || "gadgets").trim(),
        price: Number(d.price) || 0,
        originalPrice: Number(d.originalPrice) || 0,
        inStock: d.inStock !== false && (Number(d.stockCount ?? 10) > 0),
        stockCount: Number(d.stockCount ?? 10),
        image: String(d.image || "").trim(),
        sku: d.sku ? String(d.sku) : undefined,
        freeDelivery: Boolean(d.freeDelivery),
        warrantyEn: d.warrantyEn ? String(d.warrantyEn) : undefined,
      });
    }
  }

  // Merge trained external catalog entries (CSV, Facebook, Shopify, WooCommerce)
  if (Array.isArray(runtimeAiTrainingConfig?.externalCatalog)) {
    for (const ext of runtimeAiTrainingConfig.externalCatalog) {
      if (!ext || !ext.id || merged.has(ext.id)) continue;
      merged.set(ext.id, {
        id: ext.id,
        nameEn: ext.nameEn,
        nameBn: ext.nameBn || ext.nameEn,
        taglineEn: `${ext.source.toUpperCase()} Synced Item`,
        taglineBn: `${ext.source.toUpperCase()} সিঙ্কড পণ্য`,
        brand: ext.brand || "Luxora Curated",
        category: ext.category || "gadgets",
        price: Number(ext.price) || 0,
        originalPrice: Number(ext.originalPrice) || 0,
        inStock: ext.inStock !== false && (Number(ext.stockCount ?? 10) > 0),
        stockCount: Number(ext.stockCount ?? 10),
        image: ext.image || "",
        sku: ext.sku,
        freeDelivery: Boolean(ext.freeDelivery),
      });
    }
  }

  const items = Array.from(merged.values());
  if (items.length > 0) {
    salesCatalogCache = { items, expiresAt: Date.now() + 45_000 };
  }
  return items;
}

function getBigrams(str: string): string[] {
  const s = str.toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]/g, "");
  if (s.length < 2) return s ? [s] : [];
  const res: string[] = [];
  for (let i = 0; i < s.length - 1; i++) {
    res.push(s.slice(i, i + 2));
  }
  return res;
}

function diceSimilarity(a: string, b: string): number {
  const bgA = getBigrams(a);
  const bgB = getBigrams(b);
  if (!bgA.length || !bgB.length) return 0;
  const setB = new Map<string, number>();
  for (const bg of bgB) setB.set(bg, (setB.get(bg) || 0) + 1);
  let overlap = 0;
  for (const bg of bgA) {
    const c = setB.get(bg) || 0;
    if (c > 0) {
      overlap++;
      setB.set(bg, c - 1);
    }
  }
  return (2 * overlap) / (bgA.length + bgB.length);
}

function searchProductsFuzzyServer(queryText: string, catalog: SalesCatalogProduct[], limit = 4): SalesCatalogProduct[] {
  const raw = String(queryText || "").trim().toLowerCase();
  if (!raw || catalog.length === 0) return [];

  const stopWords = new Set([
    "price", "koto", "dam", "available", "ase", "ache", "naki", "bhai", "vai", "vaiya",
    "sir", "apni", "apnara", "hello", "hi", "assalamu", "alaikum", "need", "want",
    "details", "pic", "photo", "image", "discount", "kom", "kora", "jabe", "fixed",
    "order", "korbo", "chai", "please", "pls", "the", "this", "that", "for", "with",
    "দাম", "কত", "আছে", "নাকি", "ভাই", "অর্ডার", "করব", "চাই", "কম", "হবে", "ছবি",
  ]);

  const rawTokens = raw
    .split(/[\s,.;:!?/\\|()\[\]{}"']+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !stopWords.has(t));

  const queryNormAlpha = raw.replace(/[^a-z0-9]/g, "");

  const scored = catalog.map((prod) => {
    const combined = `${prod.nameEn} ${prod.nameBn} ${prod.brand} ${prod.category} ${prod.taglineEn} ${prod.sku || ""} ${prod.id}`.toLowerCase();
    const normCombined = combined.replace(/[^a-z0-9]/g, "");
    const titleWords = `${prod.nameEn} ${prod.brand} ${prod.category} ${prod.sku || ""}`
      .toLowerCase()
      .split(/[\s\-_/]+/)
      .filter((w) => w.length >= 2);

    let score = 0;

    if (queryNormAlpha.length >= 3 && normCombined.includes(queryNormAlpha)) {
      score += 45;
    }

    for (const token of rawTokens) {
      const tokenNorm = token.replace(/[^a-z0-9]/g, "");
      if (combined.includes(token)) {
        score += token.length >= 4 ? 26 : 18;
      } else if (tokenNorm.length >= 2 && normCombined.includes(tokenNorm)) {
        score += 24;
      } else {
        // Fuzzy typo tolerance against product title tokens
        let bestWordSim = 0;
        for (const w of titleWords) {
          const sim = diceSimilarity(token, w);
          if (sim > bestWordSim) bestWordSim = sim;
        }
        if (bestWordSim >= 0.62) {
          score += Math.round(bestWordSim * 22);
        }
      }
    }

    if (score > 0 && prod.inStock) {
      score += 3;
    }

    return { prod, score };
  });

  return scored
    .filter((x) => x.score >= 12)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.prod);
}

async function resolveImageInlineData(
  imageInput?: string
): Promise<{ mimeType: string; data: string } | null> {
  if (!imageInput || typeof imageInput !== "string") return null;
  const trimmed = imageInput.trim();
  if (!trimmed) return null;

  const dataMatch = trimmed.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/i);
  if (dataMatch) {
    return {
      mimeType: dataMatch[1].toLowerCase(),
      data: dataMatch[2],
    };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(trimmed, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const contentType = String(res.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
      if (!contentType.startsWith("image/")) return null;
      const arrayBuf = await res.arrayBuffer();
      if (arrayBuf.byteLength > 8 * 1024 * 1024) return null;
      return {
        mimeType: contentType,
        data: Buffer.from(arrayBuf).toString("base64"),
      };
    } catch {
      return null;
    }
  }

  return null;
}

function buildSalesCopilotFallback(params: {
  customerMessage: string;
  matchedProducts: SalesCatalogProduct[];
  detectedLanguage: "en" | "bn";
  tacticOverride?: string;
  hasImage: boolean;
}) {
  const { customerMessage, matchedProducts, detectedLanguage, tacticOverride, hasImage } = params;
  const top = matchedProducts[0];
  const isBangla = detectedLanguage === "bn";
  const lower = customerMessage.toLowerCase();
  const isAskingDiscount =
    tacticOverride === "fixed_price_urgency" ||
    /discount|kom|less|last price|dam kom|bargain|কমান|কম হবে|ডিসকাউন্ট|ফিক্সড/.test(lower);
  const isHesitant =
    tacticOverride === "handle_objection" ||
    /original|fake|trust|warranty|problem|return|guarantee|অরিজিনাল|ভালো হবে|রিটার্ন|ওয়ারেন্টি/.test(lower);

  if (top) {
    const priceFmt = `৳${top.price.toLocaleString("en-IN")}`;
    const msrpPartBn =
      top.originalPrice > top.price
        ? ` (রেগুলার প্রাইস ৳${top.originalPrice.toLocaleString("en-IN")} থেকে অফারে পাচ্ছেন)`
        : "";
    const msrpPartEn =
      top.originalPrice > top.price
        ? ` (Promotional rate down from MSRP ৳${top.originalPrice.toLocaleString("en-IN")})`
        : "";
    const stockUrgencyBn =
      top.inStock && top.stockCount <= 8
        ? `বর্তমানে ভল্টে মাত্র **${top.stockCount} পিস** স্টকে রয়েছে`
        : top.inStock
          ? `বর্তমানে লিমিটেড ব্যাচ স্টকে আছে`
          : `এই মুহূর্তে স্টক প্রায় শেষ পর্যায়ে`;
    const stockUrgencyEn =
      top.inStock && top.stockCount <= 8
        ? `Only **${top.stockCount} units** remain in our vault`
        : top.inStock
          ? `Currently available from our limited batch`
          : `This batch is currently sold out`;

    if (isBangla) {
      let opener = `আসসালামু আলাইকুম! Luxora BD-তে স্বাগতম। আপনার পছন্দের **${top.nameEn}** এখন মাত্র **${priceFmt}**${msrpPartBn}।`;
      if (isAskingDiscount) {
        opener = `আসসালামু আলাইকুম স্যার! আমাদের প্রতিটি পণ্যের দাম অফিশিয়ালি **ফিক্সড (${priceFmt})**${msrpPartBn}, কারণ আমরা প্রিমিয়াম কোয়ালিটির সাথে সেরা প্রোমোশনাল প্রাইসটাই দিয়ে থাকি। এই স্পেশাল অফার প্রাইসটি যেকোনো সময় রেগুলার দামে ফিরে যেতে পারে — আর ${stockUrgencyBn}!`;
      } else if (isHesitant) {
        opener = `আসসালামু আলাইকুম! একদম নিশ্চিন্ত থাকতে পারেন — আমাদের **${top.nameEn}** ১০০% অরিজিনাল সিল্ড প্যাক এবং পাচ্ছেন **৭ দিনের ইনস্ট্যান্ট রিপ্লেসমেন্ট ওয়ারেন্টি**। ডেলিভারির সময় ডেলিভারি ম্যানের সামনে প্রোডাক্ট দেখে ও চেক করে টাকা পরিশোধের সুবিধা রয়েছে (Price Fixed: **${priceFmt}**)।`;
      }
      const replyBn = `${opener}\n\n✅ ক্যাশ অন ডেলিভারি (চেক করে পেমেন্ট)\n🚚 ঢাকা ৳৭০ | সারাদেশ ৳১২০ (৳৫,০০০+ অর্ডারে ফ্রি ডেলিভারি)\n\nআজকের স্লটে প্রোডাক্টটি রিজার্ভ করতে আপনার **নাম, মোবাইল নম্বর এবং পূর্ণ ডেলিভারি ঠিকানা** দিন — আমি এখনই কনফার্ম করে দিচ্ছি!`;
      return {
        salesReply: replyBn,
        salesReplyAlternate: `Hello! The **${top.nameEn}** is **${priceFmt}**${msrpPartEn} (Fixed Promotional Price). ${stockUrgencyEn} — includes 100% authentic inspection on Cash on Delivery + 7-day replacement guarantee. Share your **Name, Phone & Full Address** to lock your unit today!`,
        urgencyAngle: `${stockUrgencyEn} at promotional ${priceFmt}`,
        customerIntent: isAskingDiscount ? "Price Inquiry & Negotiation" : isHesitant ? "Trust & Warranty Assurance" : "Product Inquiry",
        visualAnalysis: hasImage ? `Matched visually/contextually with ${top.nameEn}` : "",
      };
    }

    let openerEn = `Assalamu Alaikum! Thank you for reaching out to Luxora BD. The **${top.nameEn}** is available right now at **${priceFmt}**${msrpPartEn}.`;
    if (isAskingDiscount) {
      openerEn = `Assalamu Alaikum! At Luxora BD, our pricing is strictly **fixed at ${priceFmt}**${msrpPartEn} because we already apply our lowest promotional margin upfront. ${stockUrgencyEn}, and this offer rate may revert shortly!`;
    } else if (isHesitant) {
      openerEn = `Assalamu Alaikum! You can order with 100% peace of mind — our **${top.nameEn}** (**${priceFmt}**) arrives factory-sealed with a **7-Day Instant Replacement Warranty** and full doorstep inspection before Cash on Delivery payment.`;
    }
    const replyEn = `${openerEn}\n\n✅ 100% Cash on Delivery (Inspect before paying)\n🚚 Express Delivery: Dhaka ৳70 | Nationwide ৳120 (Free over ৳5,000)\n\nSend me your **Name, Mobile Number, and Full Delivery Address** now and I will reserve your unit for today's dispatch!`;
    return {
      salesReply: replyEn,
      salesReplyAlternate: `আসসালামু আলাইকুম! **${top.nameEn}** এখন প্রোমোশনাল ফিক্সড প্রাইস **${priceFmt}**${msrpPartBn}-এ পাচ্ছেন। ${stockUrgencyBn}! অর্ডার কনফার্ম করতে আপনার নাম, ফোন নম্বর ও ঠিকানা দিন।`,
      urgencyAngle: `${stockUrgencyEn} at ${priceFmt}`,
      customerIntent: isAskingDiscount ? "Price Negotiation" : isHesitant ? "Warranty & Authenticity Doubt" : "Purchase Inquiry",
      visualAnalysis: hasImage ? `Matched against catalog item ${top.nameEn}` : "",
    };
  }

  const genericBn = `আসসালামু আলাইকুম! Luxora BD-তে আপনাকে স্বাগতম। আপনি কোন প্রোডাক্টটির ছবি বা মডেল খুঁজছেন দয়া করে নাম বা আরেকটি পরিষ্কার ছবি শেয়ার করলে আমি সাথে সাথে লাইভ স্টক ও সেরা প্রোমোশনাল প্রাইস জানিয়ে অর্ডার কনফার্ম করে দেব!`;
  const genericEn = `Assalamu Alaikum! Welcome to Luxora BD. Could you share the product name or model code you are looking for? I will check live vault stock immediately and reserve your unit with doorstep Cash on Delivery.`;
  return {
    salesReply: isBangla ? genericBn : genericEn,
    salesReplyAlternate: isBangla ? genericEn : genericBn,
    urgencyAngle: "Fast dispatch cutoff & limited daily vault allocation",
    customerIntent: "General Product Inquiry",
    visualAnalysis: hasImage ? "Image inspected; asking customer for clearer angle or model hint." : "",
  };
}

type SocialChannelType = "messenger" | "whatsapp" | "instagram" | "tiktok" | "web";

interface ServerChannelCredentials {
  id: SocialChannelType;
  label: string;
  handleOrNumber: string;
  pageOrBusinessId: string;
  wabaId: string;
  instagramBusinessId: string;
  accessToken: string;
  appKey: string;
  appSecret: string;
  verifyToken: string;
  connected: boolean;
  autoAiDraft: boolean;
  lastWebhookAt?: string;
  lastDispatchStatus?: string;
  updatedAt: string;
}

interface ServerExternalCatalogItem {
  id: string;
  nameEn: string;
  nameBn?: string;
  brand: string;
  category: string;
  price: number;
  originalPrice?: number;
  stockCount: number;
  inStock: boolean;
  image?: string;
  sku?: string;
  freeDelivery?: boolean;
  source: "csv" | "facebook" | "shopify" | "woocommerce";
  updatedAt: string;
}

interface ServerAiTrainingConfig {
  storePersona: string;
  businessRules: string;
  deliveryPolicyText: string;
  fixedPricePolicy: string;
  defaultAiMode: "auto_pilot" | "review_mode" | "human_takeover";
  autoDetectBanglish: boolean;
  autoCreateOrderFromChat: boolean;
  autoEscalateComplaints: boolean;
  faqs: Array<{ id: string; question: string; answer: string }>;
  externalCatalog: ServerExternalCatalogItem[];
  lastCatalogSyncAt?: string;
  updatedAt: string;
}

interface ServerLogisticsConfig {
  steadfastApiKey: string;
  steadfastSecretKey: string;
  pathaoClientId: string;
  pathaoClientSecret: string;
  pathaoStoreId: string;
  pathaoAccessToken: string;
  googleSheetsWebhookUrl: string;
  googleSheetName: string;
  autoPushOrdersToSheets: boolean;
  shopifyStoreUrl: string;
  shopifyWebhookSecret: string;
  wooCommerceStoreUrl: string;
  wooCommerceConsumerKey: string;
  updatedAt: string;
}

const OMNICHANNEL_RUNTIME_PATH = path.join(os.tmpdir(), "luxora-omnichannel-runtime.json");
const AI_TRAINING_RUNTIME_PATH = path.join(os.tmpdir(), "luxora-ai-training.json");
const LOGISTICS_RUNTIME_PATH = path.join(os.tmpdir(), "luxora-logistics-sheets.json");

function createDefaultAiTrainingConfig(): ServerAiTrainingConfig {
  return {
    storePersona:
      "Luxora BD Elite Sales & Concierge — polite Bangladeshi hospitality, trustworthy, crisp product specs, fluent in Bengali, English, and Banglish.",
    businessRules:
      "Always greet with Assalamu Alaikum. Never offer unauthorized discounts; state fixed promotional pricing with stock scarcity urgency. Offer 100% open-box Cash on Delivery inspection + 7-day instant replacement warranty.",
    deliveryPolicyText:
      "Inside Dhaka Metro: ৳70 (24h). Chattogram City: ৳100 (24-48h). All other 64 districts: ৳120 (48-72h). Free nationwide delivery on orders >= ৳5,000 BDT.",
    fixedPricePolicy:
      "All listed prices are strictly fixed promotional rates. Never cut price arbitrarily; emphasize savings off MSRP and limited vault batch.",
    defaultAiMode: "auto_pilot",
    autoDetectBanglish: true,
    autoCreateOrderFromChat: true,
    autoEscalateComplaints: true,
    faqs: [
      {
        id: "faq-cod",
        question: "Cash on Delivery available?",
        answer: "Yes, 100% Cash on Delivery across all 64 districts with doorstep inspection before paying.",
      },
      {
        id: "faq-warranty",
        question: "Warranty & return policy?",
        answer: "Every product carries a 7-day instant replacement guarantee plus 12-24 months official brand warranty.",
      },
    ],
    externalCatalog: [],
    updatedAt: new Date().toISOString(),
  };
}

let runtimeAiTrainingConfig: ServerAiTrainingConfig = createDefaultAiTrainingConfig();
try {
  if (fs.existsSync(AI_TRAINING_RUNTIME_PATH)) {
    const raw = JSON.parse(fs.readFileSync(AI_TRAINING_RUNTIME_PATH, "utf-8"));
    if (raw && typeof raw === "object") {
      runtimeAiTrainingConfig = { ...runtimeAiTrainingConfig, ...raw };
    }
  }
} catch (err) {
  console.warn("AI training runtime cache notice:", err);
}

function persistAiTrainingConfig() {
  try {
    fs.writeFileSync(AI_TRAINING_RUNTIME_PATH, JSON.stringify(runtimeAiTrainingConfig, null, 2), "utf-8");
    salesCatalogCache = null;
  } catch (err) {
    console.warn("Failed to persist AI training config:", err);
  }
}

let runtimeLogisticsConfig: ServerLogisticsConfig = {
  steadfastApiKey: process.env.STEADFAST_API_KEY || "",
  steadfastSecretKey: process.env.STEADFAST_SECRET_KEY || "",
  pathaoClientId: process.env.PATHAO_CLIENT_ID || "",
  pathaoClientSecret: process.env.PATHAO_CLIENT_SECRET || "",
  pathaoStoreId: process.env.PATHAO_STORE_ID || "",
  pathaoAccessToken: process.env.PATHAO_ACCESS_TOKEN || "",
  googleSheetsWebhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL || "",
  googleSheetName: "Luxora_BD_Orders",
  autoPushOrdersToSheets: false,
  shopifyStoreUrl: "",
  shopifyWebhookSecret: "",
  wooCommerceStoreUrl: "",
  wooCommerceConsumerKey: "",
  updatedAt: new Date().toISOString(),
};
try {
  if (fs.existsSync(LOGISTICS_RUNTIME_PATH)) {
    const raw = JSON.parse(fs.readFileSync(LOGISTICS_RUNTIME_PATH, "utf-8"));
    if (raw && typeof raw === "object") {
      runtimeLogisticsConfig = { ...runtimeLogisticsConfig, ...raw };
    }
  }
} catch (err) {
  console.warn("Logistics runtime cache notice:", err);
}

function persistLogisticsConfig() {
  try {
    fs.writeFileSync(LOGISTICS_RUNTIME_PATH, JSON.stringify(runtimeLogisticsConfig, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to persist logistics config:", err);
  }
}

function createDefaultRuntimeCredentials(): Record<SocialChannelType, ServerChannelCredentials> {
  const defaultVerify = process.env.OMNICHANNEL_VERIFY_TOKEN || "luxora-omnichannel-verify";
  const now = new Date().toISOString();
  return {
    messenger: {
      id: "messenger",
      label: "Facebook Messenger",
      handleOrNumber: "m.me/luxorabd.official",
      pageOrBusinessId: process.env.META_PAGE_ID || "",
      wabaId: "",
      instagramBusinessId: "",
      accessToken: process.env.META_PAGE_ACCESS_TOKEN || "",
      appKey: process.env.META_APP_ID || "",
      appSecret: process.env.META_APP_SECRET || "",
      verifyToken: defaultVerify,
      connected: true,
      autoAiDraft: true,
      updatedAt: now,
    },
    whatsapp: {
      id: "whatsapp",
      label: "WhatsApp Business",
      handleOrNumber: "+880 1871-693050",
      pageOrBusinessId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
      wabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
      instagramBusinessId: "",
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
      appKey: "",
      appSecret: process.env.META_APP_SECRET || "",
      verifyToken: defaultVerify,
      connected: true,
      autoAiDraft: true,
      updatedAt: now,
    },
    instagram: {
      id: "instagram",
      label: "Instagram Direct",
      handleOrNumber: "@luxorabd.luxury",
      pageOrBusinessId: process.env.INSTAGRAM_BUSINESS_ID || "",
      wabaId: "",
      instagramBusinessId: process.env.INSTAGRAM_BUSINESS_ID || "",
      accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN || "",
      appKey: process.env.META_APP_ID || "",
      appSecret: process.env.META_APP_SECRET || "",
      verifyToken: defaultVerify,
      connected: true,
      autoAiDraft: true,
      updatedAt: now,
    },
    tiktok: {
      id: "tiktok",
      label: "TikTok Business DM",
      handleOrNumber: "@luxorabd",
      pageOrBusinessId: process.env.TIKTOK_BUSINESS_ID || "",
      wabaId: "",
      instagramBusinessId: "",
      accessToken: process.env.TIKTOK_ACCESS_TOKEN || "",
      appKey: process.env.TIKTOK_APP_KEY || "",
      appSecret: process.env.TIKTOK_APP_SECRET || "",
      verifyToken: defaultVerify,
      connected: true,
      autoAiDraft: true,
      updatedAt: now,
    },
    web: {
      id: "web",
      label: "Website Live Chat",
      handleOrNumber: "luxorabd.com/concierge",
      pageOrBusinessId: "luxora-web-widget",
      wabaId: "",
      instagramBusinessId: "",
      accessToken: "internal-web-bridge",
      appKey: "",
      appSecret: "",
      verifyToken: defaultVerify,
      connected: true,
      autoAiDraft: true,
      updatedAt: now,
    },
  };
}

let runtimeChannelCredentials: Record<SocialChannelType, ServerChannelCredentials> = createDefaultRuntimeCredentials();

// Rehydrate previously synced credentials from temporary server store if present
try {
  if (fs.existsSync(OMNICHANNEL_RUNTIME_PATH)) {
    const raw = JSON.parse(fs.readFileSync(OMNICHANNEL_RUNTIME_PATH, "utf-8"));
    for (const ch of ["messenger", "whatsapp", "instagram", "tiktok", "web"] as SocialChannelType[]) {
      if (raw && raw[ch]) {
        runtimeChannelCredentials[ch] = {
          ...runtimeChannelCredentials[ch],
          ...raw[ch],
          id: ch,
        };
      }
    }
  }
} catch (err) {
  console.warn("Omnichannel runtime cache notice:", err);
}

function persistRuntimeCredentials() {
  try {
    fs.writeFileSync(OMNICHANNEL_RUNTIME_PATH, JSON.stringify(runtimeChannelCredentials, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to persist runtime channel cache:", err);
  }
}

function getEffectiveVerifyToken(): string {
  for (const ch of ["messenger", "whatsapp", "instagram", "tiktok"] as SocialChannelType[]) {
    const t = String(runtimeChannelCredentials[ch]?.verifyToken || "").trim();
    if (t && t !== "luxora-omnichannel-verify") return t;
  }
  return (
    String(runtimeChannelCredentials.messenger?.verifyToken || "").trim() ||
    process.env.OMNICHANNEL_VERIFY_TOKEN ||
    "luxora-omnichannel-verify"
  );
}

function maskSecret(val?: string): string {
  const s = String(val || "").trim();
  if (!s) return "";
  if (s.length <= 6) return "••••••";
  return `${"•".repeat(Math.min(12, s.length - 4))}${s.slice(-4)}`;
}

// Delivery fee calculator matching Luxora BD's 64-district policy
function calculateBdDeliveryFeeServer(
  districtInput?: string,
  subtotal = 0,
  productFreeDelivery = false
): { district: string; charge: number; freeReason?: string } {
  const district = String(districtInput || "Dhaka").trim() || "Dhaka";
  if (productFreeDelivery) {
    return { district, charge: 0, freeReason: "Free delivery included with this SKU" };
  }
  if (subtotal >= 5000) {
    return { district, charge: 0, freeReason: "Free delivery unlocked (Order >= ৳5,000)" };
  }
  const lower = district.toLowerCase();
  if (/dhaka|ঢাকা|mirpur|uttara|banani|gulshan|dhanmondi|mohammadpur|motijheel|bashundhara/.test(lower)) {
    return { district: "Dhaka", charge: 70 };
  }
  if (/chattogram|chittagong|ctg|চট্টগ্রাম/.test(lower)) {
    return { district: "Chattogram", charge: 100 };
  }
  return { district, charge: 120 };
}

// Detect complex complaints / refund disputes / damaged parcel escalation triggers
function detectComplaintEscalationServer(text: string): {
  requiresEscalation: boolean;
  reason?: string;
  priority: "normal" | "high" | "urgent";
} {
  const lower = String(text || "").toLowerCase();
  const urgentPatterns = [
    /\b(scam|fraud|cheat|fake|broken|damaged|dead|refund|money\s*back|complaint|missing|wrong\s*item|police|consumer\s*court|faltu|baje)\b/i,
    /(ভাঙ্গা|নষ্ট|ভুল\s*প্রোডাক্ট|টাকা\s*ফেরত|রিফান্ড|প্রতারণা|অভিযোগ|ফেইক|নকল)/,
  ];
  if (urgentPatterns.some((re) => re.test(lower))) {
    return {
      requiresEscalation: true,
      reason: "Customer reported product defect, refund dispute, or urgent service complaint",
      priority: "urgent",
    };
  }
  const highPatterns = [
    /\b(late|delay|still not|where is my|cancel|warranty claim|not working)\b/i,
    /(দেরি|এখনো\s*আসেনি|কাজ\s*করছে\s*না|ওয়ারেন্টি\s*ক্লেইম)/,
  ];
  if (highPatterns.some((re) => re.test(lower))) {
    return {
      requiresEscalation: true,
      reason: "Shipping delay or warranty claim requires Supervisor / Fulfillment review",
      priority: "high",
    };
  }
  return { requiresEscalation: false, priority: "normal" };
}

// Extract district & BD phone heuristically from natural conversation text
function extractOrderHeuristicServer(
  text: string,
  historyTexts: string[],
  matchedProducts: SalesCatalogProduct[]
) {
  const combined = [...historyTexts.slice(-4), text].join(" \n ");
  const phoneMatch = combined.match(/(?:\+?88)?(01[3-9]\d{8}|\b01[3-9]\d[\s-]?\d{4}[\s-]?\d{4}\b)/);
  const phone = phoneMatch ? phoneMatch[0].replace(/[^\d]/g, "").slice(-11) : "";

  const districts = [
    "Dhaka", "Chattogram", "Chittagong", "Sylhet", "Rajshahi", "Khulna", "Barishal", "Rangpur", "Mymensingh",
    "Cumilla", "Narayanganj", "Gazipur", "Bogra", "Bogura", "Cox's Bazar", "Jessore", "Jashore", "Bhola",
    "Mirpur", "Uttara", "Dhanmondi", "Banani", "Gulshan", "Mohammadpur", "ঢাকা", "চট্টগ্রাম", "সিলেট",
  ];
  let detectedDistrict = "";
  for (const d of districts) {
    if (combined.toLowerCase().includes(d.toLowerCase())) {
      detectedDistrict = d;
      break;
    }
  }
  const qtyMatch = combined.match(/(\d{1,2})\s*(?:pcs|pc|piece|pieces|ta|ti|টি|টা)/i);
  const quantity = qtyMatch ? Math.max(1, Math.min(20, Number(qtyMatch[1]) || 1)) : 1;
  const prod = matchedProducts[0];
  const unitPrice = prod?.price || 0;
  const subtotal = unitPrice * quantity;
  const quote = calculateBdDeliveryFeeServer(detectedDistrict || "Dhaka", subtotal, Boolean(prod?.freeDelivery));

  const hasOrderIntent =
    Boolean(phone) ||
    /\b(order|confirm|book|nibo|pathan|delivery|address|ঠিকানা|নিব|পাঠান|অর্ডার)\b/i.test(combined);
  const readyToConfirm = Boolean(prod && phone && combined.length >= 18);

  return {
    hasOrderIntent,
    readyToConfirm,
    productId: prod?.id,
    productName: prod?.nameEn,
    quantity,
    customerPhone: phone || undefined,
    district: quote.district,
    unitPrice,
    deliveryCharge: quote.charge,
    totalAmount: subtotal + quote.charge,
    confidence: readyToConfirm ? 0.88 : hasOrderIntent ? 0.55 : 0.2,
    deliveryQuote: quote,
  };
}

// Gemini 3.5 Transcribe — Audio Voice Note Speech-to-Text
async function transcribeAudioWithGemini(audioDataUri: string): Promise<{
  transcript: string;
  provider: string;
}> {
  const trimmed = String(audioDataUri || "").trim();
  const dataMatch = trimmed.match(/^data:(audio\/[a-zA-Z0-9.+_-]+);base64,(.+)$/i);
  if (!dataMatch) {
    return { transcript: "", provider: "invalid_audio_data" };
  }
  const mimeType = dataMatch[1].toLowerCase();
  const data = dataMatch[2];

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-transcribe",
        contents: {
          parts: [
            { inlineData: { mimeType, data } },
            {
              text: "Transcribe this customer voice message verbatim. The customer may speak Bengali, Banglish (Romanized Bengali), or English about an e-commerce product or order. Return only the clean spoken transcription.",
            },
          ],
        },
      });
      const text = (response.text || "").trim();
      if (text) {
        return { transcript: text, provider: "gemini-3.5-transcribe" };
      }
    } catch (err: any) {
      console.warn("Gemini 3.5 Transcribe warning:", err?.message || err);
    }
  }

  return {
    transcript: "[Voice note received — manual listen or re-transcribe]",
    provider: "audio-fallback",
  };
}

async function runSalesCopilotCore(params: {
  customerMessage: string;
  conversationHistory?: any[];
  imageDataUri?: string;
  imageUrl?: string;
  audioDataUri?: string;
  entryType?: string;
  postTitleOrId?: string;
  customerDistrict?: string;
  preferredLanguage?: string;
  tacticOverride?: string;
  clientCatalogFallback?: any[];
}) {
  let cleanMessage = String(params.customerMessage || "").trim();
  let voiceTranscript = "";
  if (params.audioDataUri) {
    const tr = await transcribeAudioWithGemini(params.audioDataUri);
    voiceTranscript = tr.transcript;
    if (voiceTranscript && !voiceTranscript.startsWith("[Voice note received")) {
      cleanMessage = cleanMessage ? `${cleanMessage}\n[Voice Note]: ${voiceTranscript}` : voiceTranscript;
    }
  }

  const imagePartInput = await resolveImageInlineData(params.imageDataUri || params.imageUrl);
  const catalog = await fetchAllLiveProductsForSalesAI(params.clientCatalogFallback);
  const catalogBrief = catalog.slice(0, 60).map((p) => ({
    id: p.id,
    nameEn: p.nameEn,
    nameBn: p.nameBn,
    brand: p.brand,
    category: p.category,
    priceBDT: p.price,
    originalPriceBDT: p.originalPrice,
    inStock: p.inStock,
    stockCount: p.stockCount,
    freeDelivery: p.freeDelivery || false,
  }));

  const fuzzyInitial = cleanMessage ? searchProductsFuzzyServer(cleanMessage, catalog, 4) : [];
  const hasBengaliScript = /[\u0980-\u09FF]/.test(cleanMessage);
  const pref = String(params.preferredLanguage || "auto");
  const inferredLang: "en" | "bn" =
    pref === "bn" || pref === "en"
      ? (pref as "en" | "bn")
      : hasBengaliScript ||
          /\b(vai|bhai|vaiya|koto|dam|ase|ache|naki|korbo|koman|lagbe|taka|dhaka|assalamu|nibo|pathan|price koto)\b/i.test(
            cleanMessage
          )
        ? "bn"
        : "en";

  const tacticOverride = String(params.tacticOverride || "balanced");
  const historyTexts = Array.isArray(params.conversationHistory)
    ? params.conversationHistory.map((m: any) => String(m.text || ""))
    : [];
  const heuristicOrder = extractOrderHeuristicServer(cleanMessage, historyTexts, fuzzyInitial);
  const escalationHeuristic = detectComplaintEscalationServer(cleanMessage);
  const effectiveDistrict = params.customerDistrict || heuristicOrder.district || "Dhaka";
  const topProd = fuzzyInitial[0];
  const deliveryQuote = calculateBdDeliveryFeeServer(
    effectiveDistrict,
    (topProd?.price || 0) * (heuristicOrder.quantity || 1),
    Boolean(topProd?.freeDelivery)
  );

  if (aiClient) {
    try {
      const historyText = Array.isArray(params.conversationHistory)
        ? params.conversationHistory
            .slice(-8)
            .map((m: any) => `${m.sender === "customer" ? "Customer" : "Luxora Sales"}: ${String(m.text || "").slice(0, 300)}`)
            .join("\n")
        : "";

      const tacticInstruction: Record<string, string> = {
        balanced:
          "Adapt naturally to the customer message: identify product, state fixed promotional price with stock/offer urgency, handle doubts, calculate exact delivery charge, and invite name + phone + address to confirm.",
        fixed_price_urgency:
          "Customer wants a discount or is comparing prices. Politely decline bargaining by explaining prices are strictly fixed at the lowest promotional rate, emphasize exact savings off MSRP and limited live stock, and warn the offer price may revert soon.",
        handle_objection:
          "Address hesitation (authenticity, build quality, return fear). Highlight factory-sealed units, 100% open-box inspection before Cash on Delivery payment, and 7-day instant replacement warranty.",
        close_order:
          "Push directly for the micro-commitment close: confirm product total + delivery fee and ask for any missing field among Name, Mobile Number, District, and Full Delivery Address so the parcel joins today's Steadfast/Pathao dispatch batch.",
      };

      const trainingFaqsText =
        runtimeAiTrainingConfig.faqs?.length > 0
          ? runtimeAiTrainingConfig.faqs.map((f) => `- Q: ${f.question} -> A: ${f.answer}`).join("\n")
          : "";

      const contextBanner =
        params.entryType === "comment"
          ? `Thread Type: PUBLIC SOCIAL POST COMMENT${params.postTitleOrId ? ` on "${params.postTitleOrId}"` : ""}. Keep reply public-friendly, crisp, price-clear, and invite them to DM or drop phone/address to confirm.`
          : params.entryType === "web_chat"
            ? "Thread Type: LIVE WEBSITE CHAT CONCIERGE."
            : "Thread Type: DIRECT MESSAGE (DM).";

      const promptText = `Analyze this incoming customer inquiry for Luxora BD, match the exact live catalog product(s), calculate delivery fees, detect complaints/escalations, extract any order details, and craft a high-converting sales reply.

${contextBanner}
Requested Reply Language Mode: ${pref === "auto" ? `Understand Bengali, English & Banglish seamlessly; reply in ${inferredLang === "bn" ? "clear, natural Bengali (or matching Banglish warmth)" : "polished English"}` : pref === "bn" ? "Bengali (বাংলা)" : "English"}
Active Sales Tactic: ${tacticInstruction[tacticOverride] || tacticInstruction.balanced}

Store Persona & Trained Business Rules:
- Persona: ${runtimeAiTrainingConfig.storePersona}
- Rules: ${runtimeAiTrainingConfig.businessRules}
- Price Policy: ${runtimeAiTrainingConfig.fixedPricePolicy}
- Delivery Policy: ${runtimeAiTrainingConfig.deliveryPolicyText}
${trainingFaqsText ? `- Trained FAQs:\n${trainingFaqsText}` : ""}

Live Luxora BD Inventory Catalog (JSON):
${JSON.stringify(catalogBrief)}

Fuzzy Pre-Matched Candidates:
${JSON.stringify(fuzzyInitial.map((p) => ({ id: p.id, nameEn: p.nameEn, price: p.price, stockCount: p.stockCount, freeDelivery: p.freeDelivery || false })))}

Recent Chat History:
${historyText || "(New conversation)"}

Latest Customer Message:
"${cleanMessage || "[Customer sent a product photo/screenshot without text — identify it visually and pitch the matching item]"}"

Strict Closing & Operations Rules:
1. If an image is attached, describe what product/attributes you see in \`visualAnalysis\` and match to exact \`id\`s from the Live Inventory Catalog above (do not invent IDs or prices).
2. Handle Bengali, English, and Banglish effortlessly (e.g., "vai b72 dam koto", "mirpur e delivery fee koto", "sundor lagse nibo").
3. Delivery Charge Calculation: Dhaka Metro = ৳70, Chattogram City = ৳100, All other 64 districts = ৳120, Free delivery if product has \`freeDelivery: true\` OR item total >= ৳5,000 BDT. Always show exact total when customer mentions a district or wants to order.
4. Escalation: If the customer reports a broken/damaged item, wrong parcel, scam accusation, or demands a refund/complaint, set \`requiresEscalation: true\` with clear \`escalationReason\` and \`escalationPriority\` ('high' or 'urgent') so Supervisor/Staff can intervene.
5. Order Extraction: If the customer provides phone/address/confirmation intent, populate \`extractedOrder\` fields accurately.
6. Always provide BOTH \`salesReply\` (primary language) and \`salesReplyAlternate\` (opposite language EN/BN).`;

      const contentsPayload = imagePartInput
        ? { parts: [{ inlineData: imagePartInput }, { text: promptText }] }
        : promptText;

      const response = await aiClient.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: contentsPayload,
        config: {
          systemInstruction:
            "You are the Elite Head of Sales & Omnichannel Closing Strategist for Luxora BD (Bangladesh). You combine warm Bangladeshi hospitality ('আসসালামু আলাইকুম') with persuasive psychological closing, strict fixed-price integrity, Banglish/Bengali/English fluency, automatic delivery calculation, complaint escalation detection, and structured order extraction. Output strictly valid JSON matching the schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              visualAnalysis: { type: Type.STRING, description: "What is visible in the attached image, or empty string" },
              matchedProductIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Exact catalog product IDs matching the query or image",
              },
              customerIntent: { type: Type.STRING, description: "Short label e.g. Price Inquiry, Bargaining, Order Confirmation, Complaint Escalation" },
              detectedLanguage: { type: Type.STRING, description: "Either 'bn' or 'en'" },
              urgencyAngle: { type: Type.STRING, description: "One-line scarcity/urgency lever used" },
              deliveryDistrict: { type: Type.STRING, description: "Detected delivery district or Dhaka" },
              calculatedDeliveryCharge: { type: Type.NUMBER, description: "Calculated delivery fee in BDT (0, 70, 100, or 120)" },
              requiresEscalation: { type: Type.BOOLEAN, description: "True if complaint, damaged unit, refund, or anger needs Supervisor" },
              escalationReason: { type: Type.STRING, description: "Reason for escalation if true" },
              escalationPriority: { type: Type.STRING, description: "normal, high, or urgent" },
              extractedOrder: {
                type: Type.OBJECT,
                properties: {
                  hasOrderIntent: { type: Type.BOOLEAN },
                  readyToConfirm: { type: Type.BOOLEAN },
                  productId: { type: Type.STRING },
                  productName: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  customerName: { type: Type.STRING },
                  customerPhone: { type: Type.STRING },
                  district: { type: Type.STRING },
                  address: { type: Type.STRING },
                },
              },
              salesReply: { type: Type.STRING, description: "Ready-to-send persuasive sales message in primary language" },
              salesReplyAlternate: { type: Type.STRING, description: "Alternative version in the second language (EN or BN)" },
            },
          },
        },
      });

      const rawJson = (response.text ?? "").trim();
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        const idSet = new Set<string>(
          Array.isArray(parsed.matchedProductIds) ? parsed.matchedProductIds.map((x: any) => String(x).trim()) : []
        );
        const combinedFuzzy = searchProductsFuzzyServer(`${cleanMessage} ${parsed.visualAnalysis || ""}`, catalog, 4);
        for (const fp of combinedFuzzy) {
          if (idSet.size < 4) idSet.add(fp.id);
        }
        const matchedProducts = Array.from(idSet)
          .map((id) => catalog.find((p) => p.id === id))
          .filter((p): p is SalesCatalogProduct => Boolean(p));

        const primaryMatched = matchedProducts[0];
        const qty = Math.max(1, Number(parsed.extractedOrder?.quantity) || heuristicOrder.quantity || 1);
        const unitPrice = primaryMatched?.price || heuristicOrder.unitPrice || 0;
        const subtotal = unitPrice * qty;
        const calcQuote = calculateBdDeliveryFeeServer(
          parsed.extractedOrder?.district || parsed.deliveryDistrict || effectiveDistrict,
          subtotal,
          Boolean(primaryMatched?.freeDelivery)
        );

        const resolvedLang: "en" | "bn" =
          parsed.detectedLanguage === "bn" || parsed.detectedLanguage === "en"
            ? parsed.detectedLanguage
            : inferredLang;

        const requiresEscalation =
          Boolean(parsed.requiresEscalation) || escalationHeuristic.requiresEscalation;
        const escalationPriority =
          (parsed.escalationPriority as "normal" | "high" | "urgent") || escalationHeuristic.priority;

        const extOrd = parsed.extractedOrder || {};
        const phone = String(extOrd.customerPhone || heuristicOrder.customerPhone || "").trim();
        const address = String(extOrd.address || "").trim();

        return {
          provider: "gemini-4-hydrogen",
          data: {
            salesReply: String(parsed.salesReply || "").trim(),
            salesReplyAlternate: String(parsed.salesReplyAlternate || "").trim(),
            detectedLanguage: resolvedLang,
            customerIntent: String(parsed.customerIntent || "Sales Inquiry"),
            urgencyAngle: String(parsed.urgencyAngle || "Limited batch & promotional rate"),
            visualAnalysis: String(parsed.visualAnalysis || ""),
            voiceTranscript: voiceTranscript || undefined,
            deliveryQuote: calcQuote,
            requiresEscalation,
            escalationReason: String(parsed.escalationReason || escalationHeuristic.reason || ""),
            escalationPriority,
            extractedOrder:
              extOrd.hasOrderIntent || heuristicOrder.hasOrderIntent || phone
                ? {
                    hasOrderIntent: true,
                    readyToConfirm: Boolean(extOrd.readyToConfirm || (primaryMatched && phone && address)),
                    productId: String(extOrd.productId || primaryMatched?.id || ""),
                    productName: String(extOrd.productName || primaryMatched?.nameEn || ""),
                    quantity: qty,
                    customerName: extOrd.customerName ? String(extOrd.customerName) : undefined,
                    customerPhone: phone || undefined,
                    district: calcQuote.district,
                    address: address || undefined,
                    unitPrice,
                    deliveryCharge: calcQuote.charge,
                    totalAmount: subtotal + calcQuote.charge,
                    confidence: phone && address ? 0.92 : phone ? 0.75 : 0.5,
                  }
                : undefined,
            matchedProducts,
            provider: "gemini-4-hydrogen",
          },
        };
      }
    } catch (aiErr: any) {
      console.warn("Sales Copilot Gemini fallback triggered:", aiErr?.message || aiErr);
    }
  }

  const fb = buildSalesCopilotFallback({
    customerMessage: cleanMessage,
    matchedProducts: fuzzyInitial,
    detectedLanguage: inferredLang,
    tacticOverride,
    hasImage: Boolean(imagePartInput),
  });

  return {
    provider: "luxora-sales-closer-engine",
    data: {
      ...fb,
      detectedLanguage: inferredLang,
      voiceTranscript: voiceTranscript || undefined,
      deliveryQuote,
      requiresEscalation: escalationHeuristic.requiresEscalation,
      escalationReason: escalationHeuristic.reason,
      escalationPriority: escalationHeuristic.priority,
      extractedOrder: heuristicOrder.hasOrderIntent ? heuristicOrder : undefined,
      matchedProducts: fuzzyInitial,
      provider: "luxora-sales-closer-engine",
    },
  };
}

// Fetch WhatsApp Cloud API media attachment bytes -> Data URI for Gemini Vision inspection
async function resolveWhatsAppMediaDataUri(mediaId: string, accessToken: string): Promise<string | undefined> {
  if (!mediaId || !accessToken) return undefined;
  try {
    const metaRes = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(mediaId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) return undefined;
    const metaJson: any = await metaRes.json();
    const mediaUrl = String(metaJson?.url || "");
    if (!mediaUrl) return undefined;
    const fileRes = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!fileRes.ok) return undefined;
    const contentType = String(fileRes.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
    const buf = Buffer.from(await fileRes.arrayBuffer());
    if (buf.byteLength > 4 * 1024 * 1024) return undefined;
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

// Dispatch Real Outbound Reply via Saved Meta / WhatsApp / Instagram / TikTok API Credentials
async function dispatchChannelOutboundReply(
  channel: SocialChannelType,
  recipientId: string,
  replyText: string,
  extraMeta?: { tiktokConversationId?: string }
): Promise<{
  dispatchedLive: boolean;
  status: "sent_live" | "skipped_no_token" | "skipped_disabled" | "api_error";
  detail: string;
  externalMessageId?: string;
}> {
  const cfg = runtimeChannelCredentials[channel];
  if (!cfg || !cfg.connected) {
    return { dispatchedLive: false, status: "skipped_disabled", detail: `${channel} channel is paused.` };
  }
  const token = String(cfg.accessToken || "").trim();
  if (!token) {
    return {
      dispatchedLive: false,
      status: "skipped_no_token",
      detail: `No ${channel} Access Token configured yet — reply drafted in CRM inbox.`,
    };
  }

  try {
    if (channel === "messenger") {
      const pageTarget = encodeURIComponent(String(cfg.pageOrBusinessId || "me").trim() || "me");
      const apiRes = await fetch(`https://graph.facebook.com/v21.0/${pageTarget}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          messaging_type: "RESPONSE",
          message: { text: replyText },
        }),
      });
      const json: any = await apiRes.json().catch(() => ({}));
      if (!apiRes.ok) {
        return {
          dispatchedLive: false,
          status: "api_error",
          detail: json?.error?.message || `Messenger Graph API error (${apiRes.status})`,
        };
      }
      return {
        dispatchedLive: true,
        status: "sent_live",
        detail: "Delivered live via Meta Messenger Graph API v21.0",
        externalMessageId: json?.message_id,
      };
    }

    if (channel === "instagram") {
      const igId = encodeURIComponent(String(cfg.instagramBusinessId || cfg.pageOrBusinessId || "me").trim() || "me");
      const apiRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: replyText },
        }),
      });
      const json: any = await apiRes.json().catch(() => ({}));
      if (!apiRes.ok) {
        return {
          dispatchedLive: false,
          status: "api_error",
          detail: json?.error?.message || `Instagram Graph API error (${apiRes.status})`,
        };
      }
      return {
        dispatchedLive: true,
        status: "sent_live",
        detail: "Delivered live via Instagram Direct Graph API v21.0",
        externalMessageId: json?.message_id,
      };
    }

    if (channel === "whatsapp") {
      const phoneId = String(cfg.pageOrBusinessId || "").trim();
      if (!phoneId) {
        return {
          dispatchedLive: false,
          status: "skipped_no_token",
          detail: "WhatsApp Phone Number ID is required for Cloud API dispatch.",
        };
      }
      const cleanRecipient = recipientId.replace(/[^\d]/g, "");
      const apiRes = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanRecipient,
          type: "text",
          text: { preview_url: true, body: replyText },
        }),
      });
      const json: any = await apiRes.json().catch(() => ({}));
      if (!apiRes.ok) {
        return {
          dispatchedLive: false,
          status: "api_error",
          detail: json?.error?.message || `WhatsApp Cloud API error (${apiRes.status})`,
        };
      }
      return {
        dispatchedLive: true,
        status: "sent_live",
        detail: "Delivered live via WhatsApp Business Cloud API v21.0",
        externalMessageId: json?.messages?.[0]?.id,
      };
    }

    if (channel === "tiktok") {
      const apiRes = await fetch("https://business-api.tiktok.com/open_api/v1.3/im/message/send/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": token,
        },
        body: JSON.stringify({
          business_id: cfg.pageOrBusinessId || undefined,
          recipient_type: "USER",
          recipient_id: recipientId,
          conversation_id: extraMeta?.tiktokConversationId || undefined,
          message_type: "TEXT",
          text: { body: replyText },
        }),
      });
      const json: any = await apiRes.json().catch(() => ({}));
      if (!apiRes.ok || (typeof json?.code === "number" && json.code !== 0)) {
        return {
          dispatchedLive: false,
          status: "api_error",
          detail: json?.message || `TikTok Messaging API error (${apiRes.status})`,
        };
      }
      return {
        dispatchedLive: true,
        status: "sent_live",
        detail: "Delivered live via TikTok Business Messaging API",
        externalMessageId: json?.data?.message_id,
      };
    }
  } catch (err: any) {
    return {
      dispatchedLive: false,
      status: "api_error",
      detail: err?.message || "Outbound network error",
    };
  }

  if (channel === "web") {
    return {
      dispatchedLive: true,
      status: "sent_live",
      detail: "Delivered live inside Website Live Chat thread",
    };
  }

  return { dispatchedLive: false, status: "skipped_no_token", detail: "Unsupported channel" };
}

// POST /api/ai/transcribe-voice — Admin-Only Voice Note Speech-to-Text via Gemini 3.5 Transcribe
app.post("/api/ai/transcribe-voice", async (req, res) => {
  const adminAuth = await verifyAdminBearerToken(req);
  if ("status" in adminAuth) {
    res.status(adminAuth.status).json({ error: adminAuth.error });
    return;
  }

  try {
    const { audioDataUri } = req.body || {};
    if (!audioDataUri || typeof audioDataUri !== "string") {
      res.status(400).json({ error: "audioDataUri is required for voice transcription." });
      return;
    }
    const result = await transcribeAudioWithGemini(audioDataUri);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Error in /api/ai/transcribe-voice:", error);
    res.status(500).json({ error: error?.message || "Voice note transcription failed." });
  }
});

// POST /api/ai/sales-copilot — Strictly Admin-Gated (Firebase ID Token + Admin DB verification)
app.post("/api/ai/sales-copilot", async (req, res) => {
  const adminAuth = await verifyAdminBearerToken(req);
  if ("status" in adminAuth) {
    res.status(adminAuth.status).json({ error: adminAuth.error });
    return;
  }

  try {
    const {
      customerMessage = "",
      conversationHistory = [],
      imageDataUri,
      imageUrl,
      audioDataUri,
      entryType = "dm",
      postTitleOrId,
      customerDistrict,
      preferredLanguage = "auto",
      tacticOverride = "balanced",
      clientCatalogFallback = [],
    } = req.body || {};

    if (!String(customerMessage || "").trim() && !imageDataUri && !imageUrl && !audioDataUri) {
      res.status(400).json({ error: "Provide a customer message, voice note, or product screenshot to analyze." });
      return;
    }

    const result = await runSalesCopilotCore({
      customerMessage,
      conversationHistory,
      imageDataUri,
      imageUrl,
      audioDataUri,
      entryType,
      postTitleOrId,
      customerDistrict,
      preferredLanguage,
      tacticOverride,
      clientCatalogFallback,
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Error in /api/ai/sales-copilot:", error);
    res.status(500).json({ error: error?.message || "Sales Copilot failed to analyze inquiry." });
  }
});

// Admin-Only AI Training & Catalog Sync Config Endpoints
app.get("/api/omnichannel/ai-training", async (req, res) => {
  const adminAuth = await verifyAdminBearerToken(req);
  if ("status" in adminAuth) {
    res.status(adminAuth.status).json({ error: adminAuth.error });
    return;
  }
  res.json({ success: true, config: runtimeAiTrainingConfig, logistics: runtimeLogisticsConfig });
});

app.post("/api/omnichannel/ai-training", async (req, res) => {
  const adminAuth = await verifyAdminBearerToken(req);
  if ("status" in adminAuth) {
    res.status(adminAuth.status).json({ error: adminAuth.error });
    return;
  }
  if (req.body?.config && typeof req.body.config === "object") {
    runtimeAiTrainingConfig = {
      ...runtimeAiTrainingConfig,
      ...req.body.config,
      updatedAt: new Date().toISOString(),
    };
    persistAiTrainingConfig();
  }
  if (req.body?.logistics && typeof req.body.logistics === "object") {
    runtimeLogisticsConfig = {
      ...runtimeLogisticsConfig,
      ...req.body.logistics,
      updatedAt: new Date().toISOString(),
    };
    persistLogisticsConfig();
  }
  res.json({ success: true, config: runtimeAiTrainingConfig, logistics: runtimeLogisticsConfig });
});

// Admin-Only External Catalog Sync (CSV / Shopify / WooCommerce / Facebook Page Posts)
app.post("/api/catalog/sync-external", async (req, res) => {
  const adminAuth = await verifyAdminBearerToken(req);
  if ("status" in adminAuth) {
    res.status(adminAuth.status).json({ error: adminAuth.error });
    return;
  }

  try {
    const source = String(req.body?.source || "csv").toLowerCase() as
      | "csv"
      | "facebook"
      | "shopify"
      | "woocommerce";
    const rawPayload = String(req.body?.payload || "").trim();
    if (!rawPayload) {
      res.status(400).json({ error: "Provide CSV text, JSON feed, or Facebook post catalog data to sync." });
      return;
    }

    const parsedItems: ServerExternalCatalogItem[] = [];
    const nowIso = new Date().toISOString();

    if (source === "csv") {
      const lines = rawPayload.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const startIdx = lines[0] && /name|title|price|sku/i.test(lines[0]) ? 1 : 0;
      for (let i = startIdx; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.length < 2) continue;
        const nameEn = cols[0];
        const price = Number(String(cols[1] || "0").replace(/[^\d.]/g, "")) || 0;
        if (!nameEn || price <= 0) continue;
        const stockCount = cols[2] !== undefined ? Number(cols[2]) || 10 : 10;
        const brand = cols[3] || "Luxora Curated";
        const category = cols[4] || "gadgets";
        const sku = cols[5] || `CSV-${Date.now().toString(36)}-${i}`;
        const image = cols[6] || "";
        parsedItems.push({
          id: sku.toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
          nameEn,
          brand,
          category,
          price,
          stockCount,
          inStock: stockCount > 0,
          sku,
          image,
          freeDelivery: price >= 5000,
          source: "csv",
          updatedAt: nowIso,
        });
      }
    } else if (source === "shopify" || source === "woocommerce") {
      const jsonObj = JSON.parse(rawPayload);
      const list = Array.isArray(jsonObj)
        ? jsonObj
        : Array.isArray(jsonObj?.products)
          ? jsonObj.products
          : [];
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const title = String(item.title || item.name || "").trim();
        const variantPrice =
          Number(item.price) ||
          Number(item.variants?.[0]?.price) ||
          Number(item.regular_price) ||
          0;
        if (!title) continue;
        const sku = String(item.sku || item.variants?.[0]?.sku || item.id || `${source}-${i}`);
        const img =
          String(item.image?.src || item.images?.[0]?.src || item.image || "").trim();
        const qty = Number(item.stock_quantity ?? item.variants?.[0]?.inventory_quantity ?? 12);
        parsedItems.push({
          id: `${source}-${String(item.id || sku).replace(/[^a-zA-Z0-9_-]/g, "-")}`,
          nameEn: title,
          brand: String(item.vendor || item.brand || "Luxora Synced"),
          category: String(item.product_type || item.categories?.[0]?.slug || "gadgets").toLowerCase(),
          price: variantPrice,
          stockCount: qty,
          inStock: item.stock_status ? item.stock_status === "instock" : qty > 0,
          sku,
          image: img,
          freeDelivery: variantPrice >= 5000,
          source,
          updatedAt: nowIso,
        });
      }
    } else if (source === "facebook") {
      // Parse Facebook Page post/reel captions (line-by-line or Gemini-assisted)
      const blocks = rawPayload.split(/\n{2,}|---/).map((b) => b.trim()).filter(Boolean);
      for (let i = 0; i < blocks.length; i++) {
        const parsed = parseRawProductNotesFallback(blocks[i], [], "en");
        if (parsed.nameEn) {
          const price = parsed.suggestedPrice || 2500;
          parsedItems.push({
            id: `fb-post-${Date.now().toString(36)}-${i}`,
            nameEn: parsed.nameEn,
            nameBn: parsed.nameBn,
            brand: parsed.brand,
            category: parsed.suggestedCategory,
            price,
            originalPrice: parsed.suggestedOriginalPrice || undefined,
            stockCount: parsed.suggestedStockCount || 15,
            inStock: true,
            freeDelivery: parsed.freeDelivery || price >= 5000,
            source: "facebook",
            updatedAt: nowIso,
          });
        }
      }
    }

    const existingMap = new Map<string, ServerExternalCatalogItem>();
    for (const prev of runtimeAiTrainingConfig.externalCatalog || []) {
      existingMap.set(prev.id, prev);
    }
    for (const next of parsedItems) {
      existingMap.set(next.id, next);
    }

    runtimeAiTrainingConfig.externalCatalog = Array.from(existingMap.values());
    runtimeAiTrainingConfig.lastCatalogSyncAt = nowIso;
    runtimeAiTrainingConfig.updatedAt = nowIso;
    persistAiTrainingConfig();

    res.json({
      success: true,
      importedCount: parsedItems.length,
      totalExternalCount: runtimeAiTrainingConfig.externalCatalog.length,
      items: parsedItems,
      externalCatalog: runtimeAiTrainingConfig.externalCatalog,
    });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "Failed to parse external catalog payload." });
  }
});

// Admin-Only Omnichannel Credentials Status & Sync Endpoints
app.get("/api/omnichannel/credentials", async (req, res) => {
  const adminAuth = await verifyAdminBearerToken(req);
  if ("status" in adminAuth) {
    res.status(adminAuth.status).json({ error: adminAuth.error });
    return;
  }

  const summary = (["messenger", "whatsapp", "instagram", "tiktok", "web"] as SocialChannelType[]).map((ch) => {
    const c = runtimeChannelCredentials[ch];
    return {
      id: c.id,
      label: c.label,
      handleOrNumber: c.handleOrNumber,
      pageOrBusinessId: c.pageOrBusinessId,
      wabaId: c.wabaId,
      instagramBusinessId: c.instagramBusinessId,
      hasAccessToken: Boolean(c.accessToken?.trim()),
      maskedAccessToken: maskSecret(c.accessToken),
      hasAppKey: Boolean(c.appKey?.trim()),
      hasAppSecret: Boolean(c.appSecret?.trim()),
      verifyToken: getEffectiveVerifyToken(),
      connected: c.connected,
      autoAiDraft: c.autoAiDraft,
      lastWebhookAt: c.lastWebhookAt || null,
      lastDispatchStatus: c.lastDispatchStatus || null,
      updatedAt: c.updatedAt,
    };
  });

  res.json({ success: true, channels: summary, verifyToken: getEffectiveVerifyToken() });
});

app.post("/api/omnichannel/credentials/sync", async (req, res) => {
  const adminAuth = await verifyAdminBearerToken(req);
  if ("status" in adminAuth) {
    res.status(adminAuth.status).json({ error: adminAuth.error });
    return;
  }

  const incoming = Array.isArray(req.body?.channels) ? req.body.channels : [];
  const sharedVerifyToken = typeof req.body?.verifyToken === "string" ? req.body.verifyToken.trim() : "";

  for (const item of incoming) {
    if (!item || !["messenger", "whatsapp", "instagram", "tiktok", "web"].includes(item.id)) continue;
    const ch = item.id as SocialChannelType;
    const prev = runtimeChannelCredentials[ch];
    runtimeChannelCredentials[ch] = {
      ...prev,
      id: ch,
      label: String(item.label || prev.label),
      handleOrNumber: String(item.handleOrNumber ?? prev.handleOrNumber),
      pageOrBusinessId: String(item.pageOrBusinessId ?? item.instagramBusinessId ?? prev.pageOrBusinessId ?? "").trim(),
      wabaId: String(item.wabaId ?? prev.wabaId ?? "").trim(),
      instagramBusinessId: String(item.instagramBusinessId ?? item.pageOrBusinessId ?? prev.instagramBusinessId ?? "").trim(),
      accessToken: item.accessToken !== undefined ? String(item.accessToken).trim() : prev.accessToken,
      appKey: item.appKey !== undefined ? String(item.appKey).trim() : prev.appKey,
      appSecret: item.appSecret !== undefined ? String(item.appSecret).trim() : prev.appSecret,
      verifyToken: sharedVerifyToken || String(item.verifyToken || prev.verifyToken || "luxora-omnichannel-verify").trim(),
      connected: item.connected !== undefined ? Boolean(item.connected) : prev.connected,
      autoAiDraft: item.autoAiDraft !== undefined ? Boolean(item.autoAiDraft) : prev.autoAiDraft,
      updatedAt: new Date().toISOString(),
    };
  }

  persistRuntimeCredentials();
  res.json({
    success: true,
    syncedAt: new Date().toISOString(),
    verifyToken: getEffectiveVerifyToken(),
    readiness: (["messenger", "whatsapp", "instagram", "tiktok", "web"] as SocialChannelType[]).map((ch) => ({
      id: ch,
      connected: runtimeChannelCredentials[ch].connected,
      autoAiDraft: runtimeChannelCredentials[ch].autoAiDraft,
      readyForLiveReply: Boolean(runtimeChannelCredentials[ch].accessToken?.trim()),
    })),
  });
});

// Admin-Only Live Outbound Message Dispatch Endpoint
app.post("/api/omnichannel/send-reply", async (req, res) => {
  const adminAuth = await verifyAdminBearerToken(req);
  if ("status" in adminAuth) {
    res.status(adminAuth.status).json({ error: adminAuth.error });
    return;
  }

  const channel = String(req.body?.channel || "") as SocialChannelType;
  const recipientId = String(req.body?.customerId || req.body?.customerPhone || "").trim();
  const text = String(req.body?.text || "").trim();

  if (!["messenger", "whatsapp", "instagram", "tiktok", "web"].includes(channel) || !recipientId || !text) {
    res.status(400).json({ error: "channel, recipientId, and text are required." });
    return;
  }

  const dispatch = await dispatchChannelOutboundReply(channel, recipientId, text);
  if (runtimeChannelCredentials[channel]) {
    runtimeChannelCredentials[channel].lastDispatchStatus = dispatch.detail;
    persistRuntimeCredentials();
  }
  res.json({ success: true, ...dispatch });
});

// Omnichannel Webhook Buffer (Messenger, WhatsApp Business, Instagram DM, TikTok DM, Website Chat, Post Comments)
interface QueuedWebhookEvent {
  queueId: string;
  channel: SocialChannelType;
  entryType?: "dm" | "comment" | "voice_note" | "web_chat" | "system_event";
  postTitleOrId?: string;
  customerId: string;
  customerName: string;
  customerHandle?: string;
  customerPhone?: string;
  text: string;
  imageUrl?: string;
  audioDataUri?: string;
  audioTranscript?: string;
  tiktokConversationId?: string;
  aiAutoReply?: string;
  aiAutoReplyAlt?: string;
  aiCustomerIntent?: string;
  aiMatchedProductIds?: string[];
  aiVisualAnalysis?: string;
  aiUrgencyAngle?: string;
  aiDetectedLanguage?: "en" | "bn";
  deliveryQuote?: { district: string; charge: number; freeReason?: string };
  requiresEscalation?: boolean;
  escalationReason?: string;
  escalationPriority?: "normal" | "high" | "urgent";
  extractedOrder?: any;
  dispatchStatus?: string;
  timestamp: string;
}

const pendingWebhookQueue: QueuedWebhookEvent[] = [];

function enqueueWebhookEvent(evt: QueuedWebhookEvent) {
  pendingWebhookQueue.push(evt);
  if (pendingWebhookQueue.length > 200) {
    pendingWebhookQueue.shift();
  }
}

async function processInboundWebhookEvent(evt: QueuedWebhookEvent, catalogFallback?: any[]) {
  const cfg = runtimeChannelCredentials[evt.channel];
  if (cfg) {
    cfg.lastWebhookAt = new Date().toISOString();
  }

  // Run Gemini AI Sales Assistant (supports text, image screenshot, AND voice note transcription!)
  const aiRes = await runSalesCopilotCore({
    customerMessage: evt.text,
    imageDataUri: evt.imageUrl?.startsWith("data:image/") ? evt.imageUrl : undefined,
    imageUrl: evt.imageUrl && !evt.imageUrl.startsWith("data:image/") ? evt.imageUrl : undefined,
    audioDataUri: evt.audioDataUri,
    entryType: evt.entryType,
    postTitleOrId: evt.postTitleOrId,
    preferredLanguage: "auto",
    tacticOverride: "balanced",
    clientCatalogFallback: catalogFallback,
  });

  if (aiRes.data.voiceTranscript) {
    evt.audioTranscript = aiRes.data.voiceTranscript;
    if (!evt.text || evt.text === "Sent a voice note") {
      evt.text = aiRes.data.voiceTranscript;
    }
  }
  evt.aiAutoReply = aiRes.data.salesReply;
  evt.aiAutoReplyAlt = aiRes.data.salesReplyAlternate;
  evt.aiCustomerIntent = aiRes.data.customerIntent;
  evt.aiMatchedProductIds = aiRes.data.matchedProducts.map((p) => p.id);
  evt.aiVisualAnalysis = aiRes.data.visualAnalysis || undefined;
  evt.aiUrgencyAngle = aiRes.data.urgencyAngle || undefined;
  evt.aiDetectedLanguage = aiRes.data.detectedLanguage;
  evt.deliveryQuote = aiRes.data.deliveryQuote;
  evt.requiresEscalation = aiRes.data.requiresEscalation;
  evt.escalationReason = aiRes.data.escalationReason;
  evt.escalationPriority = aiRes.data.escalationPriority;
  evt.extractedOrder = aiRes.data.extractedOrder;

  const isReviewMode = runtimeAiTrainingConfig.defaultAiMode === "review_mode";
  const isHumanTakeover = runtimeAiTrainingConfig.defaultAiMode === "human_takeover";

  if (isHumanTakeover) {
    evt.dispatchStatus = "human_takeover_ai_paused";
  } else if (isReviewMode) {
    evt.dispatchStatus = "pending_human_review";
  } else if (cfg && cfg.connected && cfg.autoAiDraft && aiRes.data.salesReply) {
    const dispatch = await dispatchChannelOutboundReply(
      evt.channel,
      evt.customerPhone || evt.customerId,
      aiRes.data.salesReply,
      { tiktokConversationId: evt.tiktokConversationId }
    );
    evt.dispatchStatus = `${dispatch.status}: ${dispatch.detail}`;
    cfg.lastDispatchStatus = evt.dispatchStatus;
    persistRuntimeCredentials();
  } else {
    evt.dispatchStatus = "queued_for_admin_review";
  }

  enqueueWebhookEvent(evt);
  return evt;
}

// Admin-Only End-to-End Live Webhook + Gemini Auto-Reply Tester (Supports DM, Comment, Voice Note, Web)
app.post("/api/omnichannel/test-webhook", async (req, res) => {
  const adminAuth = await verifyAdminBearerToken(req);
  if ("status" in adminAuth) {
    res.status(adminAuth.status).json({ error: adminAuth.error });
    return;
  }

  try {
    const channelRaw = String(req.body?.channel || "messenger").toLowerCase();
    const channel: SocialChannelType =
      channelRaw === "whatsapp" || channelRaw === "instagram" || channelRaw === "tiktok" || channelRaw === "web"
        ? (channelRaw as SocialChannelType)
        : "messenger";
    const entryTypeRaw = String(req.body?.entryType || "dm").toLowerCase();
    const entryType: QueuedWebhookEvent["entryType"] =
      entryTypeRaw === "comment" || entryTypeRaw === "voice_note" || entryTypeRaw === "web_chat"
        ? (entryTypeRaw as QueuedWebhookEvent["entryType"])
        : "dm";
    const text = String(req.body?.text || "").trim();
    const customerName = String(req.body?.customerName || `Test ${channel} Shopper`).trim();
    const customerId = String(req.body?.customerId || `test-${channel}-${Date.now().toString(36)}`).trim();

    if (!text && !req.body?.imageDataUri && !req.body?.audioDataUri) {
      res.status(400).json({ error: "Enter a sample customer message, image, or voice note to run webhook test." });
      return;
    }

    const evt: QueuedWebhookEvent = {
      queueId: `wh-test-${Date.now()}`,
      channel,
      entryType,
      postTitleOrId: req.body?.postTitleOrId ? String(req.body.postTitleOrId) : undefined,
      customerId,
      customerName,
      customerPhone: channel === "whatsapp" ? customerId : undefined,
      text: text || (req.body?.audioDataUri ? "Sent a voice note" : "Sent a product photo"),
      imageUrl: req.body?.imageDataUri || undefined,
      audioDataUri: req.body?.audioDataUri || undefined,
      timestamp: new Date().toISOString(),
    };

    const processed = await processInboundWebhookEvent(evt, req.body?.clientCatalogFallback);
    res.json({ success: true, event: processed });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Webhook test pipeline failed." });
  }
});

// Webhook Verification Challenge (Meta Messenger, WhatsApp, Instagram, TikTok)
app.get("/api/webhooks/omnichannel", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const expectedToken = getEffectiveVerifyToken();

  if (mode === "subscribe" && token === expectedToken && challenge) {
    res.status(200).send(String(challenge));
    return;
  }

  if (typeof req.query.challenge === "string") {
    res.status(200).send(req.query.challenge);
    return;
  }

  res.json({
    status: "ok",
    endpoint: "/api/webhooks/omnichannel",
    supportedChannels: ["messenger", "whatsapp", "instagram", "tiktok", "web"],
    configuredChannels: (["messenger", "whatsapp", "instagram", "tiktok", "web"] as SocialChannelType[]).filter((ch) =>
      Boolean(runtimeChannelCredentials[ch]?.accessToken)
    ),
  });
});

// Webhook Ingestion Endpoint for Meta / WhatsApp / Instagram / TikTok / Post Comments & Voice Notes
app.post("/api/webhooks/omnichannel", async (req: any, res) => {
  try {
    const body: any = req.body || {};
    const nowIso = new Date().toISOString();
    const parsedEvents: QueuedWebhookEvent[] = [];

    // Optional Meta X-Hub-Signature-256 verification when App Secret is configured
    const sigHeader = String(req.headers["x-hub-signature-256"] || "");
    const metaAppSecret =
      runtimeChannelCredentials.messenger?.appSecret ||
      runtimeChannelCredentials.instagram?.appSecret ||
      runtimeChannelCredentials.whatsapp?.appSecret;
    if (sigHeader && metaAppSecret && req.rawBody) {
      const expectedSig =
        "sha256=" + crypto.createHmac("sha256", metaAppSecret).update(req.rawBody).digest("hex");
      if (sigHeader.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expectedSig))) {
        console.warn("Omnichannel webhook Meta HMAC signature mismatch rejected.");
        res.status(401).json({ error: "Invalid webhook signature" });
        return;
      }
    }

    // 1. Meta Messenger / Instagram Object Schema (DMs + Audio + Feed/Post Comments)
    if ((body.object === "page" || body.object === "instagram") && Array.isArray(body.entry)) {
      const ch: SocialChannelType = body.object === "instagram" ? "instagram" : "messenger";
      for (const entry of body.entry) {
        const events = Array.isArray(entry.messaging) ? entry.messaging : [];
        for (const ev of events) {
          const senderId = String(ev?.sender?.id || "");
          const msg = ev?.message;
          if (!senderId || !msg || msg.is_echo) continue;
          const imgAtt = Array.isArray(msg.attachments)
            ? msg.attachments.find((a: any) => a?.type === "image")?.payload?.url
            : undefined;
          const audioAtt = Array.isArray(msg.attachments)
            ? msg.attachments.find((a: any) => a?.type === "audio")?.payload?.url
            : undefined;
          parsedEvents.push({
            queueId: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            channel: ch,
            entryType: audioAtt ? "voice_note" : "dm",
            customerId: senderId,
            customerName: String(ev?.sender?.name || `${ch === "instagram" ? "IG" : "FB"} User ${senderId.slice(-4)}`),
            text: String(msg.text || (audioAtt ? "Sent a voice note" : imgAtt ? "Sent a product photo" : "")).trim(),
            imageUrl: imgAtt,
            audioDataUri: audioAtt && String(audioAtt).startsWith("data:") ? audioAtt : undefined,
            timestamp: ev.timestamp ? new Date(Number(ev.timestamp)).toISOString() : nowIso,
          });
        }

        // Meta Page/IG Post & Reel Comment changes
        const changes = Array.isArray(entry.changes) ? entry.changes : [];
        for (const change of changes) {
          if (change?.field === "feed" || change?.field === "comments") {
            const val = change?.value || {};
            if (val.item === "comment" || val.comment_id || change.field === "comments") {
              const fromId = String(val.from?.id || `commenter-${Date.now()}`);
              const fromName = String(val.from?.name || val.from?.username || "Post Commenter");
              const commentText = String(val.message || val.text || "").trim();
              if (!commentText) continue;
              parsedEvents.push({
                queueId: `wh-cmt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                channel: ch,
                entryType: "comment",
                postTitleOrId: String(val.post_id || val.media?.id || "Social Post Comment"),
                customerId: fromId,
                customerName: fromName,
                text: commentText,
                timestamp: nowIso,
              });
            }
          }
        }
      }
    }

    // 2. Meta WhatsApp Business Cloud API Schema (Text + Images + Audio Voice Notes)
    if (body.object === "whatsapp_business_account" && Array.isArray(body.entry)) {
      const waToken = runtimeChannelCredentials.whatsapp?.accessToken || "";
      for (const entry of body.entry) {
        const changes = Array.isArray(entry.changes) ? entry.changes : [];
        for (const change of changes) {
          const value = change?.value || {};
          const contacts = Array.isArray(value.contacts) ? value.contacts : [];
          const messages = Array.isArray(value.messages) ? value.messages : [];
          for (const msg of messages) {
            const fromPhone = String(msg.from || "");
            if (!fromPhone) continue;
            const contactName = contacts.find((c: any) => c.wa_id === fromPhone)?.profile?.name;
            let waImageDataUri: string | undefined;
            let waAudioDataUri: string | undefined;
            if (msg.type === "image" && msg.image?.id && waToken) {
              waImageDataUri = await resolveWhatsAppMediaDataUri(String(msg.image.id), waToken);
            }
            if (msg.type === "audio" && msg.audio?.id && waToken) {
              waAudioDataUri = await resolveWhatsAppMediaDataUri(String(msg.audio.id), waToken);
            }
            const text = String(
              msg?.text?.body ||
                msg?.image?.caption ||
                (msg.type === "audio" ? "Sent a voice note" : msg.type === "image" ? "Sent a product image" : "")
            ).trim();
            parsedEvents.push({
              queueId: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              channel: "whatsapp",
              entryType: msg.type === "audio" ? "voice_note" : "dm",
              customerId: fromPhone,
              customerName: String(contactName || `+${fromPhone}`),
              customerPhone: fromPhone,
              text,
              imageUrl: waImageDataUri,
              audioDataUri: waAudioDataUri,
              timestamp: nowIso,
            });
          }
        }
      }
    }

    // 3. TikTok / Web / Normalized Webhook Bridge Payload (DM, Comments, Voice Notes)
    if (
      parsedEvents.length === 0 &&
      (body.channel || body.platform || body.event === "im.message.receive" || body.type === "direct_message")
    ) {
      const chRaw = String(body.channel || body.platform || (body.event === "im.message.receive" ? "tiktok" : "messenger")).toLowerCase();
      const ch: SocialChannelType =
        chRaw === "whatsapp" || chRaw === "instagram" || chRaw === "tiktok" || chRaw === "web"
          ? (chRaw as SocialChannelType)
          : "messenger";
      const text = String(body.text || body.content?.text || body.message || "").trim();
      const imageUrl = body.imageUrl || body.content?.image_url || undefined;
      const audioDataUri = body.audioDataUri || undefined;
      if (text || imageUrl || audioDataUri) {
        parsedEvents.push({
          queueId: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          channel: ch,
          entryType: body.entryType || (audioDataUri ? "voice_note" : ch === "web" ? "web_chat" : "dm"),
          postTitleOrId: body.postTitleOrId ? String(body.postTitleOrId) : undefined,
          customerId: String(body.customerId || body.senderId || body.from_user_id || `ext-${Date.now()}`),
          customerName: String(body.customerName || body.senderName || "Social Customer"),
          customerHandle: body.customerHandle ? String(body.customerHandle) : undefined,
          customerPhone: body.customerPhone ? String(body.customerPhone) : undefined,
          tiktokConversationId: body.conversation_id ? String(body.conversation_id) : undefined,
          text: text || (audioDataUri ? "Sent a voice note" : "Sent a product photo"),
          imageUrl: imageUrl ? String(imageUrl) : undefined,
          audioDataUri: audioDataUri ? String(audioDataUri) : undefined,
          timestamp: nowIso,
        });
      }
    }

    const awaitProcessing = String(req.query.await || "") === "true";
    if (awaitProcessing) {
      const processed = [];
      for (const evt of parsedEvents) {
        processed.push(await processInboundWebhookEvent(evt));
      }
      res.status(200).json({ received: true, ingestedCount: processed.length, processed });
      return;
    }

    res.status(200).json({ received: true, ingestedCount: parsedEvents.length });

    for (const evt of parsedEvents) {
      processInboundWebhookEvent(evt).catch((err) => {
        console.warn("Async webhook AI processing warning:", err);
        enqueueWebhookEvent(evt);
      });
    }
  } catch (err: any) {
    res.status(200).json({ received: true, warning: err?.message || "Parsed with warnings" });
  }
});

// Admin-Only Drain of Queued Inbound Webhook Messages
app.get("/api/webhooks/omnichannel/pending", async (req, res) => {
  const adminAuth = await verifyAdminBearerToken(req);
  if ("status" in adminAuth) {
    res.status(adminAuth.status).json({ error: adminAuth.error });
    return;
  }
  const drained = pendingWebhookQueue.splice(0, pendingWebhookQueue.length);
  res.json({ success: true, events: drained });
});

// Admin-Only One-Click Courier Parcel Booking (Steadfast & Pathao)
app.post("/api/courier/book-parcel", async (req, res) => {
  const adminAuth = await verifyAdminBearerToken(req);
  if ("status" in adminAuth) {
    res.status(adminAuth.status).json({ error: adminAuth.error });
    return;
  }

  try {
    const provider = String(req.body?.provider || "steadfast").toLowerCase() === "pathao" ? "pathao" : "steadfast";
    const orderId = String(req.body?.orderId || "").trim();
    const customer = req.body?.customer || {};
    const codAmount = Math.max(0, Number(req.body?.codAmount ?? req.body?.totalAmount ?? 0));
    const note = String(req.body?.note || customer.notes || "Luxora BD Luxury Parcel").trim();

    if (!orderId || !customer.name || !customer.phone) {
      res.status(400).json({ error: "orderId, customer.name, and customer.phone are required for courier booking." });
      return;
    }

    if (
      provider === "steadfast" &&
      runtimeLogisticsConfig.steadfastApiKey?.trim() &&
      runtimeLogisticsConfig.steadfastSecretKey?.trim()
    ) {
      try {
        const stRes = await fetch("https://portal.packzy.com/api/v1/create_order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Api-Key": runtimeLogisticsConfig.steadfastApiKey.trim(),
            "Secret-Key": runtimeLogisticsConfig.steadfastSecretKey.trim(),
          },
          body: JSON.stringify({
            invoice: orderId,
            recipient_name: customer.name,
            recipient_phone: String(customer.phone).replace(/[^\d]/g, "").slice(-11),
            recipient_address: `${customer.shippingAddress || ""}, ${customer.district || "Dhaka"}`,
            cod_amount: codAmount,
            note,
          }),
        });
        const stJson: any = await stRes.json().catch(() => ({}));
        if (stRes.ok && stJson?.consignment?.tracking_code) {
          const code = String(stJson.consignment.tracking_code);
          res.json({
            success: true,
            trackingInfo: {
              courier: "Steadfast Luxury Express",
              trackingNumber: code,
              consignmentId: String(stJson.consignment.consignment_id || code),
              trackingUrl: `https://steadfast.com.bd/t/${code}`,
              estimatedDelivery: "Within 24-48 Hours",
              bookedAt: new Date().toISOString(),
              bookingStatus: "live_api",
            },
          });
          return;
        }
      } catch (err) {
        console.warn("Steadfast live API unreachable, falling back to structured booking:", err);
      }
    }

    if (
      provider === "pathao" &&
      runtimeLogisticsConfig.pathaoAccessToken?.trim() &&
      runtimeLogisticsConfig.pathaoStoreId?.trim()
    ) {
      try {
        const ptRes = await fetch("https://api-hermes.pathao.com/aladdin/api/v1/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${runtimeLogisticsConfig.pathaoAccessToken.trim()}`,
          },
          body: JSON.stringify({
            store_id: Number(runtimeLogisticsConfig.pathaoStoreId) || runtimeLogisticsConfig.pathaoStoreId,
            merchant_order_id: orderId,
            recipient_name: customer.name,
            recipient_phone: String(customer.phone).replace(/[^\d]/g, "").slice(-11),
            recipient_address: `${customer.shippingAddress || ""}, ${customer.district || "Dhaka"}`,
            delivery_type: 48,
            item_type: 2,
            item_quantity: 1,
            item_weight: 0.5,
            amount_to_collect: codAmount,
            special_instruction: note,
          }),
        });
        const ptJson: any = await ptRes.json().catch(() => ({}));
        if (ptRes.ok && ptJson?.data?.consignment_id) {
          const cid = String(ptJson.data.consignment_id);
          res.json({
            success: true,
            trackingInfo: {
              courier: "Pathao Prime Express",
              trackingNumber: cid,
              consignmentId: cid,
              trackingUrl: `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(cid)}`,
              estimatedDelivery: "Within 24-48 Hours",
              bookedAt: new Date().toISOString(),
              bookingStatus: "live_api",
            },
          });
          return;
        }
      } catch (err) {
        console.warn("Pathao live API unreachable, falling back to structured booking:", err);
      }
    }

    const prefix = provider === "pathao" ? "PTH" : "STDF";
    const generatedCode = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
    res.json({
      success: true,
      trackingInfo: {
        courier: provider === "pathao" ? "Pathao Prime Express" : "Steadfast Luxury Express",
        trackingNumber: generatedCode,
        consignmentId: generatedCode,
        trackingUrl:
          provider === "pathao"
            ? `https://merchant.pathao.com/tracking?consignment_id=${generatedCode}`
            : `https://steadfast.com.bd/t/${generatedCode}`,
        estimatedDelivery: /dhaka/i.test(String(customer.district || ""))
          ? "Within 24 Hours"
          : "Within 48-72 Hours",
        bookedAt: new Date().toISOString(),
        bookingStatus: "sandbox_booked",
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Courier booking error." });
  }
});

// Admin-Only Automated Google Sheets Order Sync & Export
app.post("/api/integrations/google-sheets/sync", async (req, res) => {
  const adminAuth = await verifyAdminBearerToken(req);
  if ("status" in adminAuth) {
    res.status(adminAuth.status).json({ error: adminAuth.error });
    return;
  }

  try {
    const orders: any[] = Array.isArray(req.body?.orders) ? req.body.orders : [];
    const webhookUrl = String(
      req.body?.webhookUrl || runtimeLogisticsConfig.googleSheetsWebhookUrl || ""
    ).trim();

    const rows = orders.map((o) => ({
      orderId: o.id,
      date: o.createdAt || new Date().toISOString(),
      sourceChannel: o.sourceChannel || "luxora_web",
      customerName: o.customer?.name || "Guest",
      phone: o.customer?.phone || "",
      district: o.customer?.district || "",
      address: o.customer?.shippingAddress || "",
      items: Array.isArray(o.items)
        ? o.items.map((it: any) => `${it.nameEn} x${it.quantity}`).join("; ")
        : "",
      subtotal: Number(o.subtotal || 0),
      deliveryCharge: Number(o.deliveryCharge || 0),
      totalAmount: Number(o.totalAmount || 0),
      paymentMethod: o.paymentMethod || "cod",
      paymentStatus: o.paymentStatus || "pending",
      orderStatus: o.orderStatus || "Pending",
      courier: o.trackingInfo?.courier || "",
      trackingCode: o.trackingInfo?.trackingNumber || o.trackingInfo?.consignmentId || "",
    }));

    let pushedRemote = false;
    let remoteDetail = "Prepared Google Sheets CSV/TSV export payload.";

    if (webhookUrl && /^https?:\/\//i.test(webhookUrl)) {
      try {
        const hookRes = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheetName: runtimeLogisticsConfig.googleSheetName || "Luxora_BD_Orders",
            syncedAt: new Date().toISOString(),
            rows,
          }),
        });
        if (hookRes.ok) {
          pushedRemote = true;
          remoteDetail = `Pushed ${rows.length} order row(s) live to Google Sheets Webhook.`;
        } else {
          remoteDetail = `Google Sheets webhook returned HTTP ${hookRes.status}; CSV fallback ready.`;
        }
      } catch (err: any) {
        remoteDetail = `Google Sheets webhook unreachable (${err?.message || "network"}); CSV fallback ready.`;
      }
    }

    res.json({
      success: true,
      pushedRemote,
      detail: remoteDetail,
      rowCount: rows.length,
      rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to sync orders to Google Sheets." });
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

  if (q.includes('contact') || q.includes('phone') || q.includes('hotline') || q.includes('address') || q.includes('email') || q.includes('ঠিকানা') || q.includes('ফোন') || q.includes('যোগাযোগ') || q.includes('হটলাইন') || q.includes('অফিস')) {
    if (isBn) {
      return `**লুক্সোরা বিডি অফিশিয়াল যোগাযোগ তথ্য:**
- 📞 **হটলাইন / ফোন:** ০১৮৭১৬৯৩০৫০
- 💬 **হোয়াটসঅ্যাপ:** ০১৮৭১৬৯৩০৫০
- ✉️ **ইমেইল:** mdisrafilh320@gmail.com
- 📍 **অফিস ঠিকানা:** ভোলা সদর, ভোলা, বাংলাদেশ
- ⏰ **সেবার সময়:** প্রতিদিন সকাল ১০:০০ - রাত ১০:০০`;
    }
    return `**Luxora BD Official Business Details:**
- 📞 **Phone / Hotline:** 01871693050
- 💬 **WhatsApp:** 01871693050
- ✉️ **Email:** mdisrafilh320@gmail.com
- 📍 **Address:** Bhola Sadar, Bhola, বাংলাদেশ
- ⏰ **Working Hours:** Every day: 10:00 AM - 10:00 PM`;
  }

  if (isBn) {
    return `আসসালামু আলাইকুম! আমি লুক্সোরা এআই অ্যাসিস্ট্যান্ট। 

আমি আপনাকে প্রোডাক্টের তথ্য, ডেলিভারি চার্জ, বিকাশ/নগদ পেমেন্ট প্রসেস, অর্ডার ট্র্যাকিং এবং ওয়ারেন্টি পলিসি সম্পর্কে সহায়তা করতে পারি। আপনি কি নির্দিষ্ট কোনো গ্যাজেট বা তথ্য খুঁজছেন?`;
  }
  return `Welcome to Luxora BD Concierge! 

I can assist you with product specifications, nationwide delivery rates (Dhaka ৳70, Nationwide ৳120, Free above ৳5,000), bKash/Nagad payments, real-time courier tracking, and our 7-day replacement warranty. How may I assist you today?`;
}

// Intelligent Rule-Based Product Notes Parser Fallback
function parseRawProductNotesFallback(
  rawNotes: string,
  availableCategories: Array<{ slug: string; nameEn: string; nameBn: string }>,
  _language: string
) {
  const lines = rawNotes
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*•\u2022]\s*/, "").trim())
    .filter(Boolean);

  const firstLine = lines[0] || rawNotes.trim().slice(0, 80);
  const cleanedTitle = firstLine
    .replace(/^(title|name|product)\s*[:\-]\s*/i, "")
    .replace(/\b(price|tk|bdt|৳|mrp|msrp)\s*[:\-]?\s*[\d,]+/gi, "")
    .trim();

  const knownBrands = [
    "Apple", "Sony", "Samsung", "Bang & Olufsen", "B&O", "Bose", "Anker",
    "Marshall", "Sennheiser", "Garmin", "Devialet", "Belkin", "Nomad",
    "Satechi", "Logitech", "Keychron", "JBL", "Beats", "DJI", "Leica",
    "Rolex", "Omega", "Tissot", "Seiko", "Casio", "Nothing", "Xiaomi",
  ];
  const lowerAll = rawNotes.toLowerCase();
  const detectedBrand =
    knownBrands.find((b) => lowerAll.includes(b.toLowerCase())) ||
    cleanedTitle.split(/\s+/)[0] ||
    "Luxora Prime";

  // Extract Price & MSRP
  const priceMatch = rawNotes.match(/(?:price|offer|sale|tk|bdt|৳)\s*[:\-]?\s*([\d,]{3,7})/i);
  const msrpMatch = rawNotes.match(/(?:msrp|mrp|original|old|regular)\s*[:\-]?\s*(?:৳|tk|bdt)?\s*([\d,]{3,7})/i);
  const stockMatch = rawNotes.match(/(?:stock|qty|quantity|units?)\s*[:\-]?\s*(\d{1,5})/i);

  const suggestedPrice = priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : 0;
  const suggestedOriginalPrice = msrpMatch ? Number(msrpMatch[1].replace(/,/g, "")) : 0;
  const suggestedStockCount = stockMatch ? Number(stockMatch[1]) : 0;
  const freeDelivery = /free\s*(delivery|shipping)|ফ্রি\s*ডেলিভারি/i.test(rawNotes);

  // Category matching against dynamic storefront categories
  const categoryKeywords: Record<string, string[]> = {
    audio: ["headphone", "earbud", "earphone", "airpods", "speaker", "anc", "bluetooth audio", "soundbar", "hi-fi", "wh-1000", "bose", "jbl", "marshall", "devialet"],
    wearables: ["watch", "smartwatch", "band", "fitness", "garmin", "amoled", "strap", "heart rate"],
    gadgets: ["charger", "powerbank", "power bank", "hub", "cable", "magsafe", "keyboard", "mouse", "camera", "drone", "gimbal", "gan", "usb-c"],
    fashion: ["bag", "wallet", "leather", "sunglass", "perfume", "apparel", "jacket", "shoe", "belt"],
    luxury: ["luxury", "titanium", "edition", "limited", "gold", "bespoke", "crafted"],
    "free-delivery": ["free delivery", "free shipping"],
  };

  let suggestedCategory = availableCategories[0]?.slug || "gadgets";
  for (const cat of availableCategories) {
    const slugLower = cat.slug.toLowerCase();
    if (lowerAll.includes(slugLower) || lowerAll.includes(cat.nameEn.toLowerCase())) {
      suggestedCategory = cat.slug;
      break;
    }
    const keywords = categoryKeywords[slugLower] || [];
    if (keywords.some((kw) => lowerAll.includes(kw))) {
      suggestedCategory = cat.slug;
      break;
    }
  }

  // Extract specification bullet points from remaining lines / comma-separated tokens
  const specCandidates: string[] = [];
  const remainingLines = lines.slice(1);
  for (const line of remainingLines) {
    if (/^(price|mrp|msrp|original|stock|qty)\s*[:\-]/i.test(line)) continue;
    if (line.includes(",") && !line.includes(":")) {
      line.split(",").map((p) => p.trim()).filter(Boolean).forEach((p) => specCandidates.push(p));
    } else {
      specCandidates.push(line);
    }
  }

  if (specCandidates.length === 0 && rawNotes.includes(",")) {
    rawNotes.split(",").slice(1).map((p) => p.trim()).filter(Boolean).forEach((p) => specCandidates.push(p));
  }

  const specs = specCandidates.slice(0, 8).map((item, idx) => {
    const colonIdx = item.indexOf(":");
    if (colonIdx > 1 && colonIdx < 35) {
      const label = item.slice(0, colonIdx).trim();
      const val = item.slice(colonIdx + 1).trim();
      return {
        labelEn: label,
        labelBn: label,
        valueEn: val || label,
        valueBn: val || label,
      };
    }
    return {
      labelEn: `Highlight ${idx + 1}`,
      labelBn: `বৈশিষ্ট্য ${idx + 1}`,
      valueEn: item,
      valueBn: item,
    };
  });

  if (specs.length === 0) {
    specs.push(
      { labelEn: "Brand", labelBn: "ব্র্যান্ড", valueEn: detectedBrand, valueBn: detectedBrand },
      { labelEn: "Authenticity", labelBn: "নিশ্চয়তা", valueEn: "100% Original Sealed Unit", valueBn: "১০০% অরিজিনাল সিল্ড প্যাক" }
    );
  }

  const bulletLinesEn = specs.map((s) => `• ${s.labelEn}: ${s.valueEn}`).join("\n");
  const bulletLinesBn = specs.map((s) => `• ${s.labelBn}: ${s.valueBn}`).join("\n");

  const nameEn = cleanedTitle || "Luxora Curated Flagship Edition";
  const nameBn = `${nameEn} (অফিশিয়াল এডিশন)`;

  return {
    nameEn,
    nameBn,
    taglineEn: `${detectedBrand} Signature Precision Craftsmanship`,
    taglineBn: `${detectedBrand} প্রিমিয়াম কালেকশন`,
    brand: detectedBrand,
    suggestedCategory,
    descriptionEn: `Experience refined performance and enduring build quality with the ${nameEn} by ${detectedBrand}. Curated exclusively for discerning collectors in Bangladesh with verified authenticity and official warranty coverage.\n\nKey Specifications:\n${bulletLinesEn}`,
    descriptionBn: `${detectedBrand}-এর অসাধারণ ডিজাইন ও প্রিমিয়াম পারফরম্যান্স সমৃদ্ধ ${nameEn}। ১০০% অরিজিনাল নিশ্চয়তা ও অফিশিয়াল ওয়ারেন্টিসহ এখন লাক্সোরা বিডি-তে উপলব্ধ।\n\nমূল বৈশিষ্ট্যসমূহ:\n${bulletLinesBn}`,
    specs,
    suggestedPrice,
    suggestedOriginalPrice,
    suggestedStockCount,
    freeDelivery,
    warrantyEn: "2 Years Official Luxora Bangladesh Warranty",
    suggestedBadge: /limited|edition/i.test(rawNotes) ? "limited" : /best|top|flagship/i.test(rawNotes) ? "bestseller" : "new",
  };
}

// Start Server with Vite Middleware & Dynamic Product OpenGraph Preview Support
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    // Inject dynamic Open Graph tags for shared product deep links (/product/:id or /?product=:id)
    app.get(["/product/:productId", "/"], async (req, res, next) => {
      const requestedProductId =
        (req.params as any)?.productId ||
        (typeof req.query.product === "string" ? req.query.product : "");
      if (!requestedProductId || !String(requestedProductId).trim()) {
        return next();
      }
      try {
        const indexPath = path.resolve(process.cwd(), "index.html");
        const rawHtml = fs.readFileSync(indexPath, "utf-8");
        const transformedHtml = await vite.transformIndexHtml(req.originalUrl, rawHtml);
        const product = await fetchProductForOpenGraph(String(requestedProductId).trim());
        const finalHtml = injectProductOpenGraphIntoHtml(transformedHtml, product, req);
        res.status(200).set({ "Content-Type": "text/html" }).end(finalHtml);
      } catch (err) {
        console.warn("Dev OG injection fallback:", err);
        next();
      }
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    // Handle /product/:productId and /?product=:productId before static file serving
    app.get(["/product/:productId", "/"], async (req, res, next) => {
      const requestedProductId =
        (req.params as any)?.productId ||
        (typeof req.query.product === "string" ? req.query.product : "");
      if (!requestedProductId || !String(requestedProductId).trim()) {
        return next();
      }
      try {
        const indexFile = path.join(distPath, "index.html");
        const rawHtml = fs.readFileSync(indexFile, "utf-8");
        const product = await fetchProductForOpenGraph(String(requestedProductId).trim());
        const finalHtml = injectProductOpenGraphIntoHtml(rawHtml, product, req);
        res.status(200).set({ "Content-Type": "text/html" }).send(finalHtml);
      } catch (err) {
        console.warn("Prod OG injection fallback:", err);
        next();
      }
    });

    app.use(express.static(distPath));
    app.get("*", async (req, res) => {
      const indexFile = path.join(distPath, "index.html");
      const pathMatch = req.path.match(/^\/product\/([^/?#]+)/i);
      const requestedProductId =
        (pathMatch && pathMatch[1] ? decodeURIComponent(pathMatch[1]) : "") ||
        (typeof req.query.product === "string" ? req.query.product : "");

      if (requestedProductId && requestedProductId.trim()) {
        try {
          const rawHtml = fs.readFileSync(indexFile, "utf-8");
          const product = await fetchProductForOpenGraph(requestedProductId.trim());
          const finalHtml = injectProductOpenGraphIntoHtml(rawHtml, product, req);
          res.status(200).set({ "Content-Type": "text/html" }).send(finalHtml);
          return;
        } catch (err) {
          console.warn("Prod OG injection fallback:", err);
        }
      }
      res.sendFile(indexFile);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Luxora BD Full-Stack Server running on http://localhost:${PORT}`);
  });
}

startServer();
