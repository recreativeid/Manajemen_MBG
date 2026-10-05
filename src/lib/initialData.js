export const INITIAL_BRANCHES = [
  {
    id: 'branch-1',
    name: 'MBG Mertoyudan Central',
    pic_name: 'Pak Slamet',
    phone_wa: '081234567890',
    daily_deposit: 3000000,
    is_active: true,
    address: 'Mertoyudan, Magelang'
  },
  {
    id: 'branch-2',
    name: 'MBG Borobudur Raya',
    pic_name: 'Ibu Ratna',
    phone_wa: '081398765432',
    daily_deposit: 2500000,
    is_active: true,
    address: 'Borobudur, Magelang'
  },
  {
    id: 'branch-3',
    name: 'MBG Muntilan Makmur',
    pic_name: 'Bpk. Hendro',
    phone_wa: '085712345678',
    daily_deposit: 2000000,
    is_active: true,
    address: 'Muntilan, Magelang'
  },
  {
    id: 'branch-4',
    name: 'MBG Magelang Tengah',
    pic_name: 'Ibu Dewi',
    phone_wa: '082133445566',
    daily_deposit: 3500000,
    is_active: true,
    address: 'Kota Magelang'
  },
  {
    id: 'branch-5',
    name: 'MBG Secang Harmoni',
    pic_name: 'Bpk. Agus',
    phone_wa: '081567890123',
    daily_deposit: 2000000,
    is_active: true,
    address: 'Secang, Magelang'
  },
  {
    id: 'branch-6',
    name: 'MBG Mungkid Sejahtera',
    pic_name: 'Ibu Lestari',
    phone_wa: '087890123456',
    daily_deposit: 2200000,
    is_active: true,
    address: 'Mungkid, Magelang'
  }
];

export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const SHORT_DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export const AVAILABLE_YEARS = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];

export const STATUS_TYPES = {
  PAID: {
    key: 'PAID',
    label: 'Sudah Setor',
    bgClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  OVERDUE: {
    key: 'OVERDUE',
    label: 'Belum Bayar',
    bgClass: 'bg-amber-400 hover:bg-amber-500 text-slate-900 border border-amber-500 font-bold shadow-sm',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300'
  },
  SUSPENDED: {
    key: 'SUSPENDED',
    label: 'Cabang Suspend (Biru Tua)',
    bgClass: 'bg-blue-900 hover:bg-blue-800 text-white border border-blue-800 font-bold shadow-sm',
    badgeClass: 'bg-blue-900 text-white border-blue-800'
  },
  SPECIAL_CLOSED: {
    key: 'SPECIAL_CLOSED',
    label: 'Agenda khusus (Ungu)',
    bgClass: 'bg-purple-600 hover:bg-purple-700 text-white border border-purple-700 font-bold shadow-sm',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300'
  },
  HOLIDAY: {
    key: 'HOLIDAY',
    label: 'Libur Umum',
    bgClass: 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 font-bold',
    badgeClass: 'bg-red-100 text-red-700 border-red-200'
  },
  UPCOMING: {
    key: 'UPCOMING',
    label: 'Mendatang',
    bgClass: 'bg-white hover:bg-slate-100 text-slate-400 border border-slate-200 hover:border-blue-400',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200'
  }
};

export function generatePeriodsForMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  
  return [
    {
      period_index: 1,
      title: `1 Bulan Penuh (${daysInMonth} Hari)`,
      shortTitle: `1 - ${daysInMonth}`,
      start_day: 1,
      end_day: daysInMonth,
      total_calendar_days: daysInMonth
    }
  ];
}

// Generator sekuens bulan fleksibel untuk navigasi (bisa tahun berapapun)
export function generateMonthSequence(startYear = new Date().getFullYear(), startMonth = 1, count = 12) {
  const sequence = [];
  let y = startYear;
  let m = startMonth;

  for (let i = 0; i < count; i++) {
    sequence.push({
      year: y,
      month: m,
      monthName: MONTH_NAMES[m - 1],
      label: `${MONTH_NAMES[m - 1]} ${y}`,
      shortLabel: `${MONTH_NAMES[m - 1]} ${y}`
    });

    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  return sequence;
}

