import React, { useState } from 'react';
import { LayoutDashboard, FileSpreadsheet, Building2, Plus, KeyRound, LogOut, UserCheck, Clock } from 'lucide-react';
import logoBgn from '../assets/logo-bgn.png';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onOpenAddBranch,
  onOpenChangePassword,
  onLogout,
  adminSession
}) {
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-18 py-1.5">
          
          {/* Logo Resmi Badan Gizi Nasional - Ukuran Pas & Proporsional */}
          <div className="flex items-center">
            <img 
              src={logoBgn} 
              alt="Badan Gizi Nasional" 
              className="h-9 sm:h-10 md:h-11 w-auto max-h-11 object-contain transition-all" 
            />
          </div>

          {/* Navigasi Bersih: Dashboard vs Kelola Rekap Pembayaran vs Kelola Cabang */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-slate-700" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('recap')}
              className={`flex items-center space-x-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'recap'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-700" />
              <span>Kelola Rekap Pembayaran</span>
            </button>

            <button
              onClick={() => setActiveTab('branches')}
              className={`flex items-center space-x-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'branches'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-4 h-4 text-slate-700" />
              <span>Kelola Cabang</span>
            </button>
          </nav>

          {/* Action Kanan: Tambah Cabang & Menu Admin (Ganti Sandi + Logout) */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Tombol Tambah Cabang */}
            <button
              onClick={onOpenAddBranch}
              className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-sm"
              title="Tambah Cabang Baru"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Tambah Cabang</span>
            </button>

            {/* Menu Admin & Pengaturan Sandi */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAdminDropdown(!showAdminDropdown)}
                className="flex items-center space-x-1.5 px-2.5 py-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                title="Menu Akun"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase">
                  {(adminSession?.username || 'U')[0]}
                </div>
                <span className="hidden md:inline capitalize">{adminSession?.username || 'Akun'}</span>
              </button>

              {/* Dropdown Menu Akun */}
              {showAdminDropdown && (
                <>
                  {/* Backdrop klik luar untuk menutup dropdown */}
                  <div 
                    className="fixed inset-0 z-30"
                    onClick={() => setShowAdminDropdown(false)}
                  />
                  
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 animate-fadeIn">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 capitalize">
                        {adminSession?.name || adminSession?.username || 'Pengguna'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        @{adminSession?.username || 'user'}
                      </p>
                      <div className="mt-1.5 flex items-center space-x-1.5 text-[10px] text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg font-medium">
                        <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                        <span>Sesi Maks. 1 Jam • Auto-Update</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setShowAdminDropdown(false);
                        onOpenChangePassword();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2 transition"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ganti Kata Sandi</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowAdminDropdown(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center space-x-2 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
