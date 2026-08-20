import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { PaymentSettings, MfsGatewayConfig, MfsAccountType } from '../types';

const SETTINGS_COLLECTION = 'settings';
const PAYMENT_SETTINGS_DOC = 'payment_gateways';

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  gateways: {
    bkash: {
      id: 'bkash',
      nameEn: 'bKash Wallet',
      nameBn: 'বিকাশ ওয়ালেট',
      accountNumber: '01711-234567',
      accountType: 'personal',
      isActive: true,
      ussdCode: '*247#',
      themeColor: '#E2136E',
      accentBg: 'rgba(226, 19, 110, 0.12)',
      iconText: 'bKash',
      sendMoneyOnly: true,
      trxIdFormatHint: '10 alphanumeric characters (e.g. BL94M8XZ21)',
      notesEn: 'Strictly Send Money to Personal Number. Do NOT use Merchant Payment or Cash Out.',
      notesBn: 'শুধুমাত্র পার্সোনাল নম্বরে সেন্ড মানি করুন। মার্চেন্ট পেমেন্ট বা ক্যাশ আউট প্রযোজ্য নয়।',
      instructionsEn: [
        'Open your bKash App or dial *247#',
        'Choose "Send Money" (সেন্ড মানি)',
        'Enter Luxora BD Number: {accountNumber}',
        'Enter exact amount: {amount}',
        'Enter Reference: LUXORA',
        'Enter your bKash PIN to confirm transfer',
        'Copy the 10-character Transaction ID (TrxID) and paste below'
      ],
      instructionsBn: [
        'আপনার বিকাশ অ্যাপ ওপেন করুন অথবা ডায়াল করুন *247#',
        '"সেন্ড মানি" (Send Money) অপশন নির্বাচন করুন',
        'লাক্সোরা বিডি নম্বর দিন: {accountNumber}',
        'নির্ধারিত টাকার পরিমাণ লিখুন: {amount}',
        'রেফারেন্স দিন: LUXORA',
        'বিকাশ পিন নম্বর দিয়ে সেন্ড মানি সম্পন্ন করুন',
        'প্রাপ্ত ১০ ডিজিটের TrxID নিচে পেস্ট করুন'
      ],
      updatedAt: new Date().toISOString(),
    },
    nagad: {
      id: 'nagad',
      nameEn: 'Nagad Wallet',
      nameBn: 'নগদ ওয়ালেট',
      accountNumber: '01811-345678',
      accountType: 'personal',
      isActive: true,
      ussdCode: '*167#',
      themeColor: '#F7931E',
      accentBg: 'rgba(247, 147, 30, 0.12)',
      iconText: 'Nagad',
      sendMoneyOnly: true,
      trxIdFormatHint: '8 alphanumeric characters (e.g. 7GA89NZ1)',
      notesEn: 'Strictly Send Money to Personal Number. Do NOT use Merchant Payment.',
      notesBn: 'শুধুমাত্র পার্সোনাল নম্বরে সেন্ড মানি করুন। মার্চেন্ট পেমেন্ট প্রযোজ্য নয়।',
      instructionsEn: [
        'Open Nagad App or dial *167#',
        'Select "Send Money" (সেন্ড মানি)',
        'Enter Luxora BD Number: {accountNumber}',
        'Enter the exact amount: {amount}',
        'Enter Reference: LUXORA',
        'Enter your Nagad PIN to confirm',
        'Copy the 8-character Transaction ID (TrxID) and submit below'
      ],
      instructionsBn: [
        'আপনার নগদ অ্যাপ ওপেন করুন অথবা ডায়াল করুন *167#',
        '"সেন্ড মানি" অপশনটি সিলেক্ট করুন',
        'লাক্সোরা বিডি নম্বর দিন: {accountNumber}',
        'নির্দিষ্ট টাকার পরিমাণ লিখুন: {amount}',
        'রেফারেন্স দিন: LUXORA',
        'নগদ পিন কোড দিয়ে সেন্ড মানি কনফার্ম করুন',
        'লেনদেনের ৮ ডিজিটের TrxID নিচে পেস্ট করুন'
      ],
      updatedAt: new Date().toISOString(),
    },
    rocket: {
      id: 'rocket',
      nameEn: 'Rocket (DBBL)',
      nameBn: 'রকেট (ডাচ বাংলা)',
      accountNumber: '01911-456789-5',
      accountType: 'personal',
      isActive: true,
      ussdCode: '*322#',
      themeColor: '#8C3494',
      accentBg: 'rgba(140, 52, 148, 0.12)',
      iconText: 'Rocket',
      sendMoneyOnly: true,
      trxIdFormatHint: '10 alphanumeric characters (e.g. RK98234710)',
      notesEn: 'Strictly Send Money to 12-digit Personal Rocket Account.',
      notesBn: '১২ ডিজিটের পার্সোনাল রকেট নম্বরে শুধুমাত্র সেন্ড মানি করুন।',
      instructionsEn: [
        'Open Rocket App or dial *322#',
        'Select "Send Money" (সেন্ড মানি)',
        'Enter 12-digit Rocket Number: {accountNumber}',
        'Enter the payable amount: {amount}',
        'Enter your Rocket PIN to finalize',
        'Paste the Transaction ID (TxnId) in the box below'
      ],
      instructionsBn: [
        'আপনার রকেট অ্যাপ খুলুন অথবা ডায়াল করুন *322#',
        '"সেন্ড মানি" অপশন নির্বাচন করুন',
        '১২ ডিজিটের রকেট নম্বর দিন: {accountNumber}',
        'টাকার পরিমাণ প্রবেশ করান: {amount}',
        'রকেট পিন দিয়ে লেনদেন সম্পন্ন করুন',
        'প্রাপ্ত Transaction ID নিচে সাবমিট করুন'
      ],
      updatedAt: new Date().toISOString(),
    },
  },
  sendMoneyStrictRule: true,
  partialAdvanceAmount: 200,
  allowFullPayment: true,
  allowPartialAdvance: true,
  allowCod: true,
  updatedAt: new Date().toISOString(),
};

