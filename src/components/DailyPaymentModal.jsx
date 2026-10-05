import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Calendar, DollarSign, AlertCircle, ShieldAlert, Sparkles, Pause, CloudRain } from 'lucide-react';
import { formatRupiah, DAY_NAMES } from '../lib/initialData';

export default function DailyPaymentModal({
  isOpen,
  onClose,
  cellData, // { branch, dateStr, dayNumber, isHoliday, entry }
  onSavePayment,
  onSaveSpecialDay,
  onDeleteSpecialDay,
  onOpenSuspendModal
}) {
  if (!isOpen || !cellData) return null;

  const { branch, dateStr, dayNumber, isHoliday, entry } = cellData;
  const dayName = DAY_NAMES[new Date(dateStr).getDay()];

  // Cek status khusus saat ini
  const isSpecialClosed = entry?.status === 'SPECIAL_CLOSED' || Boolean(entry?.specialDay);
  const isSuspended = entry?.status === 'SUSPENDED' || Boolean(entry?.suspensionInfo);
  const isPaid = Boolean(entry?.isPaid);
  const isOverdue = entry?.status === 'OVERDUE' || Boolean(entry?.isOverdue);

  // Tab aktif
  const [activeTab, setActiveTab] = useState(
    isSpecialClosed ? 'special' : isSuspended ? 'suspend' : 'payment'
  );

  // State Form Pembayaran
  const [amount, setAmount] = useState(entry?.amount || branch.daily_deposit);
  const [paymentMethod, setPaymentMethod] = useState(entry?.payment?.paymentMethod || 'Transfer Bank');
  const [notes, setNotes] = useState(entry?.payment?.notes || '');

  // State Form Khusus Cabang (Ungu)
  const [specialType, setSpecialType] = useState(entry?.specialDay?.type || 'tutup');
  const [specialReason, setSpecialReason] = useState(entry?.specialDay?.reason || '');

  useEffect(() => {
    if (entry && entry.isPaid) {
      setAmount(entry.amount);
      setPaymentMethod(entry.payment?.paymentMethod || 'Transfer Bank');
      setNotes(entry.payment?.notes || '');
    } else {
      setAmount(branch.daily_deposit);
      setPaymentMethod('Transfer Bank');
      setNotes('');
    }

    if (entry?.specialDay) {
      setSpecialType(entry.specialDay.type || 'tutup');
      setSpecialReason(entry.specialDay.reason || '');
    } else {
      setSpecialType('tutup');
      setSpecialReason('');
    }

    setActiveTab(isSpecialClosed ? 'special' : isSuspended ? 'suspend' : 'payment');
  }, [cellData]);

  // Handler Submit Pembayaran
  const handleSubmitPayment = (e) => {
    e.preventDefault();
    onSavePayment({
      branchId: branch.id,
      dateStr,
      amount: Number(amount || 0),
      paymentMethod,
      notes: notes.trim()
    });
    onClose();
  };

  const handleDeletePayment = () => {
    onSavePayment({
      branchId: branch.id,
      dateStr,
      amount: 0
    });
    onClose();
  };

  // Handler Khusus Cabang (Ungu)
  const handleSaveSpecial = async (e) => {
    e.preventDefault();
    if (onSaveSpecialDay) {
      await onSaveSpecialDay({
        branchId: branch.id,
        dateStr,
        type: specialType,
        reason: specialReason.trim() || 'Tutup / Bencana / Libur Khusus Cabang'
      });
    }
    onClose();
  };

  const handleDeleteSpecial = async () => {
    if (onDeleteSpecialDay) {
      await onDeleteSpecialDay({
        branchId: branch.id,
        dateStr
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Kelola Tanggal & Setoran
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {branch.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Tanggal & Badge Status Saat Ini */}
        <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-800 font-bold block">{dayName}, {dateStr}</span>
            <span className="text-[11px] text-slate-500">
              Tarif Tetap: {formatRupiah(branch.daily_deposit)}/hari
            </span>
          </div>

          <div>
            {isHoliday ? (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                Libur Umum
              </span>
            ) : isSuspended ? (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900 text-blue-200 border border-slate-950">
                Cabang Suspend
              </span>
            ) : isSpecialClosed ? (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-600 text-white border border-purple-700">
                Khusus Cabang
              </span>
            ) : isPaid ? (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-600 text-white border border-blue-700">
                Sudah Setor
              </span>
            ) : isOverdue ? (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-400 text-slate-950 border border-amber-500">
                Belum Bayar (Jatuh Tempo)
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Mendatang
              </span>
            )}
          </div>
        </div>

        {/* Navigasi Tab */}
        <div className="mt-3.5 flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('payment')}
            className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition ${
              activeTab === 'payment'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Setoran (Biru)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('special')}
            className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition ${
              activeTab === 'special'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Tutup/Bencana (Ungu)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('suspend')}
            className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition ${
              activeTab === 'suspend'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Suspend (Biru Tua)
          </button>
        </div>

        {/* TAB 1: FORM PEMBAYARAN */}
        {activeTab === 'payment' && (
          <form onSubmit={handleSubmitPayment} className="mt-4 space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Nominal Setoran (Rp)
              </label>
              <input
                type="number"
                required
                min="0"
                step="10000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {amount > 0 && (
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  {formatRupiah(amount)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Metode Pembayaran
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="Setoran Tunai">Setoran Tunai</option>
                <option value="QRIS">QRIS</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Catatan (Opsional)
              </label>
              <input
                type="text"
                placeholder="Bukti transfer / keterangan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              {entry?.isPaid ? (
                <button
                  type="button"
                  onClick={handleDeletePayment}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Setoran</span>
                </button>
              ) : <div />}

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition"
                >
                  Simpan Setoran
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: TANDA KHUSUS CABANG (WARNA UNGU) */}
        {activeTab === 'special' && (
          <form onSubmit={handleSaveSpecial} className="mt-4 space-y-3.5 text-xs">
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-purple-900 leading-relaxed text-[11px]">
              Tanda khusus <span className="font-bold text-purple-700">Warna Ungu</span> ini hanya berlaku untuk cabang <strong>{branch.name}</strong> pada tanggal <strong>{dateStr}</strong> (bebas setoran & tidak dihitung menunggak).
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Kondisi / Alasan Khusus
              </label>
              <select
                value={specialType}
                onChange={(e) => setSpecialType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="tutup">Tutup 1 Hari (Operasional Cabang Libur)</option>
                <option value="bencana">Bencana Alam / Force Majeure (Banjir, Longsor, Gempa)</option>
                <option value="libur">Liburan Khusus Sekolah / Cabang Ini Saja</option>
                <option value="renovasi">Renovasi Dapur / Kendala Teknis Listrik/Air</option>
                <option value="lainnya">Lainnya (Kondisi Khusus)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Keterangan Singkat
              </label>
              <input
                type="text"
                placeholder="Contoh: Terendam banjir, perbaikan instalasi gas, dll."
                value={specialReason}
                onChange={(e) => setSpecialReason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              {isSpecialClosed ? (
                <button
                  type="button"
                  onClick={handleDeleteSpecial}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Tanda Ungu</span>
                </button>
              ) : <div />}

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition"
                >
                  Tandai Ungu
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 3: PENGATURAN SUSPEND (WARNA BIRU TUA) */}
        {activeTab === 'suspend' && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="p-3.5 bg-slate-900 rounded-xl text-slate-100">
              <div className="flex items-center space-x-2 mb-1">
                <Pause className="w-4 h-4 text-blue-300" />
                <span className="font-bold text-xs">Status Suspend Cabang (Biru Tua)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Status suspend dapat disetel untuk rentang tanggal tertentu atau selamanya. Anda dapat mengonfigurasi atau mencabut suspend secara fleksibel.
              </p>
              {branch.suspension?.isSuspended && (
                <div className="mt-2 pt-2 border-t border-slate-800 text-[11px]">
                  <span className="font-bold text-blue-200">Aktif: </span>
                  {branch.suspension.type === 'permanent' 
                    ? `Selamanya (Mulai ${branch.suspension.startDate})` 
                    : `Rentang ${branch.suspension.startDate} s/d ${branch.suspension.endDate}`}
                  {branch.suspension.reason && (
                    <span className="block text-slate-400 mt-0.5">Catatan: {branch.suspension.reason}</span>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenSuspendModal) {
                    onOpenSuspendModal(branch, dateStr);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition"
              >
                {branch.suspension?.isSuspended ? 'Ubah / Cabut Suspend' : 'Atur Suspend Cabang'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
