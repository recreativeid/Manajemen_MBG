import { supabase, isSupabaseConfigured } from './supabase';
import { INITIAL_BRANCHES, generatePeriodsForMonth } from './initialData';

const STORAGE_KEYS = {
  BRANCHES: 'mbg_magelang_branches',
  PERIOD_CONFIGS: 'mbg_magelang_period_configs',
  PAYMENTS: 'mbg_magelang_daily_payments_v2',
  BRANCH_SPECIAL_DAYS: 'mbg_magelang_branch_special_days',
  DATE_NOTES: 'mbg_magelang_date_notes',
  DELETED_BRANCHES: 'mbg_magelang_deleted_branches'
};

// Helper memeriksa apakah cabang sedang disuspend pada tanggal tertentu
export function isBranchSuspendedOnDate(branch, dateStr) {
  if (!branch) return null;

  // Cek konfigurasi suspend tunggal
  if (branch.suspension && branch.suspension.isSuspended) {
    const s = branch.suspension;
    if (s.type === 'permanent') {
      if (!s.startDate || dateStr >= s.startDate) return s;
    } else {
      if (s.startDate && s.endDate && dateStr >= s.startDate && dateStr <= s.endDate) {
        return s;
      }
    }
  }

  // Cek jika ada riwayat suspensions array
  if (Array.isArray(branch.suspensions)) {
    for (const s of branch.suspensions) {
      if (!s.isSuspended) continue;
      if (s.type === 'permanent') {
        if (!s.startDate || dateStr >= s.startDate) return s;
      } else {
        if (s.startDate && s.endDate && dateStr >= s.startDate && dateStr <= s.endDate) {
          return s;
        }
      }
    }
  }

  return null;
}

// Helper LocalStorage
function getLocalItem(key, defaultValue) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from LocalStorage`, e);
    return defaultValue;
  }
}

function setLocalItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to LocalStorage`, e);
  }
}

// Inisialisasi awal
function initLocalStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.BRANCHES)) {
    setLocalItem(STORAGE_KEYS.BRANCHES, INITIAL_BRANCHES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.PERIOD_CONFIGS)) {
    setLocalItem(STORAGE_KEYS.PERIOD_CONFIGS, {});
  }
  if (!localStorage.getItem(STORAGE_KEYS.PAYMENTS)) {
    // Generate initial sample daily payments for October 2026
    const samplePayments = [];
    const sampleDays = [1, 2, 3, 5, 6, 7, 8, 9, 10, 12, 13, 14]; // hari kerja
    INITIAL_BRANCHES.forEach(branch => {
      sampleDays.forEach(day => {
        // Simulasi: beberapa cabang sudah setor
        const dateStr = `2026-10-${String(day).padStart(2, '0')}`;
        samplePayments.push({
          id: `pay-${branch.id}-${dateStr}`,
          branchId: branch.id,
          date: dateStr,
          amount: branch.daily_deposit,
          paymentMethod: 'Transfer Bank',
          notes: 'Setoran harian'
        });
      });
    });
    setLocalItem(STORAGE_KEYS.PAYMENTS, samplePayments);
  }
}

initLocalStorage();

// ==========================================
// 1. CABANG (BRANCHES) & SUSPENSI
// ==========================================
export async function getBranches() {
  const localBranches = getLocalItem(STORAGE_KEYS.BRANCHES, INITIAL_BRANCHES);
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('mbg_branches')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        return data.map(b => {
          const localB = localBranches.find(lb => lb.id === b.id) || {};
          return {
            id: b.id,
            name: b.name,
            pic_name: b.pic_name,
            phone_wa: b.phone_wa,
            daily_deposit: Number(b.daily_deposit),
            is_active: b.is_active,
            address: b.address,
            suspension: b.suspension || localB.suspension || null,
            suspensions: b.suspensions || localB.suspensions || []
          };
        });
      }
    } catch (err) {
      console.warn('Supabase fetch branches fallback to local', err);
    }
  }
  return localBranches;
}

