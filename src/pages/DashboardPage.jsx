import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  DollarSign, CheckCircle, AlertCircle, TrendingUp, Send, ArrowRight
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { formatRupiah, MONTH_NAMES, AVAILABLE_YEARS } from '../lib/initialData';
import { buildWaMessage, getWaUrl } from '../lib/waHelper';

export default function DashboardPage({
  recapData,
  selectedYear,
  selectedMonth,
  onSelectMonth,
  onSelectYear,
  onSelectMonthAndYear,
  onNavigateToRecap,
  onOpenPaymentModal
}) {
  if (!recapData) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const { kpi, branchRecaps, dayStats } = recapData;
  const monthName = MONTH_NAMES[selectedMonth - 1];

  const chartData = branchRecaps.map(r => ({
    name: r.branch.name.replace('MBG ', ''),
    fullName: r.branch.name,
    sudahBayar: r.totalPaid,
    kurangBayar: r.remainingAmount,
    totalTagihan: r.totalBilling,
    isLunas: r.isLunas,
    recapItem: r
  }));

  const pieData = [
    { name: 'Lunas', value: kpi.lunasCount, color: '#2563eb' },
    { name: 'Kurang Bayar', value: kpi.kurangBayarCount, color: '#ef4444' }
  ];

  const handleQuickWa = (r) => {
    const msg = buildWaMessage({
      branchName: r.branch.name,
      monthName,
      year: selectedYear,
      dailyDeposit: r.dailyDeposit,
      activeDays: r.activeDays,
      totalBilling: r.totalBilling,
      totalPaid: r.totalPaid,
      remainingAmount: r.remainingAmount,
      isLunas: r.isLunas
    });
    const url = getWaUrl(r.branch.phone_wa, msg);
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('Nomor WhatsApp belum valid.');
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header Minimalis SaaS */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            Dashboard Setoran MBG
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring kewajiban setoran dan perbandingan status pelunasan cabang 1 bulan penuh
          </p>
        </div>

        {/* Filter Bulan & Tahun Bebas */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => {
              const m = Number(e.target.value);
              if (onSelectMonthAndYear) {
                onSelectMonthAndYear(m, selectedYear);
              } else {
                onSelectMonth(m);
              }
            }}
            className="bg-white text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTH_NAMES.map((mName, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {mName}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => {
              const y = Number(e.target.value);
              if (onSelectMonthAndYear) {
                onSelectMonthAndYear(selectedMonth, y);
              } else {
                onSelectYear(y);
              }
            }}
            className="bg-white text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {AVAILABLE_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Total Kewajiban Tagihan"
          value={formatRupiah(kpi.totalBilled)}
          subtext={`${kpi.totalBranches} Cabang • ${dayStats.activeDays} Hari Kerja`}
          icon={DollarSign}
        />
        <StatCard
          title="Total Sudah Disetor"
          value={formatRupiah(kpi.totalPaid)}
          subtext="Setoran terkonfirmasi"
          icon={CheckCircle}
          badge={`${kpi.paymentPercentage}% Terbayar`}
        />
        <StatCard
          title="Total Kurang Bayar"
          value={formatRupiah(kpi.totalRemaining)}
          subtext={`${kpi.kurangBayarCount} Cabang belum lunas`}
          icon={AlertCircle}
        />
        <StatCard
          title="Status Pelunasan"
          value={`${kpi.lunasCount} / ${kpi.totalBranches}`}
          subtext="Cabang lunas penuh"
          icon={TrendingUp}
          badge={kpi.lunasCount === kpi.totalBranches ? 'Semua Lunas' : 'Ada Tunggakan'}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Bar Chart Komparasi */}
        <div className="lg:col-span-2 bg-white rounded-xl p-4 sm:p-5 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Grafik Setoran Per Cabang ({monthName} {selectedYear})
              </h2>
              <p className="text-xs text-slate-500">
                Sudah Bayar (Biru) vs Kurang Bayar (Merah)
              </p>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded bg-blue-600"></span>
                <span className="text-slate-600 font-medium">Sudah Bayar</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded bg-red-500"></span>
                <span className="text-slate-600 font-medium">Kurang Bayar</span>
              </span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
              >
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                />
                <YAxis 
                  tickFormatter={(val) => `${(val / 1000000).toFixed(0)}jt`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip 
                  formatter={(value, name) => [
                    formatRupiah(value), 
                    name === 'sudahBayar' ? 'Sudah Bayar' : 'Kurang Bayar'
                  ]}
                  labelFormatter={(label) => `Cabang: ${label}`}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px'
                  }}
                />
                <Bar 
                  dataKey="sudahBayar" 
                  name="sudahBayar" 
                  fill="#2563eb" 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="kurangBayar" 
                  name="kurangBayar" 
                  fill="#ef4444" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart Ringkas */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Rasio Pelunasan
            </h2>
            <p className="text-xs text-slate-500">
              Proporsi lunas vs kurang bayar
            </p>

            <div className="h-48 w-full mt-2 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val, name) => [`${val} Cabang`, name]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute text-center pointer-events-none">
                <span className="text-xl font-bold text-slate-900 block">
                  {kpi.paymentPercentage}%
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Terkumpul
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs">
            <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-50">
              <span className="font-medium text-slate-700">Lunas ({kpi.lunasCount} Cabang)</span>
              <span className="font-bold text-blue-600">{kpi.lunasCount > 0 ? Math.round((kpi.lunasCount / kpi.totalBranches) * 100) : 0}%</span>
            </div>
            <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-50">
              <span className="font-medium text-slate-700">Kurang Bayar ({kpi.kurangBayarCount} Cabang)</span>
              <span className="font-bold text-red-600">{kpi.kurangBayarCount > 0 ? Math.round((kpi.kurangBayarCount / kpi.totalBranches) * 100) : 0}%</span>
            </div>
          </div>
        </div>

      </div>

      {/* Ringkasan Status Tiap Cabang */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900">
            Rincian Status Cabang MBG ({monthName} {selectedYear})
          </h2>
          <button
            onClick={onNavigateToRecap}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <span>Buka Kelola Rekap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {branchRecaps.map((r) => {
            const isLunas = r.isLunas;
            return (
              <div
                key={r.branch.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                        {r.branch.name}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Setoran: {formatRupiah(r.dailyDeposit)}/hari
                      </p>
                    </div>

                    {isLunas ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Lunas
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                        Kurang Bayar
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs py-2 px-2.5 bg-slate-50 rounded">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Total Tagihan</span>
                      <span className="font-semibold text-slate-800">{formatRupiah(r.totalBilling)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Kurang Bayar</span>
                      <span className={`font-bold ${isLunas ? 'text-slate-400' : 'text-red-600'}`}>
                        {isLunas ? '0' : formatRupiah(r.remainingAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => onOpenPaymentModal(r)}
                    className="text-[11px] font-medium text-slate-700 hover:text-slate-900"
                  >
                    + Bayar
                  </button>

                  <button
                    onClick={() => handleQuickWa(r)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>{isLunas ? 'WA Lunas' : 'Tagih WA'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
