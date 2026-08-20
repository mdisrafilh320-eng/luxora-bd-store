export interface MfsGateway {
  id: 'bkash' | 'nagad' | 'rocket';
  nameEn: string;
  nameBn: string;
  accountTypeEn: string;
  accountTypeBn: string;
  accountNumber: string;
  ussdCode: string;
  themeColor: string;
  accentBg: string;
  iconText: string;
  instructionsEn: string[];
  instructionsBn: string[];
  trxIdFormatHint: string;
  logoBadgeUrl?: string;
}

export const MFS_GATEWAYS: Record<'bkash' | 'nagad' | 'rocket', MfsGateway> = {
  bkash: {
    id: 'bkash',
    nameEn: 'bKash Merchant / Personal',
    nameBn: 'বিকাশ পেমেন্ট / সেন্ড মানি',
    accountTypeEn: 'Merchant & Personal (Send Money / Make Payment)',
    accountTypeBn: 'মার্চেন্ট ও পার্সোনাল (সেন্ড মানি / মেক পেমেন্ট)',
    accountNumber: '01711-234567',
    ussdCode: '*247#',
    themeColor: '#E2136E',
    accentBg: 'rgba(226, 19, 110, 0.12)',
    iconText: 'bKash',
    trxIdFormatHint: '10 digits alphanumeric (e.g. BL94M8XZ21)',
    instructionsEn: [
      'Open your bKash App or dial *247#',
      'Choose "Send Money" or "Make Payment"',
      'Enter Luxora BD VIP Number: 01711-234567',
      'Enter the exact amount (Full or Partial Advance)',
      'Enter Reference: LUXORA',
      'Enter your Secret PIN to confirm transaction',
      'Copy the 10-character Transaction ID (TrxID) and paste below',
    ],
    instructionsBn: [
      'আপনার বিকাশ অ্যাপ খুলুন অথবা ডায়াল করুন *247#',
      '"সেন্ড মানি" বা "পেমেন্ট" অপশন বেছে নিন',
      'লাক্সোরা বিডি ভিআইপি নম্বর লিখুন: 01711-234567',
      'নির্ধারিত টাকার পরিমাণ লিখুন (সম্পূর্ণ বা অগ্রিম ডেলিভারি চার্জ)',
      'রেফারেন্স দিন: LUXORA',
      'আপনার গোপন পিন দিয়ে লেনদেন সম্পন্ন করুন',
      'মেসেজ থেকে ১০ ডিজিটের Transaction ID (TrxID) কপি করে নিচে বসান',
    ],
  },
  nagad: {
    id: 'nagad',
    nameEn: 'Nagad Wallet',
    nameBn: 'নগদ ওয়ালেট',
    accountTypeEn: 'Merchant & Personal (Send Money)',
    accountTypeBn: 'মার্চেন্ট ও পার্সোনাল (সেন্ড মানি)',
    accountNumber: '01811-345678',
    ussdCode: '*167#',
    themeColor: '#F7931E',
    accentBg: 'rgba(247, 147, 30, 0.12)',
    iconText: 'Nagad',
    trxIdFormatHint: '8 digits alphanumeric (e.g. 7GA89NZ1)',
    instructionsEn: [
      'Open your Nagad App or dial *167#',
      'Select "Send Money"',
      'Enter Luxora BD VIP Number: 01811-345678',
      'Enter the exact payable amount',
      'Enter Reference: LUXORA',
      'Enter your Nagad PIN to confirm',
      'Copy the 8-character Transaction ID (TrxID) and submit below',
    ],
    instructionsBn: [
      'আপনার নগদ অ্যাপ ওপেন করুন অথবা ডায়াল করুন *167#',
      '"সেন্ড মানি" অপশনটি সিলেক্ট করুন',
      'লাক্সোরা বিডি নম্বর প্রদান করুন: 01811-345678',
      'নির্দিষ্ট টাকার পরিমাণ লিখুন',
      'রেফারেন্স দিন: LUXORA',
      'নগদ পিন কোড দিয়ে সেন্ড মানি কনফার্ম করুন',
      'লেনদেনের ৮ ডিজিটের TrxID নিচে পেস্ট করুন',
    ],
  },
  rocket: {
    id: 'rocket',
    nameEn: 'Rocket (DBBL)',
    nameBn: 'রকেট (ডাচ বাংলা)',
    accountTypeEn: 'Personal Wallet (Send Money)',
    accountTypeBn: 'পার্সোনাল ওয়ালেট (সেন্ড মানি)',
    accountNumber: '01911-456789-5',
    ussdCode: '*322#',
    themeColor: '#8C3494',
    accentBg: 'rgba(140, 52, 148, 0.12)',
    iconText: 'Rocket',
    trxIdFormatHint: '10 digits alphanumeric (e.g. RK98234710)',
    instructionsEn: [
      'Open your Rocket App or dial *322#',
      'Select "Send Money"',
      'Enter Rocket 12-digit number: 01911-456789-5',
      'Enter the specified amount',
      'Enter your Rocket PIN to finalize',
      'Paste the Transaction ID (TxnId) in the box below',
    ],
    instructionsBn: [
      'আপনার রকেট অ্যাপ খুলুন অথবা ডায়াল করুন *322#',
      '"সেন্ড মানি" অপশন নির্বাচন করুন',
      'রকেট নম্বর দিন: 01911-456789-5',
      'টাকার পরিমাণ প্রবেশ করান',
      'রকেট পিন দিয়ে লেনদেন সফল করুন',
      'প্রাপ্ত Transaction ID নিচে সাবমিট করুন',
    ],
  },
};

export const PROMO_CODES: Record<string, { code: string; discountPercent?: number; flatDiscount?: number; minOrder: number; descriptionEn: string; descriptionBn: string }> = {
  LUXORA10: {
    code: 'LUXORA10',
    discountPercent: 10,
    minOrder: 3000,
    descriptionEn: '10% Luxury Privileged Discount (up to ৳2,000)',
    descriptionBn: '১০% লাক্সারি বিশেষ ছাড় (সর্বোচ্চ ২,০০০ টাকা)',
  },
  LUXE500: {
    code: 'LUXE500',
    flatDiscount: 500,
    minOrder: 4000,
    descriptionEn: '৳500 Instant Welcome Voucher',
    descriptionBn: '৫০০ টাকা তাৎক্ষণিক ভাউচার',
  },
  VIPFREESHIP: {
    code: 'VIPFREESHIP',
    flatDiscount: 150,
    minOrder: 2000,
    descriptionEn: '100% Free Nationwide Express Shipping',
    descriptionBn: 'সম্পূর্ণ ফ্রি এক্সপ্রেস ডেলিভারি',
  },
};