export async function saveBranch(branch) {
  const localBranches = getLocalItem(STORAGE_KEYS.BRANCHES, INITIAL_BRANCHES);
  let updated;
  if (branch.id) {
    updated = localBranches.map(b => b.id === branch.id ? { ...b, ...branch } : b);
  } else {
    const newBranch = {
      ...branch,
      id: 'branch-' + Date.now(),
      is_active: true,
      suspension: null
    };
    updated = [...localBranches, newBranch];
  }
  setLocalItem(STORAGE_KEYS.BRANCHES, updated);

  if (isSupabaseConfigured) {
    try {
      if (branch.id && !branch.id.startsWith('branch-')) {
        await supabase.from('mbg_branches').upsert({
          id: branch.id,
          name: branch.name,
          pic_name: branch.pic_name,
          phone_wa: branch.phone_wa,
          daily_deposit: branch.daily_deposit,
          is_active: branch.is_active,
          address: branch.address
        });
      } else {
        await supabase.from('mbg_branches').insert({
          name: branch.name,
          pic_name: branch.pic_name,
          phone_wa: branch.phone_wa,
          daily_deposit: branch.daily_deposit,
          is_active: true,
          address: branch.address
        });
      }
    } catch (e) {
      console.warn('Supabase saveBranch failed', e);
    }
  }

  return updated;
}

export async function deleteBranch(branchId) {
  const localBranches = getLocalItem(STORAGE_KEYS.BRANCHES, INITIAL_BRANCHES);
  const branchToDelete = localBranches.find(b => b.id === branchId);
  const filtered = localBranches.filter(b => b.id !== branchId);
  setLocalItem(STORAGE_KEYS.BRANCHES, filtered);

  if (branchToDelete) {
    const deletedBranches = getLocalItem(STORAGE_KEYS.DELETED_BRANCHES, []);
    const updatedDeleted = [
      ...deletedBranches.filter(b => b.id !== branchId),
      {
        ...branchToDelete,
        deletedAt: new Date().toISOString()
      }
    ];
    setLocalItem(STORAGE_KEYS.DELETED_BRANCHES, updatedDeleted);
  }

  if (isSupabaseConfigured && !branchId.startsWith('branch-')) {
    try {
      await supabase.from('mbg_branches').delete().eq('id', branchId);
    } catch (e) {
      console.warn('Supabase deleteBranch failed', e);
    }
  }
  return filtered;
}

// Mengambil seluruh daftar cabang yang terhapus (untuk fitur restore)
export async function getDeletedBranches() {
  return getLocalItem(STORAGE_KEYS.DELETED_BRANCHES, []);
}

// Memulihkan cabang yang sebelumnya terhapus kembali ke daftar cabang aktif
export async function restoreBranch(branchId) {
  const deletedBranches = getLocalItem(STORAGE_KEYS.DELETED_BRANCHES, []);
  let branchToRestore = deletedBranches.find(b => b.id === branchId);

  // Jika tidak ada di deletedBranches, cek di INITIAL_BRANCHES (template awal)
  if (!branchToRestore) {
    branchToRestore = INITIAL_BRANCHES.find(b => b.id === branchId);
  }

  if (!branchToRestore) return null;

  const localBranches = getLocalItem(STORAGE_KEYS.BRANCHES, INITIAL_BRANCHES);
  const { deletedAt, ...cleanBranch } = branchToRestore;
  const updatedBranches = [...localBranches.filter(b => b.id !== branchId), cleanBranch];
  const updatedDeleted = deletedBranches.filter(b => b.id !== branchId);

  setLocalItem(STORAGE_KEYS.BRANCHES, updatedBranches);
  setLocalItem(STORAGE_KEYS.DELETED_BRANCHES, updatedDeleted);

  return updatedBranches;
}

// Memulihkan seluruh cabang default template awal (MBG Magelang 6 Cabang) jika ada yang hilang
export async function restoreDefaultBranches() {
  const localBranches = getLocalItem(STORAGE_KEYS.BRANCHES, INITIAL_BRANCHES);
  const existingIds = new Set(localBranches.map(b => b.id));
  const missingDefaults = INITIAL_BRANCHES.filter(b => !existingIds.has(b.id));

  const updatedBranches = [...localBranches, ...missingDefaults];
  setLocalItem(STORAGE_KEYS.BRANCHES, updatedBranches);

  const deletedBranches = getLocalItem(STORAGE_KEYS.DELETED_BRANCHES, []);
  const restoredIds = new Set(missingDefaults.map(b => b.id));
  const updatedDeleted = deletedBranches.filter(b => !restoredIds.has(b.id));
  setLocalItem(STORAGE_KEYS.DELETED_BRANCHES, updatedDeleted);

  return updatedBranches;
}