/**
 * Fetch current Payment Gateway settings from Firestore
 */
export async function getPaymentSettings(): Promise<PaymentSettings> {
  const path = `${SETTINGS_COLLECTION}/${PAYMENT_SETTINGS_DOC}`;
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, PAYMENT_SETTINGS_DOC);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as Partial<PaymentSettings>;
      return {
        ...DEFAULT_PAYMENT_SETTINGS,
        ...data,
        gateways: {
          bkash: { ...DEFAULT_PAYMENT_SETTINGS.gateways.bkash, ...(data.gateways?.bkash || {}) },
          nagad: { ...DEFAULT_PAYMENT_SETTINGS.gateways.nagad, ...(data.gateways?.nagad || {}) },
          rocket: { ...DEFAULT_PAYMENT_SETTINGS.gateways.rocket, ...(data.gateways?.rocket || {}) },
        },
      };
    }

    // Document doesn't exist yet in Firestore, save initial defaults
    try {
      await setDoc(docRef, DEFAULT_PAYMENT_SETTINGS);
    } catch (saveErr) {
      console.warn('Initial payment settings seeding skipped:', saveErr);
    }

    return DEFAULT_PAYMENT_SETTINGS;
  } catch (error) {
    console.warn('Failed to get payment settings from Firestore, using local defaults:', error);
    return DEFAULT_PAYMENT_SETTINGS;
  }
}

/**
 * Persist full Payment Gateway settings to Firestore
 */
export async function savePaymentSettings(settings: PaymentSettings, adminEmail?: string): Promise<PaymentSettings> {
  const path = `${SETTINGS_COLLECTION}/${PAYMENT_SETTINGS_DOC}`;
  const updatedSettings: PaymentSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedBy: adminEmail || 'Admin',
  };

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, PAYMENT_SETTINGS_DOC);
    await setDoc(docRef, updatedSettings);
    return updatedSettings;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Update a single MFS gateway's number, active status, or account type
 */
export async function updateGatewayConfig(
  gatewayId: 'bkash' | 'nagad' | 'rocket',
  updates: Partial<MfsGatewayConfig>,
  adminEmail?: string
): Promise<PaymentSettings> {
  const currentSettings = await getPaymentSettings();
  const updatedGateways = {
    ...currentSettings.gateways,
    [gatewayId]: {
      ...currentSettings.gateways[gatewayId],
      ...updates,
      updatedAt: new Date().toISOString(),
    },
  };

  const newSettings: PaymentSettings = {
    ...currentSettings,
    gateways: updatedGateways,
    updatedAt: new Date().toISOString(),
    updatedBy: adminEmail || 'Admin',
  };

  return await savePaymentSettings(newSettings, adminEmail);
}

/**
 * Real-time subscription to payment settings in Firestore
 */
export function subscribeToPaymentSettings(
  onUpdate: (settings: PaymentSettings) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const path = `${SETTINGS_COLLECTION}/${PAYMENT_SETTINGS_DOC}`;
  const docRef = doc(db, SETTINGS_COLLECTION, PAYMENT_SETTINGS_DOC);

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<PaymentSettings>;
        const merged: PaymentSettings = {
          ...DEFAULT_PAYMENT_SETTINGS,
          ...data,
          gateways: {
            bkash: { ...DEFAULT_PAYMENT_SETTINGS.gateways.bkash, ...(data.gateways?.bkash || {}) },
            nagad: { ...DEFAULT_PAYMENT_SETTINGS.gateways.nagad, ...(data.gateways?.nagad || {}) },
            rocket: { ...DEFAULT_PAYMENT_SETTINGS.gateways.rocket, ...(data.gateways?.rocket || {}) },
          },
        };
        onUpdate(merged);
      } else {
        onUpdate(DEFAULT_PAYMENT_SETTINGS);
      }
    },
    (error) => {
      console.warn('Real-time payment settings snapshot error:', error);
      if (onError) {
        onError(error);
      }
    }
  );
}

export const paymentService = {
  getPaymentSettings,
  savePaymentSettings,
  updateGatewayConfig,
  subscribeToPaymentSettings,
  DEFAULT_PAYMENT_SETTINGS,
};
