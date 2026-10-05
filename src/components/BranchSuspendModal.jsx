import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Calendar, Check, AlertTriangle, Play, Pause } from 'lucide-react';

export default function BranchSuspendModal({
  isOpen,
  onClose,
  branch,
  defaultDateStr,
  onSaveSuspension
}) {
  if (!isOpen || !branch) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const initialSuspension = branch.suspension;
  const isCurrentlySuspended = Boolean(initialSuspension?.isSuspended);

  const [suspendType, setSuspendType] = useState(initialSuspension?.type || 'range');
  const [startDate, setStartDate] = useState(
    initialSuspension?.startDate || defaultDateStr || todayStr
  );
  const [endDate, setEndDate] = useState(
    initialSuspension?.endDate || defaultDateStr || todayStr
  );
  const [reason, setReason] = useState(initialSuspension?.reason || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (branch?.suspension) {
      setSuspendType(branch.suspension.type || 'range');
      setStartDate(branch.suspension.startDate || todayStr);
      setEndDate(branch.suspension.endDate || todayStr);
      setReason(branch.suspension.reason || '');
    } else {
      setSuspendType('range');
      setStartDate(defaultDateStr || todayStr);
      setEndDate(defaultDateStr || todayStr);
      setReason('');
    }
  }, [branch, defaultDateStr, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (suspendType === 'range' && endDate && startDate > endDate) {
      alert('Tanggal selesai suspend tidak boleh lebih awal dari tanggal mulai.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveSuspension({
        branchId: branch.id,
        isSuspended: true,
        type: suspendType,
        startDate,
        endDate: suspendType === 'permanent' ? null : endDate,
        reason: reason.trim() || 'Cabang disuspend'
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan status suspend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeSuspension = async () => {
    if (confirm(`Cabut status suspend untuk cabang "${branch.name}"? Cabang akan kembali aktif normal.`)) {
      setIsSubmitting(true);
      try {
        await onSaveSuspension({
          branchId: branch.id,
          isSuspended: false
        });
        onClose();
      } catch (err) {
        console.error(err);
        alert('Gagal mencabut status suspend.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-slate-900 text-blue-300">
              <Pause className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Atur Suspend Cabang
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {branch.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banner */}
        <div className={`mt-4 p-3 rounded-xl border text-xs ${
          isCurrentlySuspended 
            ? 'bg-slate-900 text-slate-100 border-slate-950' 
            : 'bg-blue-50/60 text-slate-700 border-blue-100'
        }`}>
          <div className="flex items-start space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 bg-blue-400"></span>
            <div>
              <span className="font-bold block">
                {isCurrentlySuspended 
                  ? 'Cabang Sedang Dalam Status Suspend (Warna Biru Tua)' 
                  : 'Cabang Aktif Normal'}
              </span>
              <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed">
                Warna <span className="font-bold text-blue-300">Biru Tua</span> akan ditampilkan pada tabel rekap untuk tanggal suspend. Hari suspend dibebaskan dari kewajiban setoran dan tidak dihitung menunggak.
              </p>
            </div>
          </div>
        </div>

        {/* Form Suspend */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          
          {/* Pilihan Durasi */}
          <div>
            <label className="block font-bold text-slate-700 mb-2">
              Tipe Durasi Suspend
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSuspendType('range')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition ${
                  suspendType === 'range'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Rentang Tanggal
              </button>
              <button
                type="button"
                onClick={() => setSuspendType('permanent')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition ${
                  suspendType === 'permanent'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Selamanya (Permanen)
              </button>
            </div>
          </div>

          {/* Form Tanggal */}
          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {suspendType === 'permanent' ? 'Mulai Tanggal Suspend *' : 'Tanggal Mulai *'}
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {suspendType === 'range' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Sampai Tanggal Selesai *
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Alasan Suspend */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Alasan Suspend (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Renovasi dapur, evaluasi kepatuhan MBG, kendala operasional"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            {isCurrentlySuspended ? (
              <button
                type="button"
                onClick={handleRevokeSuspension}
                disabled={isSubmitting}
                className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition border border-red-200"
              >
                Cabut Suspend
              </button>
            ) : <div />}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:bg-black rounded-xl shadow-sm transition flex items-center space-x-1.5"
              >
                <span>{isCurrentlySuspended ? 'Update Suspend' : 'Aktifkan Suspend'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