// Menghapus cabang secara permanen dari riwayat sampah
export async function permanentDeleteBranch(branchId) {
  const deletedBranches = getLocalItem(STORAGE_KEYS.DELETED_BRANCHES, []);
  const updatedDeleted = deletedBranches.filter(b => b.id !== branchId);
  setLocalItem(STORAGE_KEYS.DELETED_BRANCHES, updatedDeleted);
  return updatedDeleted;
}

// Simpan catatan khusus cabang (branch notes)
export async function saveBranchNotes({ branchId, notes }) {
  const localBranches = getLocalItem(STORAGE_KEYS.BRANCHES, INITIAL_BRANCHES);
  const updated = localBranches.map(b => {
    if (b.id === branchId) {
      return {
        ...b,
        notes: (notes || '').trim()
      };
    }
    return b;
  });
  setLocalItem(STORAGE_KEYS.BRANCHES, updated);
  return updated;
}

// Atur status Suspend Cabang (Warna Biru Tua)
// type: 'range' (rentang tanggal startDate s/d endDate) atau 'permanent' (selamanya mulai startDate)
export async function saveBranchSuspension({ branchId, isSuspended = true, type = 'range', startDate, endDate, reason = '' }) {
  const localBranches = getLocalItem(STORAGE_KEYS.BRANCHES, INITIAL_BRANCHES);
  const updated = localBranches.map(b => {
    if (b.id === branchId) {
      const suspension = isSuspended ? {
        isSuspended: true,
        type: type || 'permanent',
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: type === 'permanent' ? null : endDate,
        reason: reason || 'Cabang disuspend sementara',
        updatedAt: new Date().toISOString()
      } : null;

      return {
        ...b,
        suspension
      };
    }
    return b;
  });

  setLocalItem(STORAGE_KEYS.BRANCHES, updated);
  return updated;
}

export async function removeBranchSuspension(branchId) {
  return saveBranchSuspension({ branchId, isSuspended: false });
}

// ==========================================
// 1B. TANDA KHUSUS CABANG (WARNA UNGU)
// Untuk cabang tertentu yang tutup 1 hari / bencana / libur khusus cabang
// ==========================================
export async function getBranchSpecialDays() {
  return getLocalItem(STORAGE_KEYS.BRANCH_SPECIAL_DAYS, []);
}

export async function saveBranchSpecialDay({ branchId, dateStr, type = 'tutup', reason = '' }) {
  const specialDays = getLocalItem(STORAGE_KEYS.BRANCH_SPECIAL_DAYS, []);
  const existingIdx = specialDays.findIndex(s => s.branchId === branchId && s.dateStr === dateStr);

  const newEntry = {
    id: `spec-${branchId}-${dateStr}`,
    branchId,
    dateStr,
    type: type || 'tutup', // 'tutup' | 'bencana' | 'libur' | 'lainnya'
    reason: reason || 'Tutup / Bencana / Libur Khusus',
    updatedAt: new Date().toISOString()
  };

  let updated;
  if (existingIdx >= 0) {
    updated = specialDays.map((s, idx) => idx === existingIdx ? newEntry : s);
  } else {
    updated = [...specialDays, newEntry];
  }

  setLocalItem(STORAGE_KEYS.BRANCH_SPECIAL_DAYS, updated);
  return updated;
}

export async function deleteBranchSpecialDay({ branchId, dateStr }) {
  const specialDays = getLocalItem(STORAGE_KEYS.BRANCH_SPECIAL_DAYS, []);
  const filtered = specialDays.filter(s => !(s.branchId === branchId && s.dateStr === dateStr));
  setLocalItem(STORAGE_KEYS.BRANCH_SPECIAL_DAYS, filtered);
  return filtered;
}

