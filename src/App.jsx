import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import RecapPage from './pages/RecapPage';
import BranchManagementPage from './pages/BranchManagementPage';
import BranchModal from './components/BranchModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import PaymentModal from './components/PaymentModal';
import LoginPage from './components/LoginPage';
import ChangePasswordModal from './components/ChangePasswordModal';
import { 
  getFullMonthMatrixData,
  getCompleteRecapData, 
  saveMonthHolidayConfig, 
  toggleDailyPayment,
  saveDailyPaymentRecord,
  saveBranchSpecialDay,
  deleteBranchSpecialDay,
  saveBranchSuspension,
  quickFillWorkingDaysForBranch,
  setBranchDateColor,
  saveDateNote,
  addPayment, 
  deletePayment, 
  saveBranch, 
  deleteBranch,
  getDeletedBranches,
  restoreBranch,
  restoreDefaultBranches,
  permanentDeleteBranch,
  saveBranchNotes
} from './lib/storageService';
import { 
  checkIsLoggedIn, 
  getAdminSession, 
  logoutAdmin, 
  getAndClearSessionExpiredNotice 
} from './lib/authService';
import { MONTH_NAMES } from './lib/initialData';

export default function App() {
  // Autentikasi Admin MBG & Pengaturan Maksimal Sesi 1 Jam
  const [isAuthenticated, setIsAuthenticated] = useState(() => checkIsLoggedIn());
  const [adminSession, setAdminSession] = useState(() => getAdminSession());
  const [sessionNotice, setSessionNotice] = useState(() => getAndClearSessionExpiredNotice());
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('recap'); // Kelola Rekap Pembayaran langsung terbuka

  // Default otomatis mengikuti hari & tanggal real-time saat ini
  const realDate = new Date();
  const [selectedYear, setSelectedYear] = useState(realDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(realDate.getMonth() + 1);
  
  const [monthMatrixData, setMonthMatrixData] = useState(null);
  const [recapData, setRecapData] = useState(null);
  const [deletedBranches, setDeletedBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals Cabang & Pembayaran
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);

  // Modal Konfirmasi Persetujuan Hapus Cabang
  const [branchToDelete, setBranchToDelete] = useState(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBranchRecapForPayment, setSelectedBranchRecapForPayment] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [matrix, recap, deleted] = await Promise.all([
        getFullMonthMatrixData(selectedYear, selectedMonth),
        getCompleteRecapData(selectedYear, selectedMonth),
        getDeletedBranches()
      ]);
      setMonthMatrixData(matrix);
      setRecapData(recap);
      setDeletedBranches(deleted || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [selectedYear, selectedMonth, isAuthenticated]);

  // Watcher batas waktu login maksimal 1 jam & auto-logout aman
  useEffect(() => {
    if (!isAuthenticated) return;

    // Cek batas sesi maksimal 1 jam setiap 10 detik
    const sessionTimer = setInterval(() => {
      const isValid = checkIsLoggedIn();
      if (!isValid) {
        const notice = getAndClearSessionExpiredNotice();
        setSessionNotice(
          notice ||
          'Sesi login Anda telah mencapai batas maksimal 1 jam dan otomatis keluar demi keamanan. Seluruh data telah otomatis tersimpan aman (auto-update). Silakan login kembali.'
        );
        setIsAuthenticated(false);
        setAdminSession(null);
      }
    }, 10000);

    // Auto-update sinkronisasi data berkala setiap 30 detik agar selalu mutakhir
    const autoUpdateTimer = setInterval(() => {
      if (checkIsLoggedIn()) {
        fetchData();
      }
    }, 30000);

    // Cek status sesi & auto update saat user kembali ke tab browser
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        const isValid = checkIsLoggedIn();
        if (!isValid) {
          const notice = getAndClearSessionExpiredNotice();
          setSessionNotice(
            notice ||
            'Sesi login Anda telah mencapai batas maksimal 1 jam dan otomatis keluar demi keamanan. Seluruh data telah otomatis tersimpan aman (auto-update). Silakan login kembali.'
          );
          setIsAuthenticated(false);
          setAdminSession(null);
        } else {
          // Auto update data rekapan saat kembali aktif
          fetchData();
        }
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      clearInterval(sessionTimer);
      clearInterval(autoUpdateTimer);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [isAuthenticated, selectedYear, selectedMonth]);

  // Handle Login & Logout
  const handleLoginSuccess = (session) => {
    setSessionNotice(null);
    setIsAuthenticated(true);
    setAdminSession(session);
    fetchData();
  };

  const handleLogout = () => {
    logoutAdmin(false);
    setSessionNotice(null);
    setIsAuthenticated(false);
    setAdminSession(null);
  };

  // Handle Pemilihan Bulan & Tahun Bersamaan
  const handleSelectMonthAndYear = (month, year) => {
    setSelectedMonth(month);
    if (year) {
      setSelectedYear(year);
    }
  };

  // Handle Update Holiday Config
  const handleUpdatePeriodConfig = async (newConfig) => {
    await saveMonthHolidayConfig(selectedYear, selectedMonth, newConfig);
    await fetchData();
  };

  // Handle 1-Click Toggle Daily Payment
  const handleToggleDailyPayment = async ({ branchId, dateStr, defaultAmount }) => {
    await toggleDailyPayment({ branchId, dateStr, defaultAmount });
    await fetchData();
  };

  // Handle Save / Edit Detailed Daily Payment
  const handleSaveDailyPayment = async (paymentPayload) => {
    await saveDailyPaymentRecord(paymentPayload);
    await fetchData();
  };

  // Handle Save Tanda Khusus Cabang (Warna Ungu: Tutup 1 Hari / Bencana / Libur Cabang)
  const handleSaveBranchSpecialDay = async (payload) => {
    await saveBranchSpecialDay(payload);
    await fetchData();
  };

  const handleDeleteBranchSpecialDay = async (payload) => {
    await deleteBranchSpecialDay(payload);
    await fetchData();
  };

  // Handle Save Suspend Cabang (Warna Biru Tua: Rentang Tanggal atau Selamanya)
  const handleSaveBranchSuspension = async (payload) => {
    await saveBranchSuspension(payload);
    await fetchData();
  };

  // Handle Quick Fill All Working Days for a Branch
  const handleQuickFillBranch = async (branchId, dates, dailyDeposit) => {
    await quickFillWorkingDaysForBranch(branchId, dates, dailyDeposit);
    await fetchData();
  };

  // Handle Fitur Tandai Tanggal (Biru, Kuning, Ungu, Biru Tua, Reset)
  const handleSetBranchDateColor = async ({ branchId, dateStr, colorMode, dailyDeposit }) => {
    await setBranchDateColor({ branchId, dateStr, colorMode, dailyDeposit });
    await fetchData();
  };

  // Handle Tambah / Edit / Hapus Catatan Tanggal
  const handleSaveDateNote = async ({ branchId, dateStr, note }) => {
    await saveDateNote({ branchId, dateStr, note });
    await fetchData();
  };

  // Handle Add Period Payment (Modal)
  const handleAddPayment = async (paymentPayload) => {
    await addPayment(paymentPayload);
    await fetchData();
    setIsPaymentModalOpen(false);
  };

  // Handle Delete Payment
  const handleDeletePayment = async (paymentId) => {
    await deletePayment(paymentId);
    await fetchData();
  };

  // Handle Save Branch (Create / Edit)
  const handleSaveBranch = async (branchData) => {
    await saveBranch(branchData);
    await fetchData();
    setIsBranchModalOpen(false);
    setEditingBranch(null);
  };

  // Handle Request Delete Branch (Buka Pop Up Persetujuan)
  const handleRequestDeleteBranch = (branch) => {
    setBranchToDelete(branch);
    setIsConfirmDeleteOpen(true);
  };

  // Handle Eksekusi Hapus Cabang setelah Persetujuan
  const handleConfirmDeleteBranch = async () => {
    if (!branchToDelete) return;
    setIsDeletingBranch(true);
    try {
      await deleteBranch(branchToDelete.id);
      await fetchData();
      setIsConfirmDeleteOpen(false);
      setBranchToDelete(null);
      if (isBranchModalOpen && editingBranch?.id === branchToDelete.id) {
        setIsBranchModalOpen(false);
        setEditingBranch(null);
      }
    } catch (err) {
      console.error('Failed to delete branch:', err);
      alert('Gagal menghapus cabang.');
    } finally {
      setIsDeletingBranch(false);
    }
  };

  const handleOpenEditBranch = (branch) => {
    setEditingBranch(branch);
    setIsBranchModalOpen(true);
  };

  const handleOpenAddBranch = () => {
    setEditingBranch(null);
    setIsBranchModalOpen(true);
  };

  const handleOpenPaymentModal = (branchRecap) => {
    setSelectedBranchRecapForPayment(branchRecap);
    setIsPaymentModalOpen(true);
  };

  // Handle Restore Cabang yang Terhapus
  const handleRestoreBranch = async (branchId) => {
    await restoreBranch(branchId);
    await fetchData();
  };

  // Handle Restore Seluruh Cabang Default MBG Magelang
  const handleRestoreDefaultBranches = async () => {
    await restoreDefaultBranches();
    await fetchData();
  };

  // Handle Hapus Permanen dari Riwayat Sampah
  const handlePermanentDeleteBranch = async (branchId) => {
    await permanentDeleteBranch(branchId);
    await fetchData();
  };

  // Handle Simpan Catatan Khusus Cabang
  const handleSaveBranchNotes = async ({ branchId, notes }) => {
    await saveBranchNotes({ branchId, notes });
    await fetchData();
  };

  // Jika belum login, tampilkan layar login admin
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} initialNotice={sessionNotice} />;
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navbar Minimalis SaaS dengan Logo Resmi BGN & Kontrol Admin */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddBranch={handleOpenAddBranch}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        onLogout={handleLogout}
        adminSession={adminSession}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {activeTab === 'dashboard' ? (
          <DashboardPage
            recapData={recapData}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            onSelectYear={setSelectedYear}
            onSelectMonthAndYear={handleSelectMonthAndYear}
            onNavigateToRecap={() => setActiveTab('recap')}
            onOpenPaymentModal={handleOpenPaymentModal}
          />
        ) : activeTab === 'branches' ? (
          <BranchManagementPage
            monthMatrixData={monthMatrixData}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onSelectYear={setSelectedYear}
            onSelectMonth={setSelectedMonth}
            onSelectMonthAndYear={handleSelectMonthAndYear}
            onOpenAddBranch={handleOpenAddBranch}
            onOpenEditBranch={handleOpenEditBranch}
            onRequestDeleteBranch={handleRequestDeleteBranch}
            onSaveBranchSuspension={handleSaveBranchSuspension}
            deletedBranches={deletedBranches}
            onRestoreBranch={handleRestoreBranch}
            onPermanentDeleteBranch={handlePermanentDeleteBranch}
            onSaveBranchNotes={handleSaveBranchNotes}
          />
        ) : (
          <RecapPage
            monthMatrixData={monthMatrixData}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onSelectYear={setSelectedYear}
            onSelectMonth={setSelectedMonth}
            onSelectMonthAndYear={handleSelectMonthAndYear}
            onUpdatePeriodConfig={handleUpdatePeriodConfig}
            onToggleDailyPayment={handleToggleDailyPayment}
            onSaveDailyPayment={handleSaveDailyPayment}
            onSaveBranchSpecialDay={handleSaveBranchSpecialDay}
            onDeleteBranchSpecialDay={handleDeleteBranchSpecialDay}
            onSaveBranchSuspension={handleSaveBranchSuspension}
            onQuickFillBranch={handleQuickFillBranch}
            onSetBranchDateColor={handleSetBranchDateColor}
            onSaveDateNote={handleSaveDateNote}
            onOpenEditBranch={handleOpenEditBranch}
            onOpenAddBranch={handleOpenAddBranch}
          />
        )}
      </main>

      {/* Footer Minimalis */}
      <footer className="border-t border-slate-100 py-3 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {selectedYear} Badan Gizi Nasional • MBG Magelang • Rekapan Harian 1 Bulan Penuh</p>
        </div>
      </footer>

      {/* Modals Cabang (Tambah / Edit) */}
      <BranchModal
        isOpen={isBranchModalOpen}
        onClose={() => {
          setIsBranchModalOpen(false);
          setEditingBranch(null);
        }}
        onSave={handleSaveBranch}
        onRequestDelete={handleRequestDeleteBranch}
        branch={editingBranch}
      />

      {/* Modal Konfirmasi Persetujuan Hapus Cabang */}
      <ConfirmDeleteModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => {
          setIsConfirmDeleteOpen(false);
          setBranchToDelete(null);
        }}
        onConfirm={handleConfirmDeleteBranch}
        branchName={branchToDelete?.name}
        isLoading={isDeletingBranch}
      />

      {/* Modal Pembayaran */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedBranchRecapForPayment(null);
        }}
        branchRecap={selectedBranchRecapForPayment}
        period={recapData?.period || { title: `1 Bulan Penuh`, period_index: 1 }}
        monthName={MONTH_NAMES[selectedMonth - 1]}
        year={selectedYear}
        onAddPayment={handleAddPayment}
        onDeletePayment={handleDeletePayment}
      />

      {/* Modal Pengaturan Ganti Kata Sandi Admin */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
}
