import { formatRupiah } from './initialData';

export function sanitizeWaNumber(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function buildWaMessage({
  branchName,
  monthName,
  year,
  dailyDeposit,
  activeDays,
  totalBilling,
  totalPaid,
  remainingAmount,
  isLunas,
  unpaidDates = []
}) {
  if (isLunas) {
    return (
`*LAPORAN SETORAN MBG - LUNAS*
Kabupaten / Kota Magelang

Halo Yth. Pengelola Cabang *${branchName}*,

Terima kasih atas kerja samanya. Pembayaran setoran Makan Bergizi Gratis (MBG) untuk:
• *Bulan:* ${monthName} ${year}
• *Total Hari Kerja Wajib:* ${activeDays} hari
• *Tarif Setoran Harian:* ${formatRupiah(dailyDeposit)}/hari
• *Total Kewajiban:* ${formatRupiah(totalBilling)}
• *Sudah Disetor:* ${formatRupiah(totalPaid)}

*STATUS: LUNAS*
Seluruh setoran hari kerja telah terisi penuh. Terima kasih banyak!`
    );
  }

  const unpaidDatesText = unpaidDates.length > 0 
    ? `\n*Tanggal Belum Menyetor (${unpaidDates.length} Hari):*\n• Tanggal: ${unpaidDates.map(d => `Tgl ${d}`).join(', ')}`
    : '';

  return (
`*PEMBERITAHUAN SETORAN MBG*
Kabupaten / Kota Magelang

Halo Yth. Pengelola Cabang *${branchName}*,

Berikut adalah Rekapan Pembayaran Setoran MBG:
• *Bulan:* ${monthName} ${year}
• *Hari Kerja Wajib:* ${activeDays} hari (hari libur tidak dihitung)
• *Tarif Setoran Harian:* ${formatRupiah(dailyDeposit)}/hari
• *Total Kewajiban:* ${formatRupiah(totalBilling)}
• *Sudah Disetor:* ${formatRupiah(totalPaid)}
• *Sisa Kurang Bayar:* ${formatRupiah(remainingAmount)}${unpaidDatesText}

Mohon bantuannya untuk segera melakukan penyetoran dan konfirmasi pelunasan untuk tanggal-tanggal yang belum terisi di atas.

Terima kasih atas perhatian dan kerja samanya.`
  );
}

export function getWaUrl(phone, messageText) {
  const sanitized = sanitizeWaNumber(phone);
  if (!sanitized) return null;
  const encodedText = encodeURIComponent(messageText);
  return `https://wa.me/${sanitized}?text=${encodedText}`;
}