// ==========================================
// 1C. FITUR TANDAI TANGGAL (COLOR MARKING MODE)
// Mode:
// - 'BLUE': Sudah Setor (Setoran Penuh) -> Menjadikan sel warna BIRU
// - 'YELLOW': Belum Bayar -> Menjadikan sel warna KUNING (Otomatis/Manual)
// - 'PURPLE': Khusus Cabang (Tutup / Bencana / Libur Cabang) -> Menjadikan sel warna UNGU
// - 'DARK_BLUE': Suspend Cabang pada tanggal tertentu -> Menjadikan sel warna BIRU TUA
// - 'RESET': Mengembalikan ke setelan awal (menghapus tanda/setoran)
// ==========================================
export async function setBranchDateColor({ branchId, dateStr, colorMode, dailyDeposit }) {
  const allPayments = getLocalItem(STORAGE_KEYS.PAYMENTS, []);
  const specialDays = getLocalItem(STORAGE_KEYS.BRANCH_SPECIAL_DAYS, []);

  const paymentIdx = allPayments.findIndex(p => p.branchId === branchId && p.date === dateStr);
  const specialIdx = specialDays.findIndex(s => s.branchId === branchId && s.dateStr === dateStr);

  let updatedPayments = [...allPayments];
  let updatedSpecialDays = [...specialDays];

  if (colorMode === 'BLUE') {
    // 1. Bersihkan specialDays untuk tanggal ini agar tidak tertutup ungu/suspend/kuning
    if (specialIdx >= 0) {
      updatedSpecialDays = updatedSpecialDays.filter((_, idx) => idx !== specialIdx);
    }
    // 2. Setor penuh (Biru)
    if (paymentIdx >= 0) {
      updatedPayments[paymentIdx] = {
        ...updatedPayments[paymentIdx],
        amount: Number(dailyDeposit || updatedPayments[paymentIdx].amount || 0)
      };
    } else {
      updatedPayments.push({
        id: `pay-${branchId}-${dateStr}-${Date.now()}`,
        branchId,
        date: dateStr,
        amount: Number(dailyDeposit || 0),
        paymentMethod: 'Transfer Bank',
        notes: 'Setoran harian'
      });
    }
  } else if (colorMode === 'DARK_BLUE') {
    // 1. Hapus payment jika ada agar tidak terhitung setor
    if (paymentIdx >= 0) {
      updatedPayments = updatedPayments.filter((_, idx) => idx !== paymentIdx);
    }
    // 2. Tandai Suspend (Biru Tua)
    const suspendEntry = {
      id: `spec-${branchId}-${dateStr}`,
      branchId,
      dateStr,
      type: 'suspend',
      reason: 'Cabang Suspend',
      updatedAt: new Date().toISOString()
    };
    if (specialIdx >= 0) {
      updatedSpecialDays[specialIdx] = suspendEntry;
    } else {
      updatedSpecialDays.push(suspendEntry);
    }
  } else if (colorMode === 'PURPLE') {
    // 1. Hapus payment jika ada
    if (paymentIdx >= 0) {
      updatedPayments = updatedPayments.filter((_, idx) => idx !== paymentIdx);
    }
    // 2. Tandai Khusus Cabang / Tutup / Bencana (Ungu)
    const purpleEntry = {
      id: `spec-${branchId}-${dateStr}`,
      branchId,
      dateStr,
      type: 'tutup',
      reason: 'Tutup / Bencana / Khusus Cabang',
      updatedAt: new Date().toISOString()
    };
    if (specialIdx >= 0) {
      updatedSpecialDays[specialIdx] = purpleEntry;
    } else {
      updatedSpecialDays.push(purpleEntry);
    }
  } else if (colorMode === 'YELLOW') {
    // 1. Hapus payment jika ada (agar belum bayar)
    if (paymentIdx >= 0) {
      updatedPayments = updatedPayments.filter((_, idx) => idx !== paymentIdx);
    }
    // 2. Tandai manual Belum Bayar (Kuning)
    const yellowEntry = {
      id: `spec-${branchId}-${dateStr}`,
      branchId,
      dateStr,
      type: 'kuning',
      reason: 'Belum Bayar (Tunggakan)',
      updatedAt: new Date().toISOString()
    };
    if (specialIdx >= 0) {
      updatedSpecialDays[specialIdx] = yellowEntry;
    } else {
      updatedSpecialDays.push(yellowEntry);
    }
  } else if (colorMode === 'RESET') {
    // Reset/Hapus tanda & setoran
    if (paymentIdx >= 0) {
      updatedPayments = updatedPayments.filter((_, idx) => idx !== paymentIdx);
    }
    if (specialIdx >= 0) {
      updatedSpecialDays = updatedSpecialDays.filter((_, idx) => idx !== specialIdx);
    }
  }

  setLocalItem(STORAGE_KEYS.PAYMENTS, updatedPayments);
  setLocalItem(STORAGE_KEYS.BRANCH_SPECIAL_DAYS, updatedSpecialDays);

  return { updatedPayments, updatedSpecialDays };
}

