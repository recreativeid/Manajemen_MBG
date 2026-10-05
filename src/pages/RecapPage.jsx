import React, { useState } from 'react';
import { 
  Send, Check, Plus, ChevronLeft, ChevronRight,
  FileSpreadsheet, Pause, AlertTriangle,
  Info, Bookmark, RotateCcw, X, MessageSquare
} from 'lucide-react';
import HolidayManager from '../components/HolidayManager';
import BranchSuspendModal from '../components/BranchSuspendModal';
import { formatRupiah, MONTH_NAMES, SHORT_DAY_NAMES, AVAILABLE_YEARS } from '../lib/initialData';
import { buildWaMessage, getWaUrl } from '../lib/waHelper';
import { exportRecapToExcel } from '../lib/excelExport';

// Konfigurasi Pilihan Warna & Fitur Tandai Tanggal (Satu Baris Rapi)
const MARK_COLOR_OPTIONS = [
  {
    id: 'BLUE',
    name: 'Biru',
    badgeLabel: 'Biru (Sudah Setor)',
    description: 'Menandai cabang telah menyetor setoran harian penuh pada tanggal ini.',
    colorBg: 'bg-blue-600',
    colorBorder: 'border-blue-600',
    colorText: 'text-white',
    ringColor: 'ring-blue-500'
  },
  {
    id: 'YELLOW',
    name: 'Kuning',
    badgeLabel: 'Kuning (Belum Bayar)',
    description: 'Menandai tanggal ini cabang belum bayar / menunggak.',
    colorBg: 'bg-amber-400',
    colorBorder: 'border-amber-500',
    colorText: 'text-slate-950 font-bold',
    ringColor: 'ring-amber-400'
  },
  {
    id: 'PURPLE',
    name: 'Ungu',
    badgeLabel: 'Agenda khusus (Ungu)',
    description: 'Menandai agenda khusus untuk cabang ini saja (tutup 1 hari, bencana, libur cabang, atau agenda khusus lainnya).',
    colorBg: 'bg-purple-600',
    colorBorder: 'border-purple-600',
    colorText: 'text-white font-bold',
    ringColor: 'ring-purple-500'
  },
  {
    id: 'DARK_BLUE',
    name: 'Biru Tua',
    badgeLabel: 'Biru Tua (Cabang Suspend)',
    description: 'Menandai cabang sedang disuspend pada tanggal ini.',
    colorBg: 'bg-blue-900',
    colorBorder: 'border-blue-800',
    colorText: 'text-white font-bold',
    ringColor: 'ring-blue-800'
  },
  {
    id: 'NOTE',
    name: 'Catatan',
    badgeLabel: 'Tambah Catatan Tanggal',
    description: 'Menambahkan atau mengedit catatan pada kotak tanggal tertentu.',
    colorBg: 'bg-emerald-600',
    colorBorder: 'border-emerald-600',
    colorText: 'text-white font-bold',
    ringColor: 'ring-emerald-500'
  },
  {
    id: 'RESET',
    name: 'Hapus Tanda',
    badgeLabel: 'Reset / Hapus Tanda',
    description: 'Menghapus tanda khusus atau setoran pada tanggal ini dan mengembalikannya ke tampilan awal.',
    colorBg: 'bg-slate-100',
    colorBorder: 'border-slate-300',
    colorText: 'text-slate-700',
    ringColor: 'ring-slate-400'
  }
];

