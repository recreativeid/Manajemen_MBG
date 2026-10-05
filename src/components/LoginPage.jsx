import React, { useState, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, ArrowRight, Clock, ShieldCheck } from 'lucide-react';
import { loginAdmin, getAndClearSessionExpiredNotice } from '../lib/authService';
import logoBgn from '../assets/logo-bgn.png';

export default function LoginPage({ onLoginSuccess, initialNotice = null }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sessionNotice, setSessionNotice] = useState(() => initialNotice || getAndClearSessionExpiredNotice());
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      const res = loginAdmin(username, password);
      if (res.success) {
        onLoginSuccess(res.session);
      } else {
        setErrorMsg(res.error || 'Kata sandi atau username salah.');
      }
      setIsLoading(false);
    }, 250);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 selection:bg-blue-100 selection:text-blue-900">
      <div className="w-full max-w-md">
        
        {/* Card Login */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 p-6 sm:p-8">
          
          {/* Logo Resmi Badan Gizi Nasional */}
          <div className="flex flex-col items-center text-center mb-5">
            <img 
              src={logoBgn} 
              alt="Badan Gizi Nasional" 
              className="h-12 sm:h-14 w-auto max-h-16 object-contain mb-3" 
            />
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Sistem Rekapan MBG Magelang
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Portal Rekapan & Setoran Harian Cabang Makan Bergizi Gratis
            </p>
          </div>

          {/* Form Login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Notifikasi Sesi Maksimal 1 Jam Berakhir */}
            {sessionNotice && (
              <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs">
                <div className="flex items-start space-x-2.5">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-amber-900">
                      Sesi Login Berakhir (Maksimal 1 Jam)
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      {sessionNotice}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Input Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username..."
                  required
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Input Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Kata Sandi
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  required
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Tombol Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Masuk</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-4">
          © {new Date().getFullYear()} Badan Gizi Nasional • Wilayah Magelang
        </p>

      </div>
    </div>
  );
}