// ==========================================
// 1D. CATATAN TANGGAL KHUSUS (DATE NOTES)
// ==========================================
export async function getDateNotes() {
  return getLocalItem(STORAGE_KEYS.DATE_NOTES, []);
}

export async function saveDateNote({ branchId, dateStr, note }) {
  const allNotes = getLocalItem(STORAGE_KEYS.DATE_NOTES, []);
  const cleanNote = (note || '').trim();
  const existingIdx = allNotes.findIndex(n => n.branchId === branchId && n.dateStr === dateStr);

  let updated;
  if (!cleanNote) {
    updated = allNotes.filter(n => !(n.branchId === branchId && n.dateStr === dateStr));
  } else if (existingIdx >= 0) {
    updated = allNotes.map((n, idx) => idx === existingIdx ? {
      ...n,
      note: cleanNote,
      updatedAt: new Date().toISOString()
    } : n);
  } else {
    updated = [
      ...allNotes,
      {
        id: `note-${branchId}-${dateStr}-${Date.now()}`,
        branchId,
        dateStr,
        note: cleanNote,
        updatedAt: new Date().toISOString()
      }
    ];
  }

  setLocalItem(STORAGE_KEYS.DATE_NOTES, updated);
  return updated;
}

// ==========================================
// 2. PENGATURAN HARI LIBUR
// ==========================================
export function getMonthConfigKey(year, month) {
  return `holidays_${year}_${month}`;
}

export async function getMonthHolidayConfig(year, month) {
  const key = getMonthConfigKey(year, month);
  const configs = getLocalItem(STORAGE_KEYS.PERIOD_CONFIGS, {});
  return configs[key] || {
    weeklyHolidays: [0], // Default: Hari Minggu (0) libur
    customHolidays: []   // Array tanggal YYYY-MM-DD
  };
}

export async function saveMonthHolidayConfig(year, month, newConfig) {
  const key = getMonthConfigKey(year, month);
  const configs = getLocalItem(STORAGE_KEYS.PERIOD_CONFIGS, {});
  configs[key] = newConfig;
  setLocalItem(STORAGE_KEYS.PERIOD_CONFIGS, configs);
  return newConfig;
}

// ==========================================
// 3. TRANSAKSI SETORAN HARIAN (DAILY PAYMENTS)
// ==========================================
export async function getAllPayments() {
  return getLocalItem(STORAGE_KEYS.PAYMENTS, []);
}

// 1-Klik Toggle Pembayaran Harian untuk Cabang & Tanggal tertentu
export async function toggleDailyPayment({ branchId, dateStr, defaultAmount }) {
  const allPayments = getLocalItem(STORAGE_KEYS.PAYMENTS, []);
  const existingIndex = allPayments.findIndex(p => p.branchId === branchId && p.date === dateStr);

  let updated;
  let statusResult;

  if (existingIndex >= 0) {
    // Sudah bayar -> toggle hapus setoran
    updated = allPayments.filter((_, idx) => idx !== existingIndex);
    statusResult = 'REMOVED';
  } else {
    // Belum bayar -> catat setoran penuh
    const newRecord = {
      id: `pay-${branchId}-${dateStr}-${Date.now()}`,
      branchId,
      date: dateStr,
      amount: Number(defaultAmount || 0),
      paymentMethod: 'Transfer Bank',
      notes: 'Setoran harian'
    };
    updated = [newRecord, ...allPayments];
    statusResult = 'PAID';
  }

  setLocalItem(STORAGE_KEYS.PAYMENTS, updated);
  return { updated, statusResult };
}

