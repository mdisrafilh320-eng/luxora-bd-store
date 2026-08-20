export interface DistrictInfo {
  id: string;
  nameEn: string;
  nameBn: string;
  division: string;
  isDhakaCity: boolean;
  deliveryTimeEn: string;
  deliveryTimeBn: string;
}

export interface DivisionInfo {
  id: string;
  nameEn: string;
  nameBn: string;
}

export const BD_DIVISIONS: DivisionInfo[] = [
  { id: 'dhaka', nameEn: 'Dhaka', nameBn: 'ঢাকা' },
  { id: 'chittagong', nameEn: 'Chattogram', nameBn: 'চট্টগ্রাম' },
  { id: 'sylhet', nameEn: 'Sylhet', nameBn: 'সিলেট' },
  { id: 'rajshahi', nameEn: 'Rajshahi', nameBn: 'রাজশাহী' },
  { id: 'khulna', nameEn: 'Khulna', nameBn: 'খুলনা' },
  { id: 'barisal', nameEn: 'Barishal', nameBn: 'বরিশাল' },
  { id: 'rangpur', nameEn: 'Rangpur', nameBn: 'রংপুর' },
  { id: 'mymensingh', nameEn: 'Mymensingh', nameBn: 'ময়মনসিংহ' },
];

export const BD_DISTRICTS: DistrictInfo[] = [
  // Dhaka Division
  { id: 'dhaka', nameEn: 'Dhaka (City & Metro)', nameBn: 'ঢাকা (সিটি ও মেট্রো)', division: 'dhaka', isDhakaCity: true, deliveryTimeEn: '24 Hours (Express)', deliveryTimeBn: '২৪ ঘণ্টার মধ্যে (এক্সপ্রেস)' },
  { id: 'gazipur', nameEn: 'Gazipur', nameBn: 'গাজীপুর', division: 'dhaka', isDhakaCity: false, deliveryTimeEn: '24-48 Hours', deliveryTimeBn: '২৪-৪৮ ঘণ্টা' },
  { id: 'narayanganj', nameEn: 'Narayanganj', nameBn: 'নারায়ণগঞ্জ', division: 'dhaka', isDhakaCity: false, deliveryTimeEn: '24-48 Hours', deliveryTimeBn: '২৪-৪৮ ঘণ্টা' },
  { id: 'tangail', nameEn: 'Tangail', nameBn: 'টাঙ্গাইল', division: 'dhaka', isDhakaCity: false, deliveryTimeEn: '48 Hours', deliveryTimeBn: '৪৮ ঘণ্টা' },
  { id: 'narsingdi', nameEn: 'Narsingdi', nameBn: 'নরসিংদী', division: 'dhaka', isDhakaCity: false, deliveryTimeEn: '48 Hours', deliveryTimeBn: '৪৮ ঘণ্টা' },
  { id: 'munshiganj', nameEn: 'Munshiganj', nameBn: 'মুন্সীগঞ্জ', division: 'dhaka', isDhakaCity: false, deliveryTimeEn: '48 Hours', deliveryTimeBn: '৪৮ ঘণ্টা' },
  { id: 'manikganj', nameEn: 'Manikganj', nameBn: 'মানিকগঞ্জ', division: 'dhaka', isDhakaCity: false, deliveryTimeEn: '48 Hours', deliveryTimeBn: '৪৮ ঘণ্টা' },
  { id: 'faridpur', nameEn: 'Faridpur', nameBn: 'ফরিদপুর', division: 'dhaka', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'gopalganj', nameEn: 'Gopalganj', nameBn: 'গোপালগঞ্জ', division: 'dhaka', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'madaripur', nameEn: 'Madaripur', nameBn: 'মাদারীপুর', division: 'dhaka', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'rajbari', nameEn: 'Rajbari', nameBn: 'রাজবাড়ী', division: 'dhaka', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'shariatpur', nameEn: 'Shariatpur', nameBn: 'শরীয়তপুর', division: 'dhaka', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'kishoreganj', nameEn: 'Kishoreganj', nameBn: 'কিশোরগঞ্জ', division: 'dhaka', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },

  // Chattogram Division
  { id: 'chattogram', nameEn: 'Chattogram (Chittagong)', nameBn: 'চট্টগ্রাম', division: 'chittagong', isDhakaCity: false, deliveryTimeEn: '24-48 Hours', deliveryTimeBn: '২৪-৪৮ ঘণ্টা' },
  { id: 'coxsbazar', nameEn: "Cox's Bazar", nameBn: 'কক্সবাজার', division: 'chittagong', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'cumilla', nameEn: 'Cumilla (Comilla)', nameBn: 'কুমিল্লা', division: 'chittagong', isDhakaCity: false, deliveryTimeEn: '48 Hours', deliveryTimeBn: '৪৮ ঘণ্টা' },
  { id: 'feni', nameEn: 'Feni', nameBn: 'ফেনী', division: 'chittagong', isDhakaCity: false, deliveryTimeEn: '48 Hours', deliveryTimeBn: '৪৮ ঘণ্টা' },
  { id: 'brahmanbaria', nameEn: 'Brahmanbaria', nameBn: 'ব্রাহ্মণবাড়িয়া', division: 'chittagong', isDhakaCity: false, deliveryTimeEn: '48 Hours', deliveryTimeBn: '৪৮ ঘণ্টা' },
  { id: 'noakhali', nameEn: 'Noakhali', nameBn: 'নোয়াখালী', division: 'chittagong', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'chandpur', nameEn: 'Chandpur', nameBn: 'চাঁদপুর', division: 'chittagong', isDhakaCity: false, deliveryTimeEn: '48 Hours', deliveryTimeBn: '৪৮ ঘণ্টা' },
  { id: 'lakshmipur', nameEn: 'Lakshmipur', nameBn: 'লক্ষ্মীপুর', division: 'chittagong', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'rangamati', nameEn: 'Rangamati', nameBn: 'রাঙ্গামাটি', division: 'chittagong', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'bandarban', nameEn: 'Bandarban', nameBn: 'বান্দরবান', division: 'chittagong', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'khagrachhari', nameEn: 'Khagrachhari', nameBn: 'খাগড়াছড়ি', division: 'chittagong', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },

  // Sylhet Division
  { id: 'sylhet', nameEn: 'Sylhet', nameBn: 'সিলেট', division: 'sylhet', isDhakaCity: false, deliveryTimeEn: '24-48 Hours', deliveryTimeBn: '২৪-৪৮ ঘণ্টা' },
  { id: 'moulvibazar', nameEn: 'Moulvibazar', nameBn: 'মৌলভীবাজার', division: 'sylhet', isDhakaCity: false, deliveryTimeEn: '48 Hours', deliveryTimeBn: '৪৮ ঘণ্টা' },
  { id: 'habiganj', nameEn: 'Habiganj', nameBn: 'হবিগঞ্জ', division: 'sylhet', isDhakaCity: false, deliveryTimeEn: '48 Hours', deliveryTimeBn: '৪৮ ঘণ্টা' },
  { id: 'sunamganj', nameEn: 'Sunamganj', nameBn: 'সুনামগঞ্জ', division: 'sylhet', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },

  // Rajshahi Division
  { id: 'rajshahi', nameEn: 'Rajshahi', nameBn: 'রাজশাহী', division: 'rajshahi', isDhakaCity: false, deliveryTimeEn: '24-48 Hours', deliveryTimeBn: '২৪-৪৮ ঘণ্টা' },
  { id: 'bogura', nameEn: 'Bogura (Bogra)', nameBn: 'বগুড়া', division: 'rajshahi', isDhakaCity: false, deliveryTimeEn: '48 Hours', deliveryTimeBn: '৪৮ ঘণ্টা' },
  { id: 'pabna', nameEn: 'Pabna', nameBn: 'পাবনা', division: 'rajshahi', isDhakaCity: false, deliveryTimeEn: '48 Hours', deliveryTimeBn: '৪৮ ঘণ্টা' },
  { id: 'sirajganj', nameEn: 'Sirajganj', nameBn: 'সিরাজগঞ্জ', division: 'rajshahi', isDhakaCity: false, deliveryTimeEn: '48 Hours', deliveryTimeBn: '৪৮ ঘণ্টা' },
  { id: 'naogaon', nameEn: 'Naogaon', nameBn: 'নওগাঁ', division: 'rajshahi', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'natore', nameEn: 'Natore', nameBn: 'নাটোর', division: 'rajshahi', isDhakaCity: false, deliveryTimeEn: '48 Hours', deliveryTimeBn: '৪৮ ঘণ্টা' },
  { id: 'joypurhat', nameEn: 'Joypurhat', nameBn: 'জয়পুরহাট', division: 'rajshahi', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'chapainawabganj', nameEn: 'Chapainawabganj', nameBn: 'চাঁপাইনবাবগঞ্জ', division: 'rajshahi', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },

  // Khulna Division
  { id: 'khulna', nameEn: 'Khulna', nameBn: 'খুলনা', division: 'khulna', isDhakaCity: false, deliveryTimeEn: '24-48 Hours', deliveryTimeBn: '২৪-৪৮ ঘণ্টা' },
  { id: 'jashore', nameEn: 'Jashore (Jessore)', nameBn: 'যশোর', division: 'khulna', isDhakaCity: false, deliveryTimeEn: '48 Hours', deliveryTimeBn: '৪৮ ঘণ্টা' },
  { id: 'kushtia', nameEn: 'Kushtia', nameBn: 'কুষ্টিয়া', division: 'khulna', isDhakaCity: false, deliveryTimeEn: '48 Hours', deliveryTimeBn: '৪৮ ঘণ্টা' },
  { id: 'jhenaidah', nameEn: 'Jhenaidah', nameBn: 'ঝিনাইদহ', division: 'khulna', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'satkhira', nameEn: 'Satkhira', nameBn: 'সাতক্ষীরা', division: 'khulna', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'bagerhat', nameEn: 'Bagerhat', nameBn: 'বাগেরহাট', division: 'khulna', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'chuadanga', nameEn: 'Chuadanga', nameBn: 'চুয়াডাঙ্গা', division: 'khulna', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'magura', nameEn: 'Magura', nameBn: 'মাগুরা', division: 'khulna', isDhakaCity: false, deliveryTimeEn: '48 Hours', deliveryTimeBn: '৪৮ ঘণ্টা' },
  { id: 'meherpur', nameEn: 'Meherpur', nameBn: 'মেহেরপুর', division: 'khulna', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'narail', nameEn: 'Narail', nameBn: 'নড়াইল', division: 'khulna', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },

  // Barishal Division
  { id: 'barishal', nameEn: 'Barishal', nameBn: 'বরিশাল', division: 'barisal', isDhakaCity: false, deliveryTimeEn: '48 Hours', deliveryTimeBn: '৪৮ ঘণ্টা' },
  { id: 'patuakhali', nameEn: 'Patuakhali', nameBn: 'পটুয়াখালী', division: 'barisal', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'bhola', nameEn: 'Bhola', nameBn: 'ভোলা', division: 'barisal', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'pirojpur', nameEn: 'Pirojpur', nameBn: 'পিরোজপুর', division: 'barisal', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'barguna', nameEn: 'Barguna', nameBn: 'বরগুনা', division: 'barisal', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'jhalokati', nameEn: 'Jhalokati', nameBn: 'ঝালকাঠি', division: 'barisal', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },

  // Rangpur Division
  { id: 'rangpur', nameEn: 'Rangpur', nameBn: 'রংপুর', division: 'rangpur', isDhakaCity: false, deliveryTimeEn: '48 Hours', deliveryTimeBn: '৪৮ ঘণ্টা' },
  { id: 'dinajpur', nameEn: 'Dinajpur', nameBn: 'দিনাজপুর', division: 'rangpur', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'gaibandha', nameEn: 'Gaibandha', nameBn: 'গাইবান্ধা', division: 'rangpur', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'kurigram', nameEn: 'Kurigram', nameBn: 'কুড়িগ্রাম', division: 'rangpur', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'lalmonirhat', nameEn: 'Lalmonirhat', nameBn: 'লালমনিরহাট', division: 'rangpur', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'nilphamari', nameEn: 'Nilphamari', nameBn: 'নীলফামারী', division: 'rangpur', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'panchagarh', nameEn: 'Panchagarh', nameBn: 'পঞ্চগড়', division: 'rangpur', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'thakurgaon', nameEn: 'Thakurgaon', nameBn: 'ঠাকুরগাঁও', division: 'rangpur', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },

  // Mymensingh Division
  { id: 'mymensingh', nameEn: 'Mymensingh', nameBn: 'ময়মনসিংহ', division: 'mymensingh', isDhakaCity: false, deliveryTimeEn: '24-48 Hours', deliveryTimeBn: '২৪-৪৮ ঘণ্টা' },
  { id: 'jamalpur', nameEn: 'Jamalpur', nameBn: 'জামালপুর', division: 'mymensingh', isDhakaCity: false, deliveryTimeEn: '48 Hours', deliveryTimeBn: '৪৮ ঘণ্টা' },
  { id: 'netrokona', nameEn: 'Netrokona', nameBn: 'নেত্রকোণা', division: 'mymensingh', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
  { id: 'sherpur', nameEn: 'Sherpur', nameBn: 'শেরপুর', division: 'mymensingh', isDhakaCity: false, deliveryTimeEn: '48-72 Hours', deliveryTimeBn: '৪৮-৭২ ঘণ্টা' },
];

export const DHAKA_DELIVERY_CHARGE = 80;
export const OUTSIDE_DHAKA_DELIVERY_CHARGE = 150;
export const FREE_DELIVERY_MIN_ORDER = 5000;

export function getDeliveryCharge(districtId: string, subtotal: number): number {
  if (subtotal >= FREE_DELIVERY_MIN_ORDER) {
    return 0;
  }
  const district = BD_DISTRICTS.find(d => d.id === districtId || d.nameEn.toLowerCase() === districtId.toLowerCase());
  if (district && district.isDhakaCity) {
    return DHAKA_DELIVERY_CHARGE;
  }
  return OUTSIDE_DHAKA_DELIVERY_CHARGE;
}

export function getDeliveryTime(districtId: string, language: 'en' | 'bn' = 'en'): string {
  const district = BD_DISTRICTS.find(d => d.id === districtId || d.nameEn.toLowerCase() === districtId.toLowerCase());
  if (!district) return language === 'bn' ? '২৪-৭২ ঘণ্টা' : '24-72 Hours';
  return language === 'bn' ? district.deliveryTimeBn : district.deliveryTimeEn;
}
