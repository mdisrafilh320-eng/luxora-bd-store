/**
 * Luxora BD - Enterprise Security & Data Sanitization Architecture
 * Provides input hygiene, XSS mitigation, boundary checks, and cryptographic-safe validators.
 */

/**
 * Strips script tags, HTML tags, JavaScript pseudo-protocols, and unsafe characters
 */
export function sanitizeInput(input: string | undefined | null): string {
  if (!input) return '';
  
  return String(input)
    // Remove HTML tags
    .replace(/<[^>]*>?/gm, '')
    // Remove javascript: and data: URIs
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    // Remove null bytes and dangerous control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Escapes characters for safe HTML display
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates a Bangladeshi mobile phone number (e.g. 01711234567, +8801711234567, 8801812345678)
 */
export function validateBangladeshiPhone(phone: string): { isValid: boolean; normalized: string; operator?: string } {
  if (!phone) return { isValid: false, normalized: '' };
  
  // Strip all non-digits except leading +
  let cleaned = phone.trim().replace(/[\s\-()]/g, '');
  
  // Convert +880 or 880 prefix to standard 01...
  if (cleaned.startsWith('+880')) {
    cleaned = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('880')) {
    cleaned = '0' + cleaned.substring(3);
  }

  // Check standard BD pattern: 01[3-9]XXXXXXXX (11 digits)
  const bdPhoneRegex = /^01[3-9]\d{8}$/;
  const isValid = bdPhoneRegex.test(cleaned);

  let operator: string | undefined = undefined;
  if (isValid) {
    const prefix = cleaned.substring(0, 3);
    if (prefix === '017' || prefix === '013') operator = 'Grameenphone';
    else if (prefix === '018') operator = 'Robi';
    else if (prefix === '019' || prefix === '014') operator = 'Banglalink';
    else if (prefix === '015') operator = 'Teletalk';
    else if (prefix === '016') operator = 'Airtel';
  }

  return {
    isValid,
    normalized: cleaned,
    operator,
  };
}

/**
 * Validates Mobile Financial Service Transaction ID (bKash / Nagad / Rocket)
 * Typically 8 to 14 uppercase alphanumeric characters (e.g. BK8921820X, NAG7819234)
 */
export function validateMfsTransactionId(trxId: string): { isValid: boolean; cleaned: string } {
  if (!trxId) return { isValid: false, cleaned: '' };
  
  const cleaned = trxId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Valid TrxIDs must be 8-16 alphanumeric characters
  const isValid = cleaned.length >= 8 && cleaned.length <= 16;
  
  return { isValid, cleaned };
}

/**
 * Validates Order ID format (e.g. LUX-892014)
 */
export function validateOrderId(orderId: string): boolean {
  if (!orderId) return false;
  const upper = orderId.trim().toUpperCase();
  return /^LUX-[0-9]{5,8}$/.test(upper);
}

/**
 * Validates monetary amounts with realistic boundary guards
 */
export function validateMonetaryAmount(amount: number, min: number = 1, max: number = 5000000): boolean {
  return typeof amount === 'number' && !isNaN(amount) && isFinite(amount) && amount >= min && amount <= max;
}

/**
 * Client-Side Rate Limiter for sensitive actions (Payment verify, Auth attempts, Admin updates)
 */
class ClientRateLimiter {
  private attempts: Map<string, { count: number; lastReset: number }> = new Map();

  public check(actionKey: string, maxAttempts: number = 5, windowMs: number = 30000): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const record = this.attempts.get(actionKey) || { count: 0, lastReset: now };

    if (now - record.lastReset > windowMs) {
      record.count = 1;
      record.lastReset = now;
      this.attempts.set(actionKey, record);
      return { allowed: true, remaining: maxAttempts - 1 };
    }

    if (record.count >= maxAttempts) {
      return { allowed: false, remaining: 0 };
    }

    record.count += 1;
    this.attempts.set(actionKey, record);
    return { allowed: true, remaining: maxAttempts - record.count };
  }

  public reset(actionKey: string): void {
    this.attempts.delete(actionKey);
  }
}

export const rateLimiter = new ClientRateLimiter();