// Simpan / Edit nominal spesifik setoran harian
export async function saveDailyPaymentRecord({ branchId, dateStr, amount, paymentMethod, notes }) {
  const allPayments = getLocalItem(STORAGE_KEYS.PAYMENTS, []);
  const existingIndex = allPayments.findIndex(p => p.branchId === branchId && p.date === dateStr);

  const numAmount = Number(amount || 0);
  let updated;

  if (numAmount <= 0) {
    // Jika diisi 0, hapus record
    updated = allPayments.filter((_, idx) => idx !== existingIndex);
  } else if (existingIndex >= 0) {
    // Update record yang ada
    updated = allPayments.map((p, idx) => {
      if (idx === existingIndex) {
        return {
          ...p,
          amount: numAmount,
          paymentMethod: paymentMethod || p.paymentMethod || 'Transfer Bank',
          notes: notes !== undefined ? notes : p.notes
        };
      }
      return p;
    });
  } else {
    // Tambah record baru
    const newRecord = {
      id: `pay-${branchId}-${dateStr}-${Date.now()}`,
      branchId,
      date: dateStr,
      amount: numAmount,
      paymentMethod: paymentMethod || 'Transfer Bank',
      notes: notes || 'Setoran harian'
    };
    updated = [newRecord, ...allPayments];
  }

  setLocalItem(STORAGE_KEYS.PAYMENTS, updated);
  return updated;
}

// Quick Fill: Setor Semua Hari Kerja Aktif Bulan Ini untuk suatu Cabang
export async function quickFillWorkingDaysForBranch(branchId, dates, dailyDeposit) {
  const allPayments = getLocalItem(STORAGE_KEYS.PAYMENTS, []);
  let updated = [...allPayments];

  dates.forEach(dateStr => {
    const existingIndex = updated.findIndex(p => p.branchId === branchId && p.date === dateStr);
    if (existingIndex < 0) {
      updated.push({
        id: `pay-${branchId}-${dateStr}-${Date.now()}`,
        branchId,
        date: dateStr,
        amount: Number(dailyDeposit || 0),
        paymentMethod: 'Transfer Bank',
        notes: 'Setoran harian otomatis'
      });
    }
  });

  setLocalItem(STORAGE_KEYS.PAYMENTS, updated);
  return updated;
}

