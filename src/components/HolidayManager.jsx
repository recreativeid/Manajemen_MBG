import React from 'react';
import { Calendar as CalendarIcon, Check } from 'lucide-react';
import { SHORT_DAY_NAMES, MONTH_NAMES } from '../lib/initialData';

export default function HolidayManager({
  year,
  month,
  period,
  config,
  dayStats,
  onUpdateConfig
}) {
  const customHolidays = config?.customHolidays || [];
  const weeklyHolidays = config?.weeklyHolidays || [0]; // default: 0 = Minggu

  // Hitung jumlah hari dalam bulan ini
  const daysInMonth = new Date(year, month, 0).getDate();
  // Hari pertama bulan ini jatuh pada hari apa (0 = Minggu, 1 = Senin, dst.)
  const firstDayIndex = new Date(year, month - 1, 1).getDay();

  // Helper memeriksa apakah tanggal tertentu adalah hari libur
  const checkIsHoliday = (dayNumber) => {
    const d = new Date(year, month - 1, dayNumber);
    const dayOfWeek = d.getDay();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    
    // Libur jika ada di customHolidays ATAU di weeklyHolidays
    const isCustom = customHolidays.includes(dateStr);
    const isWeekly = weeklyHolidays.includes(dayOfWeek);

    // Jika customHolidays secara eksplisit menonaktifkan atau mengaktifkan
    // Kita buat toggle langsung per tanggal agar sangat intuitif!
    return isCustom || isWeekly;
  };

  // Toggle tanggal diklik -> berubah merah (libur) atau putih (aktif)
  const toggleDate = (dayNumber) => {
    const d = new Date(year, month - 1, dayNumber);
    const dayOfWeek = d.getDay();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    
    const currentlyHoliday = checkIsHoliday(dayNumber);

    let nextCustom = [...customHolidays];
    let nextWeekly = [...weeklyHolidays];

    if (currentlyHoliday) {
      // Ubah jadi HARI KERJA (putih)
      // Jika sebelumnya libur karena weekly (misal Minggu), kita keluarkan dari weekly atau tandai
      if (weeklyHolidays.includes(dayOfWeek)) {
        // Keluarkan dayOfWeek dari weeklyHolidays dan tambahkan semua hari Minggu lain ke customHolidays kecuali tanggal ini
        nextWeekly = weeklyHolidays.filter(w => w !== dayOfWeek);
        for (let i = 1; i <= daysInMonth; i++) {
          if (i !== dayNumber && new Date(year, month - 1, i).getDay() === dayOfWeek) {
            const otherDateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            if (!nextCustom.includes(otherDateStr)) nextCustom.push(otherDateStr);
          }
        }
      }
      nextCustom = nextCustom.filter(d => d !== dateStr);
    } else {
      // Ubah jadi LIBUR (merah)
      if (!nextCustom.includes(dateStr)) {
        nextCustom.push(dateStr);
      }
    }

    onUpdateConfig({
      ...config,
      weeklyHolidays: nextWeekly,
      customHolidays: nextCustom
    });
  };

  // Toggle cepat: Liburkan semua hari Minggu dalam bulan
  const toggleAllSundays = () => {
    const isSundayActive = weeklyHolidays.includes(0);
    if (isSundayActive) {
      onUpdateConfig({
        ...config,
        weeklyHolidays: weeklyHolidays.filter(w => w !== 0),
        customHolidays: customHolidays.filter(dateStr => {
          const parts = dateStr.split('-');
          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          return d.getDay() !== 0;
        })
      });
    } else {
      onUpdateConfig({
        ...config,
        weeklyHolidays: [...weeklyHolidays, 0]
      });
    }
  };

  // Deteksi tanggal hari ini (Live Today)
  const realNow = new Date();
  const isLiveMonth = realNow.getFullYear() === year && (realNow.getMonth() + 1) === month;
  const liveTodayDate = realNow.getDate();

  // Buat sel kalender kosong untuk offset hari pertama
  const calendarCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ type: 'empty', key: `empty-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const isHoliday = checkIsHoliday(day);
    const isToday = isLiveMonth && day === liveTodayDate;
    calendarCells.push({
      type: 'day',
      dayNumber: day,
      isHoliday,
      isToday,
      key: `day-${day}`
    });
  }

  const isAllSundaysHoliday = weeklyHolidays.includes(0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
      
      {/* Header Kalender Minimalis */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <CalendarIcon className="w-4 h-4 text-slate-900" />
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Kalender Hari Libur ({MONTH_NAMES[month - 1]} {year})
            </h3>
            <p className="text-xs text-slate-500">
              Klik tanggal untuk menandai libur (merah). Hari libur tidak dihitung dalam setoran.
            </p>
          </div>
        </div>

        {/* Counter Ringkas & Aksi Cepat */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            type="button"
            onClick={toggleAllSundays}
            className={`px-2.5 py-1 rounded-lg border font-medium transition ${
              isAllSundaysHoliday
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isAllSundaysHoliday ? (
              <span className="inline-flex items-center">
                <Check className="w-3.5 h-3.5 mr-1 stroke-[3]" />
                Semua Minggu Libur
              </span>
            ) : (
              '+ Libur Setiap Minggu'
            )}
          </button>

          <div className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold border border-blue-100">
            {dayStats.activeDays} Hari Aktif ({dayStats.holidaysCount} Libur)
          </div>
        </div>
      </div>

      {/* Grid Kalender Minimalis */}
      <div className="mt-4 max-w-lg mx-auto">
        {/* Header Hari (Min - Sab) */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
          {SHORT_DAY_NAMES.map((name, idx) => (
            <div
              key={name}
              className={`text-[11px] font-bold py-1 ${
                idx === 0 ? 'text-red-500' : 'text-slate-500'
              }`}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Tanggal Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarCells.map((cell) => {
            if (cell.type === 'empty') {
              return <div key={cell.key} className="h-9 sm:h-10" />;
            }

            const { dayNumber, isHoliday, isToday } = cell;

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => toggleDate(dayNumber)}
                title={`Tanggal ${dayNumber}: ${isHoliday ? 'Libur' : 'Hari Kerja'}${isToday ? ' (HARI INI)' : ''}`}
                className={`h-9 sm:h-10 rounded-lg text-xs font-semibold transition-all relative flex flex-col items-center justify-center ${
                  isToday ? 'ring-2 ring-blue-600 ring-offset-1 font-bold z-10' : ''
                } ${
                  isHoliday
                    ? 'bg-red-500 text-white font-bold shadow-sm'
                    : 'bg-white hover:bg-blue-50 text-slate-800 border border-slate-200 hover:border-blue-300'
                }`}
              >
                <span>{dayNumber}</span>
                {isToday && (
                  <span className="text-[7px] uppercase font-black tracking-tighter text-blue-600 -mt-0.5">
                    Hari Ini
                  </span>
                )}
                {isHoliday && !isToday && (
                  <span className="text-[8px] leading-none opacity-90">Libur</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Keterangan Simpel Bawah */}
        <div className="mt-3 flex items-center justify-center space-x-5 text-[11px] text-slate-500">
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-white border border-slate-300 inline-block"></span>
            <span>Hari Kerja Aktif</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-red-500 inline-block"></span>
            <span>Hari Libur (Ditiadakan)</span>
          </span>
        </div>
      </div>

    </div>
  );
}
