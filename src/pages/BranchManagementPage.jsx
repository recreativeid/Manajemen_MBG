import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  DollarSign, 
  Edit3, 
  Trash2, 
  Plus, 
  Search, 
  ArrowUpDown, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  MessageSquare,
  Sparkles,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FileText,
  Send,
  X
} from 'lucide-react';
import { formatRupiah, MONTH_NAMES, AVAILABLE_YEARS } from '../lib/initialData';
import { sanitizeWaNumber } from '../lib/waHelper';
import BranchSuspendModal from '../components/BranchSuspendModal';

export default function BranchManagementPage({
  monthMatrixData,
  selectedYear,
  selectedMonth,
  onSelectYear,
  onSelectMonth,
  onSelectMonthAndYear,
  onOpenAddBranch,
  onOpenEditBranch,
  onRequestDeleteBranch,
  onSaveBranchSuspension,
  deletedBranches = [],
  onRestoreBranch,
  onRestoreDefaultBranches,
  onPermanentDeleteBranch,
  onSaveBranchNotes
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('remaining-desc'); // 'remaining-desc' | 'remaining-asc' | 'paid-desc' | 'deposit-desc' | 'name-asc' | 'name-desc'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'LUNAS' | 'BELUM_LUNAS' | 'SUSPEND'
  const [selectedBranchForSuspend, setSelectedBranchForSuspend] = useState(null);
  // State Modal Restore Cabang
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  // State Modal Catatan Khusus Cabang
  const [selectedBranchForNotes, setSelectedBranchForNotes] = useState(null);
  const [branchNotesInput, setBranchNotesInput] = useState('');

  if (!monthMatrixData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const { branchMatrix, daysList } = monthMatrixData;
  const monthName = MONTH_NAMES[selectedMonth - 1];

  // Helper navigasi bulan & tahun
  const setMonthAndYear = (m, y) => {
    if (onSelectMonthAndYear) {
      onSelectMonthAndYear(m, y);
    } else {
      onSelectMonth(m);
      onSelectYear(y);
    }
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setMonthAndYear(12, selectedYear - 1);
    } else {
      setMonthAndYear(selectedMonth - 1, selectedYear);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setMonthAndYear(1, selectedYear + 1);
    } else {
      setMonthAndYear(selectedMonth + 1, selectedYear);
    }
  };

  // Data baris cabang untuk 1 bulan penuh
  const branchRows = useMemo(() => {
    return branchMatrix.map((item) => {
      const branch = item.branch;
      return {
        branch,
        activeDays: item.workingDaysCount,
        paidDays: item.paidWorkingDaysCount,
        totalBilling: item.totalBilling,
        totalPaid: item.totalPaid,
        remainingAmount: item.remainingAmount,
        isLunas: item.isLunas,
        isCurrentlySuspended: item.isCurrentlySuspended,
        overdueCount: item.overdueDates?.length || 0
      };
    });
  }, [branchMatrix]);

  // Filter pencarian dan status
  const filteredRows = useMemo(() => {
    return branchRows.filter(row => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        row.branch.name.toLowerCase().includes(q) ||
        (row.branch.address && row.branch.address.toLowerCase().includes(q)) ||
        (row.branch.phone_wa && row.branch.phone_wa.includes(q));

      const matchStatus = 
        statusFilter === 'ALL' ? true :
        statusFilter === 'LUNAS' ? row.isLunas :
        statusFilter === 'BELUM_LUNAS' ? !row.isLunas :
        statusFilter === 'SUSPEND' ? row.isCurrentlySuspended :
        true;

      return matchSearch && matchStatus;
    });
  }, [branchRows, searchQuery, statusFilter]);

  // Pengurutan (Sortir)
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      if (sortBy === 'remaining-desc') {
        return b.remainingAmount - a.remainingAmount;
      }
      if (sortBy === 'remaining-asc') {
        return a.remainingAmount - b.remainingAmount;
      }
      if (sortBy === 'paid-desc') {
        return b.totalPaid - a.totalPaid;
      }
      if (sortBy === 'deposit-desc') {
        return b.branch.daily_deposit - a.branch.daily_deposit;
      }
      if (sortBy === 'name-asc') {
        return a.branch.name.localeCompare(b.branch.name, 'id');
      }
      if (sortBy === 'name-desc') {
        return b.branch.name.localeCompare(a.branch.name, 'id');
      }
      return 0;
    });
  }, [filteredRows, sortBy]);

  // Kalkulasi KPI Agregat
  const totalBranches = branchMatrix.length;
  const totalObligation = branchRows.reduce((sum, r) => sum + r.totalBilling, 0);
  const totalCollected = branchRows.reduce((sum, r) => sum + r.totalPaid, 0);
  const totalRemaining = branchRows.reduce((sum, r) => sum + r.remainingAmount, 0);
  const lunasCount = branchRows.filter(r => r.isLunas).length;
  const unpaidCount = totalBranches - lunasCount;

  // Handler kirim WA tagihan
  const handleOpenWaChat = (row) => {
    const cleanPhone = sanitizeWaNumber(row.branch.phone_wa);
    if (!cleanPhone) {
      alert(`Nomor WhatsApp untuk ${row.branch.name} belum valid.`);
      return;
    }

    const message = encodeURIComponent(
`*PEMBERITAHUAN SETORAN MBG - BULAN ${monthName.toUpperCase()} ${selectedYear}*
Kabupaten / Kota Magelang

Halo Pengelola Cabang *${row.branch.name}*,

Berikut ringkasan setoran MBG bulan ${monthName} ${selectedYear}:
• Hari Kerja Aktif: ${row.activeDays} hari
• Hari Sudah Setor: ${row.paidDays} hari
• Tarif Tetap: ${formatRupiah(row.branch.daily_deposit)}/hari
• Total Kewajiban: ${formatRupiah(row.totalBilling)}
• Total Disetor: ${formatRupiah(row.totalPaid)}
${row.isLunas ? '*Status: LUNAS*' : `*Sisa Kurang Bayar:* ${formatRupiah(row.remainingAmount)}`}

Terima kasih atas kerja sama dan dedikasinya.`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Header Halaman & Tombol Aksi */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Kelola Cabang MBG Magelang
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pengaturan data cabang, alamat, kontak WhatsApp, tarif harian, dan status suspend cabang
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Navigasi Bulan / Tahun */}
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs font-bold text-slate-800 px-2">
                {monthName} {selectedYear}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Tombol Restore Cabang (Pulihkan Cabang Terhapus) */}
            <button
              type="button"
              onClick={() => setIsRestoreModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
              title="Pulihkan cabang yang terhapus"
            >
              <RotateCcw className="w-4 h-4 text-blue-600" />
              <span>Restore Cabang</span>
              {deletedBranches && deletedBranches.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  {deletedBranches.length}
                </span>
              )}
            </button>

            {/* Tombol Tambah Cabang Baru */}
            <button
              onClick={onOpenAddBranch}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Cabang Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kartu Ringkasan KPI Keuangan 1 Bulan Penuh */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Cabang Aktif
          </span>
          <p className="text-lg sm:text-2xl font-black text-slate-900 mt-1">
            {totalBranches} <span className="text-xs font-semibold text-slate-500">Cabang</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {lunasCount} Lunas • {unpaidCount} Kurang Bayar
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Kewajiban ({monthName} {selectedYear})
          </span>
          <p className="text-lg sm:text-xl font-black text-slate-900 mt-1">
            {formatRupiah(totalObligation)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Target setoran tetap 1 bulan
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
            Total Sudah Disetor
          </span>
          <p className="text-lg sm:text-xl font-black text-emerald-700 mt-1">
            {formatRupiah(totalCollected)}
          </p>
          <p className="text-[11px] text-emerald-600/80 mt-1">
            Realisasi pembayaran masuk
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${totalRemaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            Sisa Kekurangan
          </span>
          <p className={`text-lg sm:text-xl font-black mt-1 ${totalRemaining > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
            {totalRemaining > 0 ? formatRupiah(totalRemaining) : 'SEMUA LUNAS'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalRemaining > 0 ? `${unpaidCount} cabang belum lunas` : 'Seluruh cabang telah melunasi'}
          </p>
        </div>
      </div>

      {/* Bar Filter, Pencarian, dan Opsi Sortir */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Input Pencarian */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama cabang, alamat, atau no HP..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Opsi Sortir & Status */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Sortir Dropdown */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] font-bold text-slate-500">Sortir:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="remaining-desc">Kekurangan Terbesar</option>
                <option value="remaining-asc">Kekurangan Terkecil (Lunas Dulu)</option>
                <option value="paid-desc">Total Setoran Terbanyak</option>
                <option value="deposit-desc">Tarif Harian Tertinggi</option>
                <option value="name-asc">Nama Cabang (A - Z)</option>
                <option value="name-desc">Nama Cabang (Z - A)</option>
              </select>
            </div>

            {/* Filter Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="BELUM_LUNAS">Ada Kekurangan</option>
              <option value="LUNAS">Lunas</option>
              <option value="SUSPEND">Sedang Suspend</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Daftar Cabang MBG */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-slate-900">
              Daftar Cabang MBG
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
              {sortedRows.length} Cabang
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Bulan: {monthName} {selectedYear} ({daysList.length} Hari)
          </span>
        </div>

        {sortedRows.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3 stroke-1" />
            <h3 className="text-sm font-bold text-slate-700">Tidak ada cabang ditemukan</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Tidak ada cabang yang cocok dengan kata kunci pencarian atau filter status yang dipilih.
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-bold"
              >
                Reset Pencarian
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3.5 w-12 text-center">No</th>
                  <th className="py-3 px-4 min-w-[220px]">Nama Cabang & Alamat MBG</th>
                  <th className="py-3 px-4 min-w-[130px] text-center">Status Suspend</th>
                  <th className="py-3 px-4 min-w-[150px]">Kontak WhatsApp</th>
                  <th className="py-3 px-4 min-w-[130px] text-right">Tarif Harian</th>
                  <th className="py-3 px-4 min-w-[140px] text-right bg-blue-50/40 text-blue-900">
                    Total Kewajiban
                  </th>
                  <th className="py-3 px-4 min-w-[140px] text-right bg-emerald-50/40 text-emerald-900">
                    Total Disetor
                  </th>
                  <th className="py-3 px-4 min-w-[150px] text-right bg-amber-50/40 text-amber-900">
                    Kekurangan
                  </th>
                  <th className="py-3 px-3.5 text-center min-w-[110px]">Status</th>
                  <th className="py-3 px-4 text-center min-w-[140px] sticky right-0 bg-slate-50 z-10 border-l border-slate-200">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {sortedRows.map((row, index) => (
                  <tr 
                    key={row.branch.id} 
                    className={`hover:bg-slate-50/80 transition ${row.isLunas ? 'bg-emerald-50/10' : ''}`}
                  >
                    {/* No */}
                    <td className="py-3 px-3.5 text-center text-slate-400 font-bold">
                      {index + 1}
                    </td>

                    {/* Nama Cabang & Alamat */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">
                        {row.branch.name}
                      </div>
                      <div className="flex items-center space-x-1 text-[11px] text-slate-500 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span>{row.branch.address || 'Magelang'}</span>
                      </div>
                    </td>

                    {/* Status Suspend (Biru Tua) */}
                    <td className="py-3 px-4 text-center">
                      {row.isCurrentlySuspended ? (
                        <button
                          type="button"
                          onClick={() => setSelectedBranchForSuspend(row.branch)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-900 text-white hover:bg-blue-800 transition"
                          title="Klik untuk ubah/cabut suspend"
                        >
                          <Pause className="w-3 h-3" />
                          <span>SUSPEND</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedBranchForSuspend(row.branch)}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition"
                          title="Klik untuk atur suspend cabang ini"
                        >
                          <span>Aktif Normal</span>
                        </button>
                      )}
                    </td>

                    {/* Kontak WhatsApp */}
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleOpenWaChat(row)}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
                        title="Klik untuk chat WhatsApp tagihan"
                      >
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>{row.branch.phone_wa || '-'}</span>
                      </button>
                    </td>

                    {/* Tarif Harian Tetap */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-slate-900">
                        {formatRupiah(row.branch.daily_deposit)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">/hari</span>
                    </td>

                    {/* Total Kewajiban */}
                    <td className="py-3 px-4 text-right bg-blue-50/20">
                      <span className="font-bold text-slate-900">
                        {formatRupiah(row.totalBilling)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {row.activeDays} hari kerja
                      </span>
                    </td>

                    {/* Total Sudah Disetor */}
                    <td className="py-3 px-4 text-right bg-emerald-50/20">
                      <span className="font-bold text-emerald-700">
                        {formatRupiah(row.totalPaid)}
                      </span>
                      <span className="text-[10px] text-emerald-600/70 block">
                        {row.paidDays} hari disetor
                      </span>
                    </td>

                    {/* Sisa Kurang Bayar */}
                    <td className="py-3 px-4 text-right bg-amber-50/20">
                      {row.remainingAmount > 0 ? (
                        <>
                          <span className="font-bold text-red-600">
                            {formatRupiah(row.remainingAmount)}
                          </span>
                          <span className="text-[10px] text-red-500 block">
                            Kurang {row.activeDays - row.paidDays} hari
                          </span>
                        </>
                      ) : (
                        <span className="font-bold text-emerald-700">
                          Rp 0 (Lunas)
                        </span>
                      )}
                    </td>

                    {/* Status Pelunasan */}
                    <td className="py-3 px-3.5 text-center">
                      {row.isLunas ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Lunas</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
                          <AlertCircle className="w-3 h-3 text-red-600" />
                          <span>Kurang Bayar</span>
                        </span>
                      )}
                    </td>

                    {/* Aksi (5 Tombol: Suspend, Edit, WA, Hapus, Catatan) */}
                    <td className="py-3 px-4 text-center sticky right-0 bg-white hover:bg-slate-50 z-10 border-l border-slate-200">
                      <div className="flex items-center justify-center space-x-1">
                        {/* 1. Tombol Atur Suspend */}
                        <button
                          type="button"
                          onClick={() => setSelectedBranchForSuspend(row.branch)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                          title="Atur Suspend Cabang"
                        >
                          <Pause className="w-4 h-4" />
                        </button>

                        {/* 2. Tombol Edit */}
                        <button
                          type="button"
                          onClick={() => onOpenEditBranch(row.branch)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          title="Edit data cabang"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* 3. Tombol Chat WA Ringkasan */}
                        <button
                          type="button"
                          onClick={() => handleOpenWaChat(row)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                          title="Kirim pesan ringkasan via WA"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>

                        {/* 4. Tombol Hapus */}
                        <button
                          type="button"
                          onClick={() => onRequestDeleteBranch(row.branch)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          title="Hapus cabang"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* 5. Tombol Catatan Cabang (Paling Kanan - Total 5 Tombol) */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBranchForNotes(row.branch);
                            setBranchNotesInput(row.branch.notes || '');
                          }}
                          className={`p-1.5 rounded-lg transition relative cursor-pointer ${
                            row.branch.notes
                              ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 ring-1 ring-amber-300'
                              : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                          }`}
                          title={row.branch.notes ? `Catatan Cabang: "${row.branch.notes}"` : 'Catatan Cabang'}
                        >
                          <FileText className="w-4 h-4" />
                          {row.branch.notes && (
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full ring-1 ring-white" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Suspend Cabang */}
      <BranchSuspendModal
        isOpen={Boolean(selectedBranchForSuspend)}
        onClose={() => setSelectedBranchForSuspend(null)}
        branch={selectedBranchForSuspend}
        onSaveSuspension={onSaveBranchSuspension}
      />

      {/* MODAL RESTORE / PEMULIHAN CABANG TERHAPUS */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Restore / Pulihkan Cabang MBG
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pulihkan cabang yang terhapus kembali ke daftar aktif
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 max-h-[420px] overflow-y-auto no-scrollbar">
              {deletedBranches && deletedBranches.length > 0 ? (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-slate-700">
                    Daftar Cabang yang Terhapus ({deletedBranches.length} Cabang):
                  </p>
                  {deletedBranches.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-900 block truncate">
                          {b.name}
                        </span>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                          <span>{b.address || 'Magelang'}</span>
                          <span>•</span>
                          <span className="font-semibold text-blue-700">
                            {formatRupiah(b.daily_deposit)}/hari
                          </span>
                        </div>
                        {b.deletedAt && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Dihapus: {new Date(b.deletedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (onRestoreBranch) {
                              onRestoreBranch(b.id);
                            }
                          }}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs cursor-pointer"
                          title="Pulihkan cabang ini ke daftar aktif"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Pulihkan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Hapus permanen ${b.name}? Data tidak dapat dipulihkan lagi.`)) {
                              if (onPermanentDeleteBranch) {
                                onPermanentDeleteBranch(b.id);
                              }
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          title="Hapus permanen dari sampah"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800">
                    Tidak Ada Cabang yang Sedang Dihapus
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Seluruh cabang Anda dalam kondisi aktif. Jika sewaktu-waktu ada cabang yang terhapus, Anda dapat memulihkannya di sini.
                  </p>
                </div>
              )}

              {/* Opsi Pulihkan 6 Cabang Default MBG Magelang */}
              <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-blue-900 block">
                    Pulihkan Cabang Default Resmi MBG Magelang
                  </span>
                  <span className="text-[11px] text-blue-700 block mt-0.5">
                    Kembalikan template 6 cabang resmi (Mertoyudan, Borobudur, Muntilan, Tengah, Secang, Mungkid).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Pulihkan cabang-cabang default MBG Magelang yang belum ada?')) {
                      if (onRestoreDefaultBranches) {
                        onRestoreDefaultBranches();
                      }
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 shadow-xs transition shrink-0 cursor-pointer"
                >
                  Restore Default
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CATATAN KHUSUS CABANG */}
      {selectedBranchForNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 shadow-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Catatan Cabang MBG
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedBranchForNotes.name} • {selectedBranchForNotes.address || 'Magelang'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBranchForNotes(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 max-h-[460px] overflow-y-auto no-scrollbar">
              {/* Info Singkat Cabang */}
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Penanggung Jawab (PIC)</span>
                  <span className="font-bold text-slate-800">{selectedBranchForNotes.pic_name || 'Admin Cabang'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Tarif Setoran Harian</span>
                  <span className="font-bold text-blue-700">{formatRupiah(selectedBranchForNotes.daily_deposit)}/hari</span>
                </div>
              </div>

              {/* Input Catatan Utama Cabang */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Catatan Khusus Cabang:
                </label>
                <textarea
                  rows={4}
                  value={branchNotesInput}
                  onChange={(e) => setBranchNotesInput(e.target.value)}
                  placeholder="Tuliskan catatan khusus untuk cabang ini (misal: perjanjian jadwal setoran, kontak darurat dapur, riwayat dispensasi, info rekening, dll)..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 leading-relaxed text-slate-800"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Catatan ini akan tersimpan pada data profil cabang ini.
                </p>
              </div>

              {/* Ringkasan Catatan Tanggal Bulan Ini (Jika Ada) */}
              {(() => {
                const rowData = branchMatrix.find(b => b.branch.id === selectedBranchForNotes.id);
                const notedEntries = rowData ? rowData.dailyEntries.filter(e => e.hasNote) : [];
                return (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-700 block mb-2">
                      Catatan Harian Bulan {monthName} {selectedYear} ({notedEntries.length}):
                    </span>
                    {notedEntries.length > 0 ? (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                        {notedEntries.map(e => (
                          <div key={e.dayNumber} className="p-2 rounded-lg bg-amber-50/60 border border-amber-200 text-xs flex items-start space-x-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white shrink-0">
                              Tgl {e.dayNumber}
                            </span>
                            <p className="text-slate-800 text-[11px] leading-tight">
                              {e.note}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        Belum ada catatan tanggal untuk bulan {monthName} ini. Catatan tanggal dapat ditambahkan lewat menu Rekap.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                {selectedBranchForNotes.notes && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onSaveBranchNotes) {
                        onSaveBranchNotes({ branchId: selectedBranchForNotes.id, notes: '' });
                      }
                      setSelectedBranchForNotes(null);
                      setBranchNotesInput('');
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-bold px-2 py-1 rounded hover:bg-red-50 transition cursor-pointer"
                  >
                    Hapus Catatan
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBranchForNotes(null);
                    setBranchNotesInput('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onSaveBranchNotes) {
                      onSaveBranchNotes({
                        branchId: selectedBranchForNotes.id,
                        notes: branchNotesInput
                      });
                    }
                    setSelectedBranchForNotes(null);
                    setBranchNotesInput('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white transition shadow-sm cursor-pointer"
                >
                  Simpan Catatan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