export default function RecapPage({
  monthMatrixData,
  selectedYear,
  selectedMonth,
  onSelectYear,
  onSelectMonth,
  onSelectMonthAndYear,
  onUpdatePeriodConfig,
  onToggleDailyPayment,
  onSaveDailyPayment,
  onSaveBranchSpecialDay,
  onDeleteBranchSpecialDay,
  onSaveBranchSuspension,
  onQuickFillBranch,
  onSetBranchDateColor,
  onSaveDateNote,
  onOpenEditBranch,
  onOpenAddBranch
}) {
  // Mode Warna Aktif untuk menandai langsung kotak-kotak tanggal
  const [activeColorMode, setActiveColorMode] = useState(null);
  // State untuk pop up konfirmasi saat mengklik warna di bagian atas
  const [pendingColorOption, setPendingColorOption] = useState(null);
  // Modal Suspend Cabang
  const [selectedBranchForSuspend, setSelectedBranchForSuspend] = useState(null);
  // State Modal Catatan Tanggal
  const [activeNoteModalCell, setActiveNoteModalCell] = useState(null);
  const [noteInputText, setNoteInputText] = useState('');

  if (!monthMatrixData) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const { daysList, branchMatrix, stats, kpi, holidayConfig } = monthMatrixData;
  const currentMonthName = MONTH_NAMES[selectedMonth - 1];
  const activeOption = MARK_COLOR_OPTIONS.find(o => o.id === activeColorMode);

  // Helper navigasi bulan & tahun (Fleksibel, bisa ke bulan/tahun berapapun)
  const setMonthAndYear = (m, y) => {
    if (onSelectMonthAndYear) {
      onSelectMonthAndYear(m, y);
    } else {
      onSelectMonth(m);
      onSelectYear(y);
    }
  };

  // Navigasi Mundur 1 Bulan: jika bulan 1, mundur ke bulan 12 tahun sebelumnya
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setMonthAndYear(12, selectedYear - 1);
    } else {
      setMonthAndYear(selectedMonth - 1, selectedYear);
    }
  };

  // Navigasi Maju 1 Bulan: jika bulan 12, maju ke bulan 1 tahun berikutnya
  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setMonthAndYear(1, selectedYear + 1);
    } else {
      setMonthAndYear(selectedMonth + 1, selectedYear);
    }
  };

  // Deteksi live hari ini
  const realNow = new Date();
  const realCurrentYear = realNow.getFullYear();
  const realCurrentMonth = realNow.getMonth() + 1;
  const isViewingToday = selectedYear === realCurrentYear && selectedMonth === realCurrentMonth;

  const handleJumpToToday = () => {
    setMonthAndYear(realCurrentMonth, realCurrentYear);
  };

  // Handler kirim WA penagihan dengan rincian hari yang belum setor
  const handleSendWa = (b) => {
    const message = buildWaMessage({
      branchName: b.branch.name,
      monthName: currentMonthName,
      year: selectedYear,
      dailyDeposit: b.branch.daily_deposit,
      activeDays: b.workingDaysCount,
      totalBilling: b.totalBilling,
      totalPaid: b.totalPaid,
      remainingAmount: b.remainingAmount,
      isLunas: b.isLunas,
      unpaidDates: b.unpaidWorkingDates
    });

    const url = getWaUrl(b.branch.phone_wa, message);
    if (!url) {
      alert(`Nomor WhatsApp untuk ${b.branch.name} belum valid.`);
      return;
    }
    window.open(url, '_blank');
  };

  // Handler Simpan Catatan Tanggal
  const handleSaveNote = async () => {
    if (!activeNoteModalCell || !onSaveDateNote) return;
    await onSaveDateNote({
      branchId: activeNoteModalCell.branch.id,
      dateStr: activeNoteModalCell.dayObj.dateStr,
      note: noteInputText
    });
    setActiveNoteModalCell(null);
    setNoteInputText('');
  };

  // Handler Hapus Catatan Tanggal
  const handleDeleteNote = async () => {
    if (!activeNoteModalCell || !onSaveDateNote) return;
    await onSaveDateNote({
      branchId: activeNoteModalCell.branch.id,
      dateStr: activeNoteModalCell.dayObj.dateStr,
      note: ''
    });
    setActiveNoteModalCell(null);
    setNoteInputText('');
  };

  // Handler Klik Langsung pada Kotak Tanggal di Tabel:
  // - Jika mode CATATAN aktif: buka modal isian catatan
  // - Jika mode warna lain aktif: langsung tandai sesuai warna
  // - Jika sel punya catatan (dan tidak ada mode aktif): buka modal catatan
  // - Default: buka konfirmasi mode warna
  const handleCellClick = (branch, dayObj, entry) => {
    if (activeColorMode === 'NOTE') {
      setActiveNoteModalCell({ branch, dayObj, entry });
      setNoteInputText(entry?.note || '');
      return;
    }

    if (activeColorMode) {
      if (onSetBranchDateColor) {
        onSetBranchDateColor({
          branchId: branch.id,
          dateStr: dayObj.dateStr,
          colorMode: activeColorMode,
          dailyDeposit: branch.daily_deposit
        });
      }
      return;
    }

    if (entry?.hasNote) {
      setActiveNoteModalCell({ branch, dayObj, entry });
      setNoteInputText(entry?.note || '');
      return;
    }

    // Jika belum memilih mode warna di atas, buka pop-up konfirmasi untuk menyetujui mode warna
    setPendingColorOption(MARK_COLOR_OPTIONS[0]); // default biru
  };

  // Quick fill semua hari kerja bulan ini untuk satu cabang
  const handleQuickFillBranchWorkingDays = (branch) => {
    const workingDates = daysList.filter(d => !d.isHoliday).map(d => d.dateStr);
    if (confirm(`Tandai seluruh hari kerja aktif (${workingDates.length} hari) sudah setor untuk ${branch.name}?`)) {
      onQuickFillBranch(branch.id, workingDates, branch.daily_deposit);
    }
  };

  // Handler Ekspor Excel 1 Bulan Penuh
  const handleExportExcel = () => {
    exportRecapToExcel({
      monthMatrixData,
      selectedYear,
      selectedMonth
    });
  };

  return (
    <div className="space-y-4">
      
      {/* 1. Header & Navigasi Bulan / Tahun (Bisa Semua Bulan & Tahun, Mundur/Maju Bebas) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="min-w-0 pr-2">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 whitespace-nowrap">
                Rekap Pembayaran Harian 1 Bulan Penuh
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100 whitespace-nowrap">
                {currentMonthName} {selectedYear}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tampilan 1 layer dari tanggal 1 hingga akhir bulan ({daysList.length} hari). Geser ke kanan untuk melihat akhir bulan, klik panah kiri untuk mundur ke bulan sebelumnya.
            </p>
          </div>

          {/* Kontrol Cepat: Navigasi Bulan, Tahun & Hari Ini - SATU BARIS */}
          <div className="flex items-center gap-2 shrink-0 flex-nowrap overflow-x-auto no-scrollbar">
            
            {/* Tombol Lompat ke Hari Ini (Live) */}
            <button
              type="button"
              onClick={handleJumpToToday}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border whitespace-nowrap shrink-0 cursor-pointer ${
                isViewingToday
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Kembali ke Bulan & Hari Ini (Real-Time Live)"
            >
              <span className={`w-2 h-2 rounded-full ${isViewingToday ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
              <span>{isViewingToday ? 'Live Hari Ini' : 'Hari Ini'}</span>
            </button>

            {/* Tombol Mundur/Maju 1 Bulan */}
            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shrink-0">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                title="Mundur ke Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                title="Maju ke Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Dropdown Tahun */}
            <select
              value={selectedYear}
              onChange={(e) => setMonthAndYear(selectedMonth, Number(e.target.value))}
              className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0 cursor-pointer"
            >
              {AVAILABLE_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* Tombol Tambah Cabang */}
            <button
              onClick={onOpenAddBranch}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Cabang</span>
            </button>
          </div>
        </div>

        {/* Tab 12 Bulan Sepanjang Tahun Terpilih */}
        <div className="mt-3 flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1">
          {MONTH_NAMES.map((mName, idx) => {
            const mNum = idx + 1;
            const isActive = selectedMonth === mNum;
            return (
              <button
                key={mNum}
                onClick={() => setMonthAndYear(mNum, selectedYear)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title={`Pilih ${mName} ${selectedYear}`}
              >
                <span>{mName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Kalender Hari Libur (Klik Tanggal Merah) */}
      <HolidayManager
        year={selectedYear}
        month={selectedMonth}
        period={{ start_day: 1, end_day: daysList.length }}
        config={holidayConfig}
        dayStats={{
          activeDays: stats.workingDays,
          holidaysCount: stats.holidays
        }}
        onUpdateConfig={onUpdatePeriodConfig}
      />

      {/* 3. Matrix Rekapan Pembayaran Harian 1 Bulan Penuh (1 Layer Tanggal 1 s/d Akhir Bulan) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        
        {/* Header Baris Atas Tabel & Tombol Unduh Excel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Tabel Setoran Harian 1 Bulan Penuh ({currentMonthName} {selectedYear})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center">
              <Info className="w-3.5 h-3.5 text-blue-600 mr-1 shrink-0" />
              <span>
                {activeColorMode ? (
                  <span>Mode <strong className="text-slate-800">{activeOption?.name}</strong> aktif. Klik kotak-kotak tanggal di tabel untuk menandai langsung tanpa pop-up.</span>
                ) : (
                  <span>Pilih warna di Fitur Tandai Tanggal di bawah, lalu klik langsung kotak-kotak tanggal untuk menandai.</span>
                )}
              </span>
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition shadow-sm cursor-pointer"
              title="Unduh seluruh kolom tabel 1 bulan penuh dalam format file Microsoft Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Unduh Excel (1 Bulan Penuh)</span>
            </button>
          </div>
        </div>

        {/* Legend / Indikator Warna Lengkap */}
        <div className="flex flex-wrap items-center gap-3 text-xs mb-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <span className="font-bold text-slate-600 text-[11px] mr-1">Indikator Warna:</span>
          
          <span className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-blue-600 inline-block shadow-xs"></span>
            <span className="text-slate-700 font-medium">Sudah Setor (Biru)</span>
          </span>

          <span className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-400 border border-amber-500 inline-block shadow-xs"></span>
            <span className="text-slate-800 font-bold">Belum Bayar (Kuning)</span>
          </span>

          <span className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-blue-900 border border-blue-800 inline-block shadow-xs"></span>
            <span className="text-slate-700 font-medium">Cabang Suspend (Biru Tua)</span>
          </span>

          <span className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-purple-600 inline-block shadow-xs"></span>
            <span className="text-slate-700 font-medium">Agenda khusus (Ungu)</span>
          </span>

          <span className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-red-100 border border-red-300 inline-block"></span>
            <span className="text-slate-600">Libur Umum (Merah)</span>
          </span>

          <span className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-white border border-slate-300 inline-block"></span>
            <span className="text-slate-500">Mendatang</span>
          </span>

          <span className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-500 inline-flex items-center justify-center shadow-xs border border-white">
              <MessageSquare className="w-2.5 h-2.5 text-white fill-white stroke-white stroke-[1.5]" />
            </span>
            <span className="text-slate-700 font-medium">Ada Catatan (Icon Chat)</span>
          </span>
        </div>

        {/* FITUR TANDAI TANGGAL (DITEMPATKAN DI BAWAH INDIKATOR WARNA) */}
        <div className="mb-3.5 p-3 sm:p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 shadow-xs">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="min-w-0 pr-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide whitespace-nowrap">
                  Fitur Tandai Tanggal
                </span>
                {activeColorMode && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse whitespace-nowrap">
                    Mode Aktif
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Klik salah satu warna atau tombol Catatan, konfirmasi di pop-up, lalu Anda tinggal klik kotak-kotak tanggal pada tabel.
              </p>
            </div>

            {/* Tombol Pilihan Warna - SATU BARIS */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap overflow-x-auto no-scrollbar">
              {MARK_COLOR_OPTIONS.map((opt) => {
                const isActive = activeColorMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPendingColorOption(opt)}
                    className={`inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition border cursor-pointer ${
                      isActive
                        ? `${opt.colorBg} ${opt.colorText} ${opt.colorBorder} ring-2 ${opt.ringColor} ring-offset-1 font-bold shadow-sm`
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                    title={`Klik untuk memilih mode ${opt.name}`}
                  >
                    {opt.id === 'NOTE' ? (
                      <MessageSquare className={`w-3 h-3 ${isActive ? 'text-white fill-white' : 'text-emerald-600'}`} />
                    ) : (
                      <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${opt.colorBg} ${opt.colorBorder} border inline-block shrink-0`}></span>
                    )}
                    <span>{opt.name}</span>
                    {isActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                );
              })}

              {activeColorMode && (
                <button
                  type="button"
                  onClick={() => setActiveColorMode(null)}
                  className="text-xs px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer whitespace-nowrap shrink-0"
                  title="Nonaktifkan mode tandai tanggal"
                >
                  Nonaktifkan
                </button>
              )}
            </div>
          </div>

          {/* Banner Status Mode Aktif */}
          {activeColorMode && (
            <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-2">
                {activeOption?.id === 'NOTE' ? (
                  <span className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <MessageSquare className="w-3 h-3 fill-white" />
                  </span>
                ) : (
                  <span className={`w-3.5 h-3.5 rounded ${activeOption?.colorBg} inline-block shadow-xs shrink-0`}></span>
                )}
                <span className="text-slate-900 font-bold">
                  Mode Aktif: {activeOption?.badgeLabel}
                </span>
                <span className="text-slate-500 hidden sm:inline">
                  {activeOption?.id === 'NOTE'
                    ? '— Silakan klik kotak tanggal pada tabel untuk menambahkan atau mengedit catatan.'
                    : '— Silakan langsung klik kotak-kotak tanggal di bawah untuk menandai.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveColorMode(null)}
                className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer text-left sm:text-right"
              >
                Selesai / Keluar Mode
              </button>
            </div>
          )}
        </div>

        {/* Matrix Spreadsheet Harian 1 Layer (Horizontal Scrollable Tanggal 1 s/d Akhir Bulan) */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[650px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-20 bg-slate-50">
              <tr className="border-b border-slate-200 text-[10px]">
                {/* Kolom Kiri Sticky: Identitas Cabang */}
                <th className="py-2.5 px-3 sticky left-0 z-30 bg-slate-100 border-r border-slate-200 min-w-[220px]">
                  <span className="block text-xs font-bold text-slate-800">Cabang MBG & Tarif Harian</span>
                  <span className="block text-[10px] text-slate-400 font-normal">Klik nama untuk edit info cabang</span>
                </th>

                {/* Kolom Tanggal 1 s/d Akhir Bulan (1 Layer Penuh) */}
                {daysList.map((d) => {
                  const isSun = d.dayOfWeek === 0;
                  const isToday = d.isToday;
                  return (
                    <th
                      key={d.dayNumber}
                      className={`py-2 px-1 text-center min-w-[38px] border-r border-slate-200 transition-colors ${
                        isToday
                          ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-500 ring-inset'
                          : d.isHoliday
                          ? 'bg-red-50 text-red-700 font-bold'
                          : 'text-slate-600'
                      }`}
                      title={`${d.dateStr} (${d.isHoliday ? 'Libur Umum' : 'Hari Kerja'})${isToday ? ' - HARI INI' : ''}`}
                    >
                      {isToday && (
                        <span className="block text-[8px] uppercase tracking-wider text-blue-100 font-extrabold -mb-0.5">
                          Hari Ini
                        </span>
                      )}
                      <span className="block font-bold text-xs">{d.dayNumber}</span>
                      <span className={`block uppercase font-medium ${isToday ? 'text-blue-100' : isSun ? 'text-red-500' : 'text-slate-400'}`}>
                        {SHORT_DAY_NAMES[d.dayOfWeek]}
                      </span>
                    </th>
                  );
                })}

                {/* Kolom Kanan Sticky: Total Rekap & Aksi WA */}
                <th className="py-2.5 px-3 sticky right-0 z-30 bg-slate-100 border-l border-slate-200 text-center min-w-[240px]">
                  <span className="block text-xs font-bold text-slate-800">Total Rekap & Aksi WA</span>
                  <span className="block text-[10px] text-slate-400 font-normal">Bulan {currentMonthName}</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {branchMatrix.map((b) => {
                const isLunas = b.isLunas;
                const isCurrentlySuspended = b.isCurrentlySuspended;

                return (
                  <tr 
                    key={b.branch.id} 
                    className={`hover:bg-slate-50/80 transition ${isLunas ? 'bg-emerald-50/20' : ''}`}
                  >
                    {/* Kolom Kiri Sticky: Identitas Cabang, Tarif, Status Suspend & Quick Fill */}
                    <td className="py-2.5 px-3 sticky left-0 z-10 bg-white border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => onOpenEditBranch(b.branch)}
                              className="font-bold text-slate-900 hover:text-blue-600 text-left transition text-xs block cursor-pointer"
                              title="Klik untuk edit data cabang"
                            >
                              {b.branch.name}
                            </button>
                            {isCurrentlySuspended && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-900 text-white border border-blue-800" title="Cabang ini sedang dalam status suspend">
                                SUSPEND
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="text-[11px] font-semibold text-blue-700">
                              {formatRupiah(b.branch.daily_deposit)}/hari
                            </span>
                            <span className="text-[10px] text-slate-400">• {b.branch.address || 'Magelang'}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          {/* Tombol Atur Suspend Cabang */}
                          <button
                            type="button"
                            onClick={() => setSelectedBranchForSuspend(b.branch)}
                            className="text-[10px] font-semibold text-slate-500 hover:text-slate-900 p-1 rounded hover:bg-slate-100 transition inline-flex items-center space-x-0.5 cursor-pointer"
                            title="Atur status Suspend Cabang (Rentang tanggal / Selamanya)"
                          >
                            <Pause className="w-3 h-3 text-slate-500" />
                            <span>Suspend</span>
                          </button>

                          {/* Tombol Quick Fill Semua Hari Kerja */}
                          <button
                            onClick={() => handleQuickFillBranchWorkingDays(b.branch)}
                            className="text-[10px] font-semibold text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-100 transition cursor-pointer"
                            title="Tandai seluruh hari kerja bulan ini lunas"
                          >
                            +Semua
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Kolom Tanggal (1 s/d Akhir Bulan) dengan Kotak-Kotak Tanggal */}
                    {daysList.map((d) => {
                      const entry = b.dailyEntries.find(e => e.dayNumber === d.dayNumber);
                      const isToday = d.isToday;
                      const status = entry?.status || 'UPCOMING';

                      return (
                        <td
                          key={d.dayNumber}
                          className={`p-1 text-center border-r border-slate-200 transition ${
                            isToday ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleCellClick(b.branch, d, entry)}
                            title={`Tgl ${d.dayNumber}: ${
                              status === 'HOLIDAY' 
                                ? 'Libur Umum' 
                                : status === 'SUSPENDED'
                                ? `Cabang Suspend (${entry.suspensionInfo?.reason || 'Non-aktif'})`
                                : status === 'SPECIAL_CLOSED'
                                ? `Agenda khusus: ${entry.specialDay?.reason || 'Agenda Khusus Cabang'}`
                                : status === 'PAID'
                                ? `Sudah Setor: ${formatRupiah(entry.amount)}`
                                : status === 'OVERDUE'
                                ? `Belum Bayar (Kewajiban: ${formatRupiah(b.branch.daily_deposit)})`
                                : `Mendatang (Kewajiban: ${formatRupiah(b.branch.daily_deposit)})`
                            }${entry?.hasNote ? ` • [Catatan: "${entry.note}"]` : ''}${isToday ? ' [HARI INI]' : ''}`}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[10px] flex items-center justify-center mx-auto transition-all relative cursor-pointer ${
                              isToday ? 'ring-2 ring-blue-500 ring-offset-1 z-10' : ''
                            } ${
                              status === 'HOLIDAY'
                                ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 font-medium'
                                : status === 'SUSPENDED'
                                ? 'bg-blue-900 hover:bg-blue-800 text-white border border-blue-800 font-black shadow-sm'
                                : status === 'SPECIAL_CLOSED'
                                ? 'bg-purple-600 hover:bg-purple-700 text-white border border-purple-700 font-black shadow-sm'
                                : status === 'PAID'
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-bold'
                                : status === 'OVERDUE'
                                ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 border border-amber-500 font-black shadow-sm ring-1 ring-amber-400/50'
                                : 'bg-white hover:bg-slate-100 text-slate-400 border border-slate-200 hover:border-blue-400 font-medium'
                            }`}
                          >
                            {/* Icon Komentar / Chat di bagian atas kotak tanggal yang memiliki catatan */}
                            {entry?.hasNote && (
                              <span 
                                className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 shadow-xs z-20 flex items-center justify-center border border-white"
                                title={`Catatan: ${entry.note}`}
                              >
                                <MessageSquare className="w-2.5 h-2.5 fill-white text-white stroke-white stroke-[1.5]" />
                              </span>
                            )}

                            {status === 'HOLIDAY' ? (
                              <span className="text-[9px]">Libur</span>
                            ) : status === 'SUSPENDED' ? (
                              <span className="text-[9px] uppercase tracking-tighter font-bold">SUSP</span>
                            ) : status === 'SPECIAL_CLOSED' ? (
                              <span className="text-[8px] uppercase tracking-tighter font-bold">AGENDA</span>
                            ) : status === 'PAID' ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : status === 'OVERDUE' ? (
                              <span className="text-[10px] font-black">!</span>
                            ) : (
                              <span>-</span>
                            )}
                          </button>
                        </td>
                      );
                    })}

                    {/* Kolom Kanan Sticky: Total Tagihan, Sisa, Nunggak & Aksi WA */}
                    <td className="py-2.5 px-3 sticky right-0 z-10 bg-white border-l border-slate-200 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 text-xs">
                              {formatRupiah(b.totalPaid)}
                            </span>
                            {isLunas ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                                Lunas
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                                Kurang {formatRupiah(b.remainingAmount)}
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Setor: {b.paidWorkingDaysCount}/{b.workingDaysCount} hari kerja
                          </div>

                          {b.overdueDates && b.overdueDates.length > 0 && (
                            <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                              {b.overdueDates.length} Hari Menunggak
                            </span>
                          )}
                        </div>

                        {/* Tombol Kirim Tagihan WA */}
                        <button
                          onClick={() => handleSendWa(b)}
                          className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            isLunas
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                          }`}
                          title={isLunas ? 'Kirim Laporan Pelunasan ke WA' : 'Kirim Penagihan & Rincian Belum Setor ke WA'}
                        >
                          <Send className="w-3 h-3" />
                          <span>WA</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Ringkasan Akumulasi Footer Table */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            Total {branchMatrix.length} Cabang • {stats.workingDays} Hari Kerja Aktif ({stats.holidays} Hari Libur)
          </div>

          <div className="flex flex-wrap items-center gap-4 font-bold">
            <span className="text-slate-700">
              Total Kewajiban: <span className="text-slate-900">{formatRupiah(stats.totalBilling)}</span>
            </span>
            <span className="text-blue-700">
              Total Terkumpul: {formatRupiah(stats.totalPaid)}
            </span>
            <span className={stats.totalRemaining > 0 ? 'text-red-600' : 'text-emerald-600'}>
              Sisa Tagihan: {formatRupiah(stats.totalRemaining)}
            </span>
          </div>
        </div>

      </div>

      {/* POP UP MODAL KONFIRMASI PEMILIHAN FITUR TANDAI TANGGAL */}
      {pendingColorOption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Konfirmasi Fitur Tandai Tanggal
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Persetujuan mode penandaan tanggal pada tabel
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingColorOption(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                <span className={`w-8 h-8 rounded-lg shadow-sm flex items-center justify-center ${pendingColorOption.colorBg} ${pendingColorOption.colorText} shrink-0`}>
                  {pendingColorOption.id === 'BLUE' && <Check className="w-4 h-4 stroke-[3]" />}
                  {pendingColorOption.id === 'YELLOW' && <span className="font-black text-sm">!</span>}
                  {pendingColorOption.id === 'PURPLE' && <span className="text-[9px] font-black uppercase">AGENDA</span>}
                  {pendingColorOption.id === 'DARK_BLUE' && <span className="text-[9px] font-black uppercase">SUSP</span>}
                  {pendingColorOption.id === 'NOTE' && <MessageSquare className="w-4 h-4 fill-white" />}
                  {pendingColorOption.id === 'RESET' && <RotateCcw className="w-4 h-4" />}
                </span>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Mode {pendingColorOption.name}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {pendingColorOption.badgeLabel}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {pendingColorOption.id === 'NOTE' ? (
                  <span>Apakah Anda ingin mengaktifkan mode <strong className="text-slate-900 font-bold">Tambah Catatan Tanggal</strong>?</span>
                ) : (
                  <span>Apakah Anda ingin mengaktifkan mode tanda <strong className="text-slate-900 font-bold">{pendingColorOption.name}</strong>?</span>
                )}
              </p>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
                <p className="font-semibold flex items-center">
                  <Info className="w-3.5 h-3.5 mr-1.5 text-blue-600 shrink-0" />
                  {pendingColorOption.id === 'NOTE' ? 'Alur Pengisian Catatan Tanggal:' : 'Alur Penandaan Cepat:'}
                </p>
                <p className="text-blue-800 text-[11px] leading-relaxed">
                  {pendingColorOption.id === 'NOTE'
                    ? 'Setelah disetujui, Anda cukup klik kotak tanggal pada tabel yang ingin diberi catatan. Pop-up isian catatan akan muncul dan tanggal tersebut akan diberi tanda icon komentar/chat di bagian atas kotaknya.'
                    : `Setelah disetujui, Anda cukup klik langsung kotak-kotak tanggal di Tabel Setoran Harian 1 Bulan Penuh. Tanggal yang diklik akan langsung ditandai dengan warna ${pendingColorOption.name} tanpa membuka pop-up.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingColorOption(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveColorMode(pendingColorOption.id);
                  setPendingColorOption(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition shadow-sm cursor-pointer"
              >
                Setujui & Aktifkan {pendingColorOption.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP UP MODAL INPUT CATATAN TANGGAL */}
      {activeNoteModalCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <MessageSquare className="w-4 h-4 fill-white text-white stroke-white stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Catatan Tanggal
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeNoteModalCell.branch.name} • {activeNoteModalCell.dayObj.dateStr}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveNoteModalCell(null);
                  setNoteInputText('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tuliskan Catatan:
                </label>
                <textarea
                  rows={4}
                  value={noteInputText}
                  onChange={(e) => setNoteInputText(e.target.value)}
                  placeholder="Tuliskan catatan khusus untuk tanggal ini (misal: penundaan setor dengan izin dinas, acara lokal cabang, dispensasi, dll)..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 leading-relaxed text-slate-800"
                  autoFocus
                />
              </div>

              <p className="text-[11px] text-slate-500 flex items-center">
                <Info className="w-3.5 h-3.5 mr-1.5 text-blue-600 shrink-0" />
                Kotak tanggal yang memiliki catatan akan menampilkan icon chat di pojok atasnya.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                {activeNoteModalCell.entry?.hasNote && (
                  <button
                    type="button"
                    onClick={handleDeleteNote}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition cursor-pointer"
                  >
                    Hapus Catatan
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveNoteModalCell(null);
                    setNoteInputText('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition shadow-sm cursor-pointer"
                >
                  Simpan Catatan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Suspend Cabang (Rentang Tanggal atau Selamanya) */}
      <BranchSuspendModal
        isOpen={Boolean(selectedBranchForSuspend)}
        onClose={() => setSelectedBranchForSuspend(null)}
        branch={selectedBranchForSuspend}
        onSaveSuspension={onSaveBranchSuspension}
      />

    </div>
  );
}