// ==========================================
// 4. MATRIX LENGKAP 1 BULAN PENUH
// Menghilangkan batasan periode & Oktober 2026
// Mendukung status:
// - Biru: Sudah Setor (PAID)
// - Kuning: Belum Bayar (OVERDUE - Otomatis aktif jika tanggal lewat & belum setor)
// - Biru Tua: Suspend Cabang (SUSPENDED - Manual rentang tgl / selamanya)
// - Ungu: Khusus Cabang Ini (SPECIAL_CLOSED - Tutup 1 hari / bencana / libur cabang)
// - Merah: Libur Umum (HOLIDAY)
// - Putih: Mendatang (UPCOMING)
// ==========================================
export async function getFullMonthMatrixData(year, month) {
  const branches = await getBranches();
  const holidayConfig = await getMonthHolidayConfig(year, month);
  const allPayments = await getAllPayments();
  const specialDays = await getBranchSpecialDays();
  const dateNotes = await getDateNotes();

  const daysInMonth = new Date(year, month, 0).getDate();
  const activeBranches = branches.filter(b => b.is_active);

  const weeklyHolidays = holidayConfig.weeklyHolidays || [0];
  const customHolidays = holidayConfig.customHolidays || [];

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Bangun struktur hari 1 s/d daysInMonth (Satu layer 1 bulan penuh)
  const daysList = [];
  let totalMonthWorkingDays = 0;
  let totalMonthHolidays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const isWeekly = weeklyHolidays.includes(dayOfWeek);
    const isCustom = customHolidays.includes(dateStr);
    const isHoliday = isWeekly || isCustom;

    if (isHoliday) {
      totalMonthHolidays++;
    } else {
      totalMonthWorkingDays++;
    }

    const isToday = now.getFullYear() === year && (now.getMonth() + 1) === month && now.getDate() === day;

    daysList.push({
      dayNumber: day,
      dateStr,
      dayOfWeek,
      isHoliday,
      isToday
    });
  }

  // Data per cabang
  const branchMatrix = activeBranches.map(branch => {
    let branchTotalPaid = 0;
    let branchWorkingDaysBilled = 0;
    let paidWorkingDaysCount = 0;
    const unpaidWorkingDates = [];
    const overdueDates = [];

    const dailyEntries = daysList.map(d => {
      const payment = allPayments.find(p => p.branchId === branch.id && p.date === d.dateStr);
      const isPaid = Boolean(payment && payment.amount > 0);
      const amount = payment ? Number(payment.amount) : 0;

      // Catatan tanggal
      const noteEntry = dateNotes.find(n => n.branchId === branch.id && n.dateStr === d.dateStr);
      const note = noteEntry ? noteEntry.note : (payment?.notes && payment.notes !== 'Setoran harian' && payment.notes !== 'Setoran harian otomatis' ? payment.notes : '');
      const hasNote = Boolean(note && note.trim());

      // 1. Cek Libur Umum (Merah)
      const isHoliday = d.isHoliday;

      // 2. Cek Suspend Cabang (Biru Tua) - bisa dari konfigurasi cabang atau tanda tanggal spesifik
      const branchSuspension = isBranchSuspendedOnDate(branch, d.dateStr);
      const specialDay = specialDays.find(s => s.branchId === branch.id && s.dateStr === d.dateStr);
      const isPerDateSuspend = Boolean(specialDay && specialDay.type === 'suspend');
      const isSuspended = Boolean(branchSuspension || isPerDateSuspend);
      const suspensionInfo = branchSuspension || (isPerDateSuspend ? { isSuspended: true, reason: specialDay.reason || 'Suspend Cabang' } : null);

      // 3. Cek Agenda khusus: Tutup 1 Hari / Bencana / Libur Cabang (Ungu)
      const isSpecialClosed = Boolean(specialDay && specialDay.type !== 'suspend' && specialDay.type !== 'kuning');

      // 4. Cek Tanda Manual Belum Bayar (Kuning)
      const isManualOverdue = Boolean(specialDay && specialDay.type === 'kuning');

      // Hari kerja aktif yang wajib disetor oleh cabang ini
      const isBranchWorkingDay = !isHoliday && !isSuspended && !isSpecialClosed;

      // Belum Bayar (Kuning): Otomatis aktif jika tanggal lewat/hari ini dan belum setor, ATAU ditandai manual kuning
      const isOverdue = (isBranchWorkingDay && !isPaid && (d.dateStr <= todayStr)) || isManualOverdue;

      let status = 'UPCOMING';
      if (isSuspended) {
        status = 'SUSPENDED'; // Biru Tua
      } else if (isSpecialClosed) {
        status = 'SPECIAL_CLOSED'; // Ungu (Agenda khusus)
      } else if (isPaid) {
        status = amount >= branch.daily_deposit ? 'PAID' : 'PARTIAL'; // Biru
      } else if (isHoliday) {
        status = 'HOLIDAY'; // Merah
      } else if (isOverdue) {
        status = 'OVERDUE'; // Kuning (Otomatis & Manual)
      } else {
        status = 'UPCOMING'; // Putih
      }

      if (isBranchWorkingDay) {
        branchWorkingDaysBilled++;
        if (isPaid) {
          paidWorkingDaysCount++;
        } else {
          unpaidWorkingDates.push(d.dayNumber);
          if (isOverdue) {
            overdueDates.push(d.dayNumber);
          }
        }
      }

      branchTotalPaid += amount;

      return {
        dayNumber: d.dayNumber,
        dateStr: d.dateStr,
        dayOfWeek: d.dayOfWeek,
        isHoliday,
        isSuspended,
        suspensionInfo,
        isSpecialClosed,
        specialDay,
        isPaid,
        isOverdue,
        amount,
        payment,
        status,
        note,
        hasNote
      };
    });

    const totalBilling = branch.daily_deposit * branchWorkingDaysBilled;
    const remainingAmount = Math.max(0, totalBilling - branchTotalPaid);
    const isLunas = branchWorkingDaysBilled > 0 ? (branchTotalPaid >= totalBilling) : true;

    return {
      branch,
      dailyEntries,
      workingDaysCount: branchWorkingDaysBilled,
      paidWorkingDaysCount,
      unpaidWorkingDates,
      overdueDates,
      totalBilling,
      totalPaid: branchTotalPaid,
      remainingAmount,
      isLunas,
      isCurrentlySuspended: Boolean(isBranchSuspendedOnDate(branch, todayStr))
    };
  });

  // KPI Bulan
  const totalBilledMonth = branchMatrix.reduce((sum, b) => sum + b.totalBilling, 0);
  const totalPaidMonth = branchMatrix.reduce((sum, b) => sum + b.totalPaid, 0);
  const totalRemainingMonth = branchMatrix.reduce((sum, b) => sum + b.remainingAmount, 0);
  const lunasCount = branchMatrix.filter(b => b.isLunas).length;
  const paymentPercentage = totalBilledMonth > 0 ? Math.round((totalPaidMonth / totalBilledMonth) * 100) : 0;

  return {
    year,
    month,
    daysInMonth,
    daysList,
    cyclesList: [{
      cycleNumber: 1,
      label: '1 Bulan Penuh',
      cycleStartDate: daysList[0]?.dateStr,
      cycleEndDate: daysList[daysList.length - 1]?.dateStr,
      days: daysList.map(d => d.dayNumber)
    }],
    holidayConfig,
    stats: {
      totalDays: daysInMonth,
      workingDays: totalMonthWorkingDays,
      holidays: totalMonthHolidays
    },
    branchMatrix,
    kpi: {
      totalBranches: activeBranches.length,
      totalBilled: totalBilledMonth,
      totalPaid: totalPaidMonth,
      totalRemaining: totalRemainingMonth,
      lunasCount,
      kurangBayarCount: activeBranches.length - lunasCount,
      paymentPercentage
    }
  };
}

