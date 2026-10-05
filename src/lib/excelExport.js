import * as XLSX from 'xlsx';
import { MONTH_NAMES, SHORT_DAY_NAMES } from './initialData';

/**
 * Ekspor Rekapan MBG ke format file Microsoft Excel (.xlsx)
 * Satu layer 1 Bulan Penuh (Tgl 1 s/d Akhir Bulan) dengan susunan kolom sama persis dengan tabel.
 */
export function exportRecapToExcel({
  monthMatrixData,
  selectedYear,
  selectedMonth
}) {
  if (!monthMatrixData) return;

  const { daysList, branchMatrix, stats } = monthMatrixData;
  const monthName = MONTH_NAMES[selectedMonth - 1];
  const targetDays = daysList;

  // 1. Bangun Baris Data Excel (Array of Arrays)
  const rows = [];

  // Judul & Metadata Laporan
  rows.push(['BADAN GIZI NASIONAL - REKAPAN PEMBAYARAN MBG WILAYAH MAGELANG']);
  rows.push([`Bulan: ${monthName} ${selectedYear} | Tampilan: 1 Bulan Penuh (${daysList.length} Hari)`]);
  rows.push([`Waktu Unduh: ${new Date().toLocaleString('id-ID')}`]);
  rows.push([]); // Baris kosong

  // Header Tabel Baris 1: Informasi Dasar, Tanggal-Tanggal, dan Ringkasan
  const headerRow1 = [
    'No',
    'Nama Cabang MBG',
    'Alamat Cabang',
    'No. WhatsApp',
    'Tarif Setoran/Hari'
  ];

  // Header Tanggal
  targetDays.forEach(d => {
    const dayStatus = d.isHoliday ? ' (Libur)' : '';
    headerRow1.push(`Tgl ${d.dayNumber} [${SHORT_DAY_NAMES[d.dayOfWeek]}${dayStatus}]`);
  });

  // Header Total & Status
  headerRow1.push(
    'Total Hari Wajib Setor',
    'Hari Sudah Setor',
    'Total Tagihan (Rp)',
    'Total Disetor (Rp)',
    'Sisa Kurang Bayar (Rp)',
    'Status Pelunasan'
  );

  rows.push(headerRow1);

  // 2. Baris Data Setiap Cabang
  let grandTotalBilling = 0;
  let grandTotalPaid = 0;
  let grandTotalRemaining = 0;

  branchMatrix.forEach((b, index) => {
    const rowData = [
      index + 1,
      b.branch.name,
      b.branch.address || '-',
      b.branch.phone_wa || '-',
      b.branch.daily_deposit
    ];

    // Kolom per hari
    targetDays.forEach(d => {
      const entry = b.dailyEntries.find(e => e.dayNumber === d.dayNumber);
      if (entry?.isHoliday) {
        rowData.push('LIBUR');
      } else if (entry?.isSuspended) {
        rowData.push('SUSPEND');
      } else if (entry?.isSpecialClosed) {
        rowData.push(`KHUSUS (${entry.specialDay?.reason || 'TUTUP/BENCANA'})`);
      } else if (entry?.isPaid) {
        rowData.push(Number(entry.amount || b.branch.daily_deposit));
      } else if (entry?.isOverdue) {
        rowData.push('BELUM SETOR');
      } else {
        rowData.push('-'); // Mendatang
      }
    });

    grandTotalBilling += b.totalBilling;
    grandTotalPaid += b.totalPaid;
    grandTotalRemaining += b.remainingAmount;

    // Kolom Ringkasan
    rowData.push(
      b.workingDaysCount,
      b.paidWorkingDaysCount,
      b.totalBilling,
      b.totalPaid,
      b.remainingAmount,
      b.isLunas ? 'LUNAS' : 'KURANG BAYAR'
    );

    rows.push(rowData);
  });

  // 3. Baris Total Akumulasi
  const totalRow = [
    'TOTAL',
    `Total ${branchMatrix.length} Cabang`,
    '',
    '',
    ''
  ];

  targetDays.forEach(() => {
    totalRow.push('');
  });

  totalRow.push(
    stats.workingDays,
    '',
    grandTotalBilling,
    grandTotalPaid,
    grandTotalRemaining,
    grandTotalRemaining === 0 ? 'SEMUA LUNAS' : 'ADA TUNGGAKAN'
  );

  rows.push(totalRow);

  // 4. Buat Worksheet & Workbook
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  const colWidths = [
    { wch: 5 },  // No
    { wch: 28 }, // Nama Cabang
    { wch: 25 }, // Alamat
    { wch: 16 }, // No WA
    { wch: 18 }  // Tarif Harian
  ];

  targetDays.forEach(() => {
    colWidths.push({ wch: 14 }); // Kolom Tanggal
  });

  colWidths.push(
    { wch: 20 }, // Total Hari Wajib Setor
    { wch: 16 }, // Hari Sudah Setor
    { wch: 20 }, // Total Tagihan
    { wch: 20 }, // Total Disetor
    { wch: 22 }, // Sisa Kurang Bayar
    { wch: 18 }  // Status
  );

  worksheet['!cols'] = colWidths;

  const sheetName = `Rekap ${monthName.slice(0, 3)} ${selectedYear}`;
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // 5. Nama File Excel
  const safeMonth = monthName.replace(/\s+/g, '_');
  const fileName = `Rekap_MBG_Magelang_${safeMonth}_${selectedYear}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}
