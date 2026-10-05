import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  branchName,
  isLoading = false
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative">
        {/* Tombol Tutup */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Konfirmasi */}
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <div className="flex-1 pr-4">
            <h3 className="text-base font-bold text-slate-900">
              Konfirmasi Hapus Cabang
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Apakah Anda yakin ingin menghapus cabang berikut?
            </p>
          </div>
        </div>

        {/* Box Detail Cabang */}
        <div className="mt-4 p-3.5 rounded-xl bg-red-50/50 border border-red-100 text-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Nama Cabang MBG:
          </span>
          <p className="text-sm font-bold text-red-950 mt-0.5">
            {branchName || 'Cabang MBG'}
          </p>
        </div>

        <p className="text-xs text-slate-500 mt-3 leading-relaxed flex items-start">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mr-1.5 shrink-0 mt-0.5" />
          <span><strong className="font-semibold text-slate-700">Perhatian:</strong> Tindakan ini bersifat permanen. Seluruh data rekap setoran harian dan konfigurasi cabang ini akan dihapus dari sistem.</span>
        </p>

        {/* Tombol Aksi Persetujuan */}
        <div className="flex items-center justify-end space-x-2 mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-md shadow-red-500/20 transition disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Cabang Ini</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