// Backward compatibility helper
export async function getCompleteRecapData(year, month, periodIndex = 1) {
  const matrix = await getFullMonthMatrixData(year, month);
  const periods = generatePeriodsForMonth(year, month);
  const currentPeriod = periods[0];

  const branchRecaps = matrix.branchMatrix.map(b => ({
    branch: b.branch,
    activeDays: b.workingDaysCount,
    dailyDeposit: b.branch.daily_deposit,
    totalBilling: b.totalBilling,
    totalPaid: b.totalPaid,
    remainingAmount: b.remainingAmount,
    isLunas: b.isLunas,
    status: b.isLunas ? 'LUNAS' : (b.totalPaid > 0 ? 'SEBAGIAN' : 'BELUM_BAYAR'),
    payments: b.dailyEntries.filter(e => e.payment).map(e => e.payment),
    overdueDaysCount: b.overdueDates?.length || 0
  }));

  return {
    year,
    month,
    period: currentPeriod,
    periods,
    config: matrix.holidayConfig,
    dayStats: {
      totalCalendarDays: matrix.daysInMonth,
      activeDays: matrix.stats.workingDays,
      holidaysCount: matrix.stats.holidays
    },
    branchRecaps,
    kpi: matrix.kpi
  };
}

export async function savePeriodConfig(year, month, periodIndex, newConfig) {
  return saveMonthHolidayConfig(year, month, newConfig);
}

export async function addPayment(payment) {
  return saveDailyPaymentRecord({
    branchId: payment.branchId,
    dateStr: payment.paymentDate || `${payment.year}-${String(payment.month).padStart(2, '0')}-01`,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    notes: payment.notes
  });
}

export async function deletePayment(paymentId) {
  const allPayments = getLocalItem(STORAGE_KEYS.PAYMENTS, []);
  const filtered = allPayments.filter(p => p.id !== paymentId);
  setLocalItem(STORAGE_KEYS.PAYMENTS, filtered);
  return filtered;
}
