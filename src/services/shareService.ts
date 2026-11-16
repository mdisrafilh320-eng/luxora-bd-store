import { Product, Language } from '../types';
import { formatBDT } from '../translations';

export const DEFAULT_STORE_TITLE = 'Luxora BD — Minimalist Luxury Gadgets & Lifestyle';
export const DEFAULT_STORE_DESCRIPTION =
  'Clean, trustworthy, modern black & gold luxury gadget store in Bangladesh. 100% authentic products with Cash on Delivery.';

/**
 * Generate the canonical deep-link URL for any product.
 * Supports direct sharing across Facebook, Messenger, WhatsApp, Instagram, TikTok, and SMS.
 */
export function getProductShareUrl(productId: string): string {
  if (typeof window === 'undefined') {
    return `/product/${encodeURIComponent(productId)}`;
  }
  const cleanId = encodeURIComponent(String(productId || '').trim());
  return `${window.location.origin}/product/${cleanId}`;
}

/**
 * Resolve product ID from any supported deep-link URL pattern:
 * - /product/{productId}
 * - ?product={productId}
 * - #product/{productId} or #/product/{productId}
 */
export function extractProductIdFromUrl(loc?: {
  pathname?: string;
  search?: string;
  hash?: string;
}): string | null {
  try {
    const pathname = loc?.pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
    const search = loc?.search ?? (typeof window !== 'undefined' ? window.location.search : '');
    const hash = loc?.hash ?? (typeof window !== 'undefined' ? window.location.hash : '');

    // 1. Clean path: /product/:productId
    const pathMatch = pathname.match(/^\/product\/([^/?#]+)\/?$/i);
    if (pathMatch && pathMatch[1]) {
      return decodeURIComponent(pathMatch[1]).trim() || null;
    }

    // 2. Query param: ?product=:productId
    const params = new URLSearchParams(search);
    const queryProd = params.get('product');
    if (queryProd && queryProd.trim()) {
      return queryProd.trim();
    }

    // 3. Hash route fallback: #product/:productId or #/product/:productId
    const hashMatch = hash.match(/^#\/?product\/([^/?#]+)\/?$/i);
    if (hashMatch && hashMatch[1]) {
      return decodeURIComponent(hashMatch[1]).trim() || null;
    }

    return null;
  } catch {
    return null;
  }
}

function upsertMetaTag(attrName: 'property' | 'name', attrValue: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrValue}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMetaTag(attrName: 'property' | 'name', attrValue: string): void {
  if (typeof document === 'undefined') return;
  const el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (el) el.remove();
}

function upsertCanonicalLink(href: string): void {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function resolveProductOgImageUrl(product: Product): { url: string; mimeType?: string } {
  const raw = (product.image || product.gallery?.[0] || '').trim();
  if (!raw) return { url: '' };
  if (/^https?:\/\//i.test(raw)) return { url: raw };
  if (raw.startsWith('data:image/')) {
    const mimeMatch = raw.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/i);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return {
      url: `${origin}/api/og-image/${encodeURIComponent(product.id)}`,
      mimeType: mimeMatch?.[1]?.toLowerCase() || 'image/webp',
    };
  }
  if (typeof window !== 'undefined' && raw.startsWith('/')) {
    return { url: `${window.location.origin}${raw}` };
  }
  return { url: '' };
}

/**
 * Dynamically update <title>, Open Graph tags (og:title, og:description, og:image, og:url),
 * Twitter Cards, canonical URL, and Schema.org Product JSON-LD when viewing or sharing a product.
 * Pass `null` to restore the default Luxora BD storefront metadata.
 */
export function updateProductOpenGraphMeta(product: Product | null, language: Language = 'en'): void {
  if (typeof document === 'undefined') return;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  if (!product) {
    document.title = DEFAULT_STORE_TITLE;
    upsertMetaTag('name', 'description', DEFAULT_STORE_DESCRIPTION);
    upsertMetaTag('property', 'og:type', 'website');
    upsertMetaTag('property', 'og:site_name', 'Luxora BD');
    upsertMetaTag('property', 'og:title', DEFAULT_STORE_TITLE);
    upsertMetaTag('property', 'og:description', DEFAULT_STORE_DESCRIPTION);
    upsertMetaTag('property', 'og:url', origin ? `${origin}/` : '/');
    removeMetaTag('property', 'og:image');
    removeMetaTag('property', 'og:image:type');
    removeMetaTag('property', 'og:image:alt');
    removeMetaTag('property', 'product:price:amount');
    removeMetaTag('property', 'product:price:currency');

    upsertMetaTag('name', 'twitter:card', 'summary_large_image');
    upsertMetaTag('name', 'twitter:title', DEFAULT_STORE_TITLE);
    upsertMetaTag('name', 'twitter:description', DEFAULT_STORE_DESCRIPTION);
    removeMetaTag('name', 'twitter:image');

    upsertCanonicalLink(origin ? `${origin}/` : '/');

    const existingJsonLd = document.getElementById('luxora-product-jsonld');
    if (existingJsonLd) existingJsonLd.remove();
    return;
  }

  const title =
    language === 'bn'
      ? product.nameBn || product.nameEn
      : product.nameEn || product.nameBn;
  const priceText = formatBDT(product.price, language);
  const ogTitle = `${title} — ${priceText} | Luxora BD`;

  const hasDiscount = Boolean(product.originalPrice && product.originalPrice > product.price);
  const msrpText = hasDiscount ? ` (MSRP ${formatBDT(product.originalPrice!, language)})` : '';
  const summaryBody =
    (language === 'bn'
      ? product.taglineBn || product.descriptionBn || product.taglineEn || product.descriptionEn
      : product.taglineEn || product.descriptionEn || product.taglineBn || product.descriptionBn
    )
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 140);

  const ogDescription = `${priceText}${msrpText} · ${summaryBody || '100% Authentic Luxury Collection — Fast Cash on Delivery Across Bangladesh.'}`;
  const resolvedImg = resolveProductOgImageUrl(product);
  const ogImage = resolvedImg.url;
  const ogUrl = getProductShareUrl(product.id);

  document.title = ogTitle;
  upsertMetaTag('name', 'description', ogDescription);
  upsertMetaTag('property', 'og:type', 'product');
  upsertMetaTag('property', 'og:site_name', 'Luxora BD');
  upsertMetaTag('property', 'og:title', ogTitle);
  upsertMetaTag('property', 'og:description', ogDescription);
  upsertMetaTag('property', 'og:url', ogUrl);
  if (ogImage) {
    upsertMetaTag('property', 'og:image', ogImage);
    upsertMetaTag('property', 'og:image:alt', title);
    if (resolvedImg.mimeType) {
      upsertMetaTag('property', 'og:image:type', resolvedImg.mimeType);
    } else {
      removeMetaTag('property', 'og:image:type');
    }
  } else {
    removeMetaTag('property', 'og:image');
    removeMetaTag('property', 'og:image:type');
    removeMetaTag('property', 'og:image:alt');
  }
  upsertMetaTag('property', 'product:price:amount', String(product.price));
  upsertMetaTag('property', 'product:price:currency', 'BDT');

  upsertMetaTag('name', 'twitter:card', 'summary_large_image');
  upsertMetaTag('name', 'twitter:title', ogTitle);
  upsertMetaTag('name', 'twitter:description', ogDescription);
  if (ogImage) {
    upsertMetaTag('name', 'twitter:image', ogImage);
  } else {
    removeMetaTag('name', 'twitter:image');
  }

  upsertCanonicalLink(ogUrl);

  // Inject Schema.org Product JSON-LD snippet
  let jsonLdScript = document.getElementById('luxora-product-jsonld') as HTMLScriptElement | null;
  if (!jsonLdScript) {
    jsonLdScript = document.createElement('script');
    jsonLdScript.id = 'luxora-product-jsonld';
    jsonLdScript.type = 'application/ld+json';
    document.head.appendChild(jsonLdScript);
  }
  jsonLdScript.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.nameEn || product.nameBn,
    image: ogImage ? [ogImage] : undefined,
    description: ogDescription,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Luxora BD',
    },
    offers: {
      '@type': 'Offer',
      url: ogUrl,
      priceCurrency: 'BDT',
      price: String(product.price),
      availability:
        product.inStock && product.stockCount > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
    aggregateRating:
      product.rating && product.reviewsCount
        ? {
            '@type': 'AggregateRating',
            ratingValue: String(product.rating),
            reviewCount: String(product.reviewsCount),
          }
        : undefined,
  });
}

/**
 * Copy any text reliably to clipboard (works inside iframes and legacy browsers).
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to execCommand fallback
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Trigger the browser's native Web Share API (`navigator.share`).
 * Returns 'shared' | 'aborted' | 'unsupported'.
 */
export async function shareProductWithNativeAPI(
  product: Product,
  language: Language = 'en'
): Promise<'shared' | 'aborted' | 'unsupported'> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return 'unsupported';
  }

  const shareUrl = getProductShareUrl(product.id);
  const title =
    language === 'bn'
      ? product.nameBn || product.nameEn
      : product.nameEn || product.nameBn;
  const priceText = formatBDT(product.price, language);
  const shareText =
    language === 'bn'
      ? `${title} (${priceText}) — Luxora BD-তে দেখুন:`
      : `Check out ${title} (${priceText}) on Luxora BD:`;

  try {
    await navigator.share({
      title: `${title} — ${priceText} | Luxora BD`,
      text: shareText,
      url: shareUrl,
    });
    return 'shared';
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return 'aborted';
    }
    return 'unsupported';
  }
}

/**
 * Build direct web share intents for social platforms (desktop / non-native fallback).
 */
export function buildSocialShareLinks(product: Product, language: Language = 'en') {
  const url = getProductShareUrl(product.id);
  const title =
    language === 'bn'
      ? product.nameBn || product.nameEn
      : product.nameEn || product.nameBn;
  const priceText = formatBDT(product.price, language);
  const message = `${title} — ${priceText} | Luxora BD`;

  const encodedUrl = encodeURIComponent(url);
  const encodedMsgAndUrl = encodeURIComponent(`${message}\n${url}`);
  const encodedMsg = encodeURIComponent(message);

  return {
    url,
    whatsapp: `https://wa.me/?text=${encodedMsgAndUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMsg}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedMsg}`,
  };
}
