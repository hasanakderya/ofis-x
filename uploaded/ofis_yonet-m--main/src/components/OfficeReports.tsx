import React, { useState } from "react";
import { 
  FileText, 
  Printer, 
  Users, 
  Wallet, 
  Handshake, 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Clock,
  Pencil,
  Trash2
} from "lucide-react";
import { Transaction, Firm, Personnel, WorkRecord, Proposal } from "../types";

interface OfficeReportsProps {
  firms: Firm[];
  personnel: Personnel[];
  records: WorkRecord[];
  transactions: Transaction[];
  proposals: Proposal[];
  handlePrintReport: (containerId: string) => void;
  personnelGiderleri?: any[];
  onDeleteAdvance?: (id: string) => Promise<any>;
  onEditAdvance?: (id: string, miktar_try: number, date: string, desc: string, taksitSayisi: number) => Promise<any>;
}

export const OfficeReports: React.FC<OfficeReportsProps> = ({
  firms,
  personnel,
  records,
  transactions,
  proposals,
  handlePrintReport,
  personnelGiderleri = [],
  onDeleteAdvance,
  onEditAdvance
}) => {
  // Sub-tabs navigation
  const [activeReportSubTab, setActiveReportSubTab] = useState<"firm" | "personnel" | "expenses">("firm");

  // Report scope state: "office" (Ofis İçi Detaylı Rapor) or "client" (Müşteri Firmaya Özel)
  const [reportType, setReportType] = useState<"office" | "client">("office");

  // Filters for Report 1 (Firm)
  const [reportFirmFilter, setReportFirmFilter] = useState<string>("ALL");
  const [reportFirmMonthFilter, setReportFirmMonthFilter] = useState<string>("ALL");

  // Custom progress/state tracking for Maket Projesi (Interactive on screen, prints as static)
  const [firmProjectStatuses, setFirmProjectStatuses] = useState<Record<string, string>>({});
  const [firmProjectProgress, setFirmProjectProgress] = useState<Record<string, string>>({});

  // Filters for Report 2 (Personnel)
  const [reportPersonnelFilter, setReportPersonnelFilter] = useState<string>("ALL");
  const [reportPersonnelMonthFilter, setReportPersonnelMonthFilter] = useState<string>("ALL");
  const [reportPersonnelBaseSalary, setReportPersonnelBaseSalary] = useState<string>("43.15");
  const [reportPersonnelOvertimeRate, setReportPersonnelOvertimeRate] = useState<string>("500");

  // Filters for Report 3 (Expenses)
  const [reportExpenseMonthFilter, setReportExpenseMonthFilter] = useState<string>("ALL");
  const [reportExpensePaidByFilter, setReportExpensePaidByFilter] = useState<string>("ALL");

  // Edit Advance local states
  const [editingGider, setEditingGider] = useState<any | null>(null);
  const [editAmountValue, setEditAmountValue] = useState<string>("");
  const [editDescValue, setEditDescValue] = useState<string>("");
  const [editDateValue, setEditDateValue] = useState<string>("");
  const [editTaksitValue, setEditTaksitValue] = useState<number>(1);

  // Custom alert and confirm variables
  const [reportAlert, setReportAlert] = useState<{ title?: string; message: string } | null>(null);
  const [reportConfirm, setReportConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const handleEditClick = (g: any) => {
    setEditingGider(g);
    setEditAmountValue(String(g.miktar_try));
    setEditDescValue(g.aciklama);
    setEditDateValue(g.tarih);
    setEditTaksitValue(g.toplam_taksit !== undefined ? g.toplam_taksit : 1);
  };

  const handleUpdateGider = async () => {
    if (!editingGider) return;
    const amount = parseFloat(editAmountValue);
    if (isNaN(amount) || amount <= 0) {
      setReportAlert({ title: "Hata", message: "Lütfen geçerli bir tutar girin." });
      return;
    }
    if (!editDescValue.trim()) {
      setReportAlert({ title: "Hata", message: "Lütfen açıklama girin." });
      return;
    }
    try {
      if (onEditAdvance) {
        await onEditAdvance(editingGider.id, amount, editDateValue, editDescValue, editTaksitValue);
        setEditingGider(null);
        setReportAlert({
          title: "Başarılı",
          message: "Avans kaydı ve ilişkili kasa hareketi başarıyla güncellendi."
        });
      }
    } catch (err: any) {
      setReportAlert({ title: "Hata", message: err.message || "Güncelleme yapılırken hata oluştu." });
    }
  };

  const handleDeleteGider = (g: any) => {
    setReportConfirm({
      title: "Avans Silme Onayı",
      message: `${g.aciklama} (₺${g.miktar_try.toLocaleString("tr-TR")} TRY) tutarındaki avans kaydını silmek istediğinize emin misiniz? Bu işlem ilişkili kasa hareketini de silecektir.`,
      onConfirm: async () => {
        try {
          if (onDeleteAdvance) {
            await onDeleteAdvance(g.id);
            setReportAlert({
              title: "Başarılı",
              message: "Avans kaydı ve ilişkili kasa hareketi silindi."
            });
          }
        } catch (err: any) {
          setReportAlert({ title: "Hata", message: err.message || "Avans silinemedi." });
        }
      }
    });
  };

  // Helper date extractor
  const uMonths = Array.from(new Set(transactions.map(t => t.date.slice(0, 7)))).sort().reverse();

  // Currency Converter to GBP
  const convertToGbp = (t: Transaction) => {
    if (t.currency === "GBP") return t.amount;
    if (t.currency === "TRY") {
      const rate = t.exchangeRate || 43.15;
      return Math.round((t.amount / rate) * 100) / 100;
    }
    return t.amount;
  };

  const getExecutiveSummaryMetrics = (selectedMonth: string = "ALL") => {
    // 1. Toplam Kasa Girişi (Nakit Girişleri)
    const incomeTxs = transactions.filter(t => {
      if (t.type !== "INCOME") return false;
      if (selectedMonth !== "ALL" && t.date.slice(0, 7) !== selectedMonth) return false;
      return true;
    });
    const totalIncomeGbp = incomeTxs.reduce((sum, t) => sum + convertToGbp(t), 0);

    // 2. Toplam Ofis/Proje Giderleri
    const expenseTxs = transactions.filter(t => {
      if (t.type !== "EXPENSE") return false;
      if (t.category !== "Ofis Genel Gideri") return false;
      if (selectedMonth !== "ALL" && t.date.slice(0, 7) !== selectedMonth) return false;
      return true;
    });
    const totalOfficeExpensesGbp = expenseTxs.reduce((sum, t) => sum + convertToGbp(t), 0);

    // 3. Ortaklar Çekim Dengesi (Hasan vs Mustafa Net Borç/Alacak Durumu)
    let activeRevenue = 0;
    let activeOperatingExpenses = 0;
    let activeHasanWithdrawals = 0;
    let activeMustafaWithdrawals = 0;

    transactions.forEach(t => {
      const valGbp = convertToGbp(t);
      const isSelectedMonth = (selectedMonth === "ALL" || t.date.slice(0, 7) === selectedMonth);
      if (!isSelectedMonth) return;

      if (t.type === "INCOME") {
        activeRevenue += valGbp;
      } else {
        const isHasanDraw = t.category === "Ortaklar Kâr Çekimi" && (t.partnerId === "Hasan" || (t.description && t.description.includes("Hasan")));
        const isMustafaDraw = t.category === "Ortaklar Kâr Çekimi" && (t.partnerId === "Mustafa" || (t.description && t.description.includes("Mustafa")));
        if (isHasanDraw) {
          activeHasanWithdrawals += valGbp;
        } else if (isMustafaDraw) {
          activeMustafaWithdrawals += valGbp;
        } else {
          activeOperatingExpenses += valGbp;
        }
      }
    });

    const activeNetProfit = activeRevenue - activeOperatingExpenses;
    const activeShare = activeNetProfit / 2;

    const hasanBalance = activeShare - activeHasanWithdrawals;
    const mustafaBalance = activeShare - activeMustafaWithdrawals;

    const diff = hasanBalance - mustafaBalance;
    let partnershipStatus = "Ortaklar Dengede";
    if (diff > 0) {
      partnershipStatus = `Hasan Alacaklı: £${(diff / 2).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (diff < 0) {
      partnershipStatus = `Mustafa Alacaklı: £${(Math.abs(diff) / 2).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // 4. Toplam Personel Hak Edişleri
    const kur = parseFloat(reportPersonnelBaseSalary) || 43.15;
    const mesaiSaatUcretiTry = parseFloat(reportPersonnelOvertimeRate) || 500;
    let totalPersonnelHakedisGbp = 0;

    personnel.forEach(p => {
      const aylikMaasTry = p.aylik_maas_try || 50000;
      const gunlukUcretTry = aylikMaasTry / 26;

      const personRecords = records.filter(r => {
        if (r.personnelId !== p.id) return false;
        if (!r.checkIn) return false;
        const rMonth = r.checkIn.slice(0, 7);
        if (selectedMonth !== "ALL" && rMonth !== selectedMonth) return false;
        return true;
      });

      const uniqueDates = new Set<string>();
      let totalOvertimeHours = 0;

      personRecords.forEach(r => {
        const dateStr = r.checkIn.slice(0, 10);
        const dateObj = new Date(r.checkIn);
        if (!isNaN(dateObj.getTime()) && dateObj.getDay() !== 0) {
          uniqueDates.add(dateStr);
        }
        
        if (r.checkOut) {
          const checkInTime = new Date(r.checkIn).getTime();
          const checkOutTime = new Date(r.checkOut).getTime();
          const diffMs = checkOutTime - checkInTime;
          if (diffMs > 0) {
            const durationHours = diffMs / (1000 * 60 * 60);
            if (durationHours > 8) {
              totalOvertimeHours += (durationHours - 8);
            }
          }
        }
      });

      const calistigiGunSayisi = uniqueDates.size;
      const hakEdilenMaasTry = (calistigiGunSayisi * gunlukUcretTry) + (totalOvertimeHours * mesaiSaatUcretiTry);
      totalPersonnelHakedisGbp += hakEdilenMaasTry / kur;
    });

    const totalPersonnelHakedis = Math.round(totalPersonnelHakedisGbp * 100) / 100;

    return {
      totalIncomeGbp,
      totalOfficeExpensesGbp,
      totalPersonnelHakedis,
      partnershipStatus,
    };
  };

  const renderExecutiveSummary = (period: string) => {
    const metrics = getExecutiveSummaryMetrics(period);
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl border border-slate-150 bg-slate-50/10 mb-6 print:grid print:grid-cols-4 print:gap-3 print:p-3 print:border-slate-350 print:bg-white break-inside-avoid">
        {/* Box 1: Toplam Kasa Girişi */}
        <div className="p-3 bg-emerald-50/5 border border-emerald-500/15 flex flex-col justify-between print:border-slate-300 print:bg-slate-50/5 print:p-2">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Toplam Kasa Girişi</span>
            <span className="text-[8px] text-emerald-600 font-bold block mt-0.5 print:text-slate-500">Nakit Girişleri</span>
          </div>
          <div className="text-md font-black text-emerald-600 mt-2 print:text-xs print:font-bold">
            £{metrics.totalIncomeGbp.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Box 2: Toplam Ofis/Proje Giderleri */}
        <div className="p-3 bg-rose-50/5 border border-rose-500/15 flex flex-col justify-between print:border-slate-300 print:bg-slate-50/5 print:p-2">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Toplam Giderler</span>
            <span className="text-[8px] text-rose-600 font-bold block mt-0.5 print:text-slate-500">Ofis ve Proje</span>
          </div>
          <div className="text-md font-black text-rose-600 mt-2 print:text-xs print:font-bold">
            £{metrics.totalOfficeExpensesGbp.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Box 3: Ortaklar Çekim Dengesi */}
        <div className="p-3 bg-amber-50/5 border border-amber-500/15 flex flex-col justify-between print:border-slate-300 print:bg-slate-50/5 print:p-2">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ortaklar Çekim Dengesi</span>
            <span className="text-[8px] text-amber-650 font-bold block mt-0.5 print:text-slate-500">Net Mutabakat</span>
          </div>
          <div className="text-[11px] font-extrabold text-amber-600 mt-2 print:text-[9px] print:font-bold break-words leading-tight">
            {metrics.partnershipStatus}
          </div>
        </div>

        {/* Box 4: Toplam Personel Hak Edişleri */}
        <div className="p-3 bg-indigo-50/5 border border-indigo-500/15 flex flex-col justify-between print:border-slate-300 print:bg-slate-50/5 print:p-2">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hakediş Havuzu</span>
            <span className="text-[8px] text-indigo-600 font-bold block mt-0.5 print:text-slate-500">Maaş + Mesai</span>
          </div>
          <div className="text-md font-black text-indigo-600 mt-2 print:text-xs print:font-bold">
            £{metrics.totalPersonnelHakedis.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in" id="pane-reports">
      
      {/* 
        Aesthetic Report Type Selector 
        Allows toggling between:
        1. Ofis İçi Detaylı Rapor (Tüm veriler dahil)
        2. Müşteri Firmaya Özel Hakediş Raporu
      */}
      <div className="no-print bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-0.5">Rapor Türü Seçimi / Filtreleme</span>
            <h2 className="text-md font-black tracking-tight uppercase">Yazdırma ve Cari Görünüm Modu</h2>
          </div>
          <div className="flex bg-slate-800 p-1 rounded-2xl border border-slate-700 w-full md:w-auto">
            <button
              onClick={() => {
                setReportType("office");
              }}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                reportType === "office"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Ofis İçi Detaylı Rapor</span>
            </button>
            <button
              onClick={() => {
                setReportType("client");
                setActiveReportSubTab("firm"); // Lock to firm/proje tab
              }}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                reportType === "client"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Müşteri Firmaya Özel Rapor</span>
            </button>
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-[11px] text-slate-400 leading-relaxed font-medium pt-1">
          <span>
            {reportType === "office" 
              ? "💡 Ofis İçi Detaylı Rapor aktif: Tüm kasa akışları, personel mesaileri, ortaklık hakediş dökümleri ve müşteri hakedişleri tek bir döküm halinde basılmaya hazırdır."
              : "🔒 Müşteri Firmaya Özel mod aktif: Personel bilgileri, maaşlar, ofis giderleri ve ortaklık balances/çekimleri hem ekrandan hem de yazıcı çıktısından tamamen gizlenir. Sadece seçilen firmanın cari hakediş tablosu gösterilir."
            }
          </span>
          {reportType === "office" && (
            <button
              onClick={() => handlePrintReport("report-office-master-view-container")}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Tüm Raporu Tek Döküm Yazdır</span>
            </button>
          )}
        </div>
      </div>

      {/* Report Category Sub-Tabs (Navigation for office manager) - ONLY visible in office mode */}
      {reportType === "office" && (
        <div className="no-print bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight font-sans">Maket ve Mimarlık Ofisi Raporlama Modülü</h2>
              <p className="text-xs text-slate-400">Toplantı hakediş dökümleri, personel maaş mutabakatı ve ortak harcama defterleri</p>
            </div>
          </div>

          {/* Sub-tabs toggles */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-stretch md:self-auto">
            <button
              onClick={() => setActiveReportSubTab("firm")}
              className={`flex-1 md:flex-none text-center px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeReportSubTab === "firm"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 font-semibold"
              }`}
            >
              1. Firmalar & Projeler
            </button>
            <button
              onClick={() => setActiveReportSubTab("personnel")}
              className={`flex-1 md:flex-none text-center px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeReportSubTab === "personnel"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 font-semibold"
              }`}
            >
              2. Personel Performans & Maaş
            </button>
            <button
              onClick={() => setActiveReportSubTab("expenses")}
              className={`flex-1 md:flex-none text-center px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeReportSubTab === "expenses"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 font-semibold"
              }`}
            >
              3. Ofis Gider & Ortak Kasa
            </button>
          </div>
        </div>
      )}

      {/* REPORT 1: FİRMALAR VE MAKET PROJELERİ RAPORU (Toplantı Dökümü) */}
      {activeReportSubTab === "firm" && (() => {
        const selectedFirm = firms.find(f => f.id === reportFirmFilter);
        const targetFirms = selectedFirm ? [selectedFirm] : (reportType === "client" ? [] : firms);

        return (
          <div className="space-y-6">
            {/* Filter Card */}
            <div className="no-print bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
              <div className="flex flex-col sm:flex-row items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Müşteri Firma Seçimi:</label>
                  <select
                    value={reportFirmFilter}
                    onChange={(e) => setReportFirmFilter(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="ALL">Tüm Firmalar ve Maket Projeleri (Seçilmemiş)</option>
                    {firms.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-48">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Hakediş Dönemi:</label>
                  <select
                    value={reportFirmMonthFilter}
                    onChange={(e) => setReportFirmMonthFilter(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="ALL">Tüm Dönemler</option>
                    {uMonths.map(m => (
                      <option key={m} value={m}>{m} Dönemi</option>
                    ))}
                  </select>
                </div>

                <button
                  id="print-firm-report-btn"
                  onClick={() => handlePrintReport("report-firm-view-container")}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Yazdır / Kağıda Dök (PDF)</span>
                </button>
              </div>
            </div>

            {/* Printable Report Content Container */}
            <div 
              id="report-firm-view-container" 
              className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6"
            >
              {/* Sleek & Compact inline print header - replaces verbose cover layout */}
              <div className="hidden print:block border-b border-slate-300 pb-2 mb-4">
                <div className="flex justify-between items-center-reverse sm:items-center">
                  <div>
                    <h1 className="text-md font-black text-slate-900 uppercase tracking-tight">
                      {reportType === "client" 
                        ? "MİMARI MAKET / RENDER HAKEDİŞ VE CARİ DURUM RAPORU" 
                        : "OFİS İÇİ DÖNEMSEL FİNANSAL RAPOR"}
                    </h1>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {reportType === "client"
                        ? `Cari Hesap Ekstresi & Proje Hakediş Raporu (Dönem: ${reportFirmMonthFilter === "ALL" ? "Tüm Zamanlar" : `${reportFirmMonthFilter} Ayı`})`
                        : `Ofis İçi Detaylı Finansal Rapor (Dönem: ${reportFirmMonthFilter === "ALL" ? "Tüm Zamanlar" : `${reportFirmMonthFilter} Ayı`})`}
                    </p>
                  </div>
                  <div className="text-right text-[9px] text-slate-500 font-mono">
                    TARİH: {new Date().toLocaleDateString("tr-TR")}
                  </div>
                </div>
              </div>

              {/* Screen Header */}
              <div className="print:hidden flex justify-between items-center pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase">
                    {reportType === "client" 
                      ? "MÜŞTERİ FİRMASI CARI HAKEDİŞ RAPORU" 
                      : "Müşteri Firma & Maket Projeleri Hakediş Beyanı"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {reportType === "client" 
                      ? "Seçili firmanın kalan cari borç (bakiye), teklif listesi ve tahsilat dökümleri" 
                      : "Seçili müşteri firmaların güncel maket ilerleme durumları ve cari mutabakat hesapları"}
                  </p>
                </div>
                <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold">
                  {reportFirmMonthFilter === "ALL" ? "Tüm Zamanlar" : `Dönem: ${reportFirmMonthFilter}`}
                </span>
              </div>

              {/* Dynamic 4-Box Executive Summary Panel - ONLY show in office mode */}
              {reportType !== "client" && renderExecutiveSummary(reportFirmMonthFilter)}

              {targetFirms.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-medium">
                  {reportType === "client" 
                    ? "⚠️ Lütfen yukarıdaki menüden hakediş ekstresi hazırlamak istediğiniz Müşteri Firmayı seçiniz." 
                    : "Sistemde kayıtlı müşteri firma bulunmamaktadır."}
                </div>
              ) : (
                targetFirms.map(f => {
                  const firmProposals = (proposals || []).filter(p => {
                    if (p.firmId !== f.id) return false;
                    if (reportFirmMonthFilter !== "ALL" && p.date.slice(0, 7) !== reportFirmMonthFilter) return false;
                    return true;
                  });

                  const firmPayments = transactions.filter(t => {
                    if (t.firmId !== f.id) return false;
                    if (t.type !== "INCOME") return false;
                    if (reportFirmMonthFilter !== "ALL" && t.date.slice(0, 7) !== reportFirmMonthFilter) return false;
                    return true;
                  });

                  const totalAcceptedProposalsGbp = firmProposals
                    .filter(p => p.status === "Kabul Edildi")
                    .reduce((sum, p) => {
                      if (p.currency === "GBP") return sum + p.amount;
                      return sum + Math.round((p.amount / 43.15) * 100) / 100;
                    }, 0);

                  const totalPaymentsReceivedGbp = firmPayments.reduce((sum, t) => sum + convertToGbp(t), 0);
                  const remainingDebtGbp = totalAcceptedProposalsGbp - totalPaymentsReceivedGbp;

                  const currentStatus = firmProjectStatuses[f.id] || "Tasarım Aşaması";
                  const currentProgress = firmProjectProgress[f.id] || "%50";

                  return (
                    <div key={f.id} className="p-5 border border-slate-100 rounded-2xl bg-slate-50/10 space-y-4 break-inside-avoid">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-dashed border-slate-100">
                        <div>
                          <div className="font-extrabold text-sm text-slate-850">{f.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">Cari ID: {f.id} | Sor: {f.manager} | {f.phone}</div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold text-slate-400 block print:hidden">PROJE DURUMU:</span>
                            <span className="hidden print:inline-block border border-dashed border-slate-400 rounded-sm px-2 py-0.5 text-[10px] font-bold text-slate-800 bg-white">
                              {currentStatus} ({currentProgress} İlerleme)
                            </span>
                            <select
                              value={currentStatus}
                              onChange={(e) => setFirmProjectStatuses(prev => ({...prev, [f.id]: e.target.value}))}
                              className="print:hidden px-2 py-1 text-[10px] bg-slate-50 border border-slate-250 rounded-lg focus:outline-hidden text-slate-700 font-bold"
                            >
                              <option value="Tasarım Aşaması">Tasarım Aşaması</option>
                              <option value="3D Baskı Aşaması">3D Baskı Aşaması</option>
                              <option value="Lamination & Montaj">Lamination & Montaj</option>
                              <option value="Boyama / Son Dokunuş">Boyama / Son Dokunuş</option>
                              <option value="Bitti (Teslim Edildi)">Bitti (Teslim Edildi)</option>
                            </select>
                            
                            <select
                              value={currentProgress}
                              onChange={(e) => setFirmProjectProgress(prev => ({...prev, [f.id]: e.target.value}))}
                              className="print:hidden px-2 py-1 text-[10px] bg-slate-50 border border-slate-250 rounded-lg focus:outline-hidden text-slate-700 font-bold"
                            >
                              <option value="%10">%10 İlerledi</option>
                              <option value="%20">%20 İlerledi</option>
                              <option value="%30">%30 İlerledi</option>
                              <option value="%40">%40 İlerledi</option>
                              <option value="%50">%50 İlerledi</option>
                              <option value="%60">%60 İlerledi</option>
                              <option value="%70">%70 İlerledi</option>
                              <option value="%80">%80 İlerledi</option>
                              <option value="%95">%95 Montaj Sonu</option>
                              <option value="%100">%100 Bitti</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-indigo-50/20 border border-slate-100 rounded-xl">
                          <div className="text-[9px] font-bold text-slate-400 uppercase">Kabul Edilen Toplam İş (Hakediş Bedeli)</div>
                          <div className="text-xs font-extrabold text-slate-700 mt-0.5">£{totalAcceptedProposalsGbp.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                        <div className="p-3 bg-emerald-50/20 border border-slate-100 rounded-xl">
                          <div className="text-[9px] font-bold text-slate-400 uppercase">Tahsil Edilen Toplam (Yapılan Ödeme)</div>
                          <div className="text-xs font-extrabold text-slate-700 mt-0.5">£{totalPaymentsReceivedGbp.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                        <div className={`p-3 border rounded-xl ${
                          Math.round(remainingDebtGbp * 100) / 100 > 0 
                            ? "bg-rose-50/20 border-rose-150" 
                            : Math.round(remainingDebtGbp * 100) / 100 < 0 
                              ? "bg-amber-50/20 border-amber-150" 
                              : "bg-emerald-50/20 border-emerald-150"
                        }`}>
                          <div className="text-[9px] font-bold text-slate-400 uppercase">Müşteri Kalan Cari Borç (Bakiye)</div>
                          <div className={`text-xs font-extrabold mt-0.5 ${
                            Math.round(remainingDebtGbp * 100) / 100 > 0 
                              ? "text-rose-600" 
                              : Math.round(remainingDebtGbp * 100) / 100 < 0 
                                ? "text-amber-600" 
                                : "text-emerald-600"
                          }`}>
                            £{remainingDebtGbp.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>

                      {/* Akıllı Bakiye Uyarı Sistemi */}
                      <div className="mt-1">
                        {(() => {
                          const displayBakiye = Math.round(remainingDebtGbp * 100) / 100;
                          if (displayBakiye < 0) {
                            return (
                              <div className="p-3 bg-amber-50 border border-amber-150 text-amber-850 text-xs font-semibold rounded-xl flex items-center gap-2">
                                <span>⚠️ Ödeme aldığın firma hesabı kapandı, sistemde fazla ödeme görünmektedir. Firma bizden {Math.abs(displayBakiye).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP alacaklıdır.</span>
                              </div>
                            );
                          } else if (displayBakiye === 0) {
                            return (
                              <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-850 text-xs font-semibold rounded-xl flex items-center gap-2">
                                <span>🟢 Firma hesabı sorunsuz bir şekilde kapatılmıştır.</span>
                              </div>
                            );
                          } else {
                            return (
                              <div className="p-3 bg-blue-50 border border-blue-150 text-blue-900 text-xs font-semibold rounded-xl flex items-center gap-2">
                                <span>🔵 Firmanın henüz tamamlanmamış {displayBakiye.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP cari borcu bulunmaktadır.</span>
                              </div>
                            );
                          }
                        })()}
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] font-mono text-slate-500 mb-2 uppercase border-b border-slate-100 pb-1">📄 3D & Maket Teklifleri Listesi</div>
                          {firmProposals.length === 0 ? (
                            <div className="text-[11px] text-slate-400 italic">Döneme ait kayıtlı teklif bulunmamaktadır.</div>
                          ) : (
                            <table className="w-full text-left text-[11px] border border-slate-100 rounded-xl overflow-hidden print:border-collapse">
                              <thead>
                                <tr className="bg-slate-50 uppercase text-slate-400 font-bold border-b border-slate-100 font-sans">
                                  <th className="p-2">Tarih</th>
                                  <th className="p-2">Maket Proje Başlığı</th>
                                  <th className="p-2">Teklif Bedeli</th>
                                  <th className="p-2">Durum</th>
                                </tr>
                              </thead>
                              <tbody>
                                {firmProposals.map(p => (
                                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                                    <td className="p-2 font-mono text-slate-500">{p.date}</td>
                                    <td className="p-2 font-bold text-slate-700">{p.title}</td>
                                    <td className="p-2 text-slate-800 font-mono">{p.amount.toLocaleString()} {p.currency}</td>
                                    <td className="p-2">
                                      <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold ${
                                        p.status === "Kabul Edildi" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                                        p.status === "Reddedildi" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                                        "bg-amber-50 text-amber-700 border border-amber-100"
                                      }`}>
                                        {p.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>

                        <div>
                          <div className="text-[10px] font-mono text-slate-500 mb-2 uppercase border-b border-slate-100 pb-1">💰 Yapılan Hakediş Ödemeleri (Tahsilat)</div>
                          {firmPayments.length === 0 ? (
                            <div className="text-[11px] text-slate-400 italic">Döneme ait yapılan herhangi bir ödeme bulunmamaktadır.</div>
                          ) : (
                            <table className="w-full text-left text-[11px] border border-slate-100 rounded-xl overflow-hidden print:border-collapse font-mono">
                              <thead>
                                <tr className="bg-slate-50 uppercase text-slate-400 font-bold border-b border-slate-100 font-sans">
                                  <th className="p-2">Tarih</th>
                                  <th className="p-2">Açıklama</th>
                                  <th className="p-2">Tür</th>
                                  <th className="p-2">Alınan Tutar</th>
                                </tr>
                              </thead>
                              <tbody>
                                {firmPayments.map(pay => (
                                  <tr key={pay.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                                    <td className="p-2 text-slate-500">{pay.date}</td>
                                    <td className="p-2 text-slate-750 font-sans">{pay.description}</td>
                                    <td className="p-2 text-slate-500 font-sans">{pay.paymentMethod || "Havale"}</td>
                                    <td className="p-2 font-bold text-emerald-600">{pay.amount.toLocaleString()} {pay.currency}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Printable footer and sign area */}
              <div className="hidden print:grid grid-cols-2 gap-12 pt-16 border-t border-dashed border-slate-300 mt-12 break-inside-avoid">
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-800 underline">MÜŞTERI FİRMA YETKİLİSİ</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Kaşe - Islak İmza</p>
                  <div className="h-16"></div>
                  <p className="text-[10px] text-slate-500">İmza Tarihi: .... / .... / 2026</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-800 underline">MAKET / MİMARLIK OFİSİ SORUMLUSU</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Ortak Onay / İmza</p>
                  <div className="h-16"></div>
                  <p className="text-[10px] text-slate-500">İmza Tarihi: .... / .... / 2026</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* REPORT 2: PERSONEL AYLIK MAKET PERFORMANS VE MAAŞ RAPORU (İtiraz Önleme) */}
      {activeReportSubTab === "personnel" && (() => {
        const selectedPerson = personnel.find(p => p.id === reportPersonnelFilter);
        const targetPersonnel = selectedPerson ? [selectedPerson] : personnel;

        const kur = parseFloat(reportPersonnelBaseSalary) || 43.15;
        const mesaiSaatUcretiTry = parseFloat(reportPersonnelOvertimeRate) || 500;

        return (
          <div className="space-y-6">
            <div className="no-print bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Personel Sorumlusu:</label>
                  <select
                    value={reportPersonnelFilter}
                    onChange={(e) => setReportPersonnelFilter(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="ALL">Kayıtlı Kadrodaki Tüm Personeller</option>
                    {personnel.map(p => (
                      <option key={p.id} value={p.id}>{p.fullName} ({p.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Hesaplaşma Dönemi:</label>
                  <select
                    value={reportPersonnelMonthFilter}
                    onChange={(e) => setReportPersonnelMonthFilter(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="ALL">Tüm Dönemler</option>
                    {uMonths.map(m => (
                      <option key={m} value={m}>{m} Dönemi</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Döviz Kuru (1 GBP = ? TRY):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={reportPersonnelBaseSalary}
                    onChange={(e) => setReportPersonnelBaseSalary(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-700 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mesai Saat Ücreti (TRY / ₺):</label>
                  <input
                    type="number"
                    value={reportPersonnelOvertimeRate}
                    onChange={(e) => setReportPersonnelOvertimeRate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-700 font-bold"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <span className="text-[10px] text-amber-600 font-semibold block">⚠️ Personel çalışma dökümü ofise giriş-çıkış kartlarındaki log saatlerine göre net olarak hesaplanır (8 saati aşan her gün mesai sayılır).</span>
                <button
                  id="print-personnel-report-btn"
                  onClick={() => handlePrintReport("report-personnel-view-container")}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Maaş Hak-Haket Ekstresi Çıkart / İmzalat (PDF)</span>
                </button>
              </div>
            </div>

            {/* Printable Report Content Container */}
            <div 
              id="report-personnel-view-container" 
              className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6"
            >
              {/* Sleek & Compact inline print header - replaces verbose cover layout */}
              <div className="hidden print:block border-b border-slate-300 pb-2 mb-4">
                <div className="flex justify-between items-center bg-white">
                  <div>
                    <h1 className="text-md font-black text-slate-900 uppercase tracking-tight">PROFESYONEL MİMARI MAKET & 3D RENDER OFİSİ</h1>
                    <p className="text-[10px] text-slate-500 font-medium">Personel Çalışma Performansı & Ödeme Hak-Hakediş Beyanı (Dönem: {reportPersonnelMonthFilter === "ALL" ? "Tüm Zamanlar" : `${reportPersonnelMonthFilter} Ayı`})</p>
                  </div>
                  <div className="text-right text-[9px] text-slate-500 font-mono">
                    TARİH: {new Date().toLocaleDateString("tr-TR")}
                  </div>
                </div>
              </div>

              <div className="print:hidden flex justify-between items-center pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase">Personel Hak Edilen Aylık Maaş ve Mesai Mutabakat Pusulası</h3>
                  <p className="text-xs text-slate-400 animate-pulse">Bireysel personellerin ofis mesai dökümü, birikmiş avansları ve kalan mesai hakediş özetleri</p>
                </div>
                <span className="text-[10px] bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1 rounded-full font-bold">
                  Sistem Kuru: 1 GBP = {reportPersonnelBaseSalary} TRY | Overtime Oranı: ₺{reportPersonnelOvertimeRate}/Saat
                </span>
              </div>

              {/* Dynamic 4-Box Executive Summary Panel */}
              {renderExecutiveSummary(reportPersonnelMonthFilter)}

              {targetPersonnel.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">Sistemde kayıtlı personel bulunmamaktadır.</div>
              ) : (
                targetPersonnel.map(p => {
                  const personRecords = records.filter(r => {
                    if (r.personnelId !== p.id) return false;
                    if (!r.checkIn) return false;
                    const rMonth = r.checkIn.slice(0, 7);
                    if (reportPersonnelMonthFilter !== "ALL" && rMonth !== reportPersonnelMonthFilter) return false;
                    return true;
                  });

                  const personPayments = transactions.filter(t => {
                    if (t.personnelId !== p.id) return false;
                    if (t.type !== "EXPENSE") return false;
                    const tMonth = t.date.slice(0, 7);
                    if (reportPersonnelMonthFilter !== "ALL" && tMonth !== reportPersonnelMonthFilter) return false;
                    return true;
                  });

                  let totalHoursDecimal = 0;
                  let totalOvertimeHoursDecimal = 0;

                  const detailedRecords = personRecords.map(r => {
                    let durationHours = 0;
                    let overtimeHours = 0;
                    let durationText = "Devam Ediyor";

                    if (r.checkOut) {
                      const checkInTime = new Date(r.checkIn).getTime();
                      const checkOutTime = new Date(r.checkOut).getTime();
                      const diffMs = checkOutTime - checkInTime;
                      if (diffMs > 0) {
                        durationHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
                        totalHoursDecimal += durationHours;
                        durationText = `${Math.floor(durationHours)} Saat ${Math.round((durationHours % 1) * 60)} Dk`;

                        if (durationHours > 8) {
                          overtimeHours = durationHours - 8;
                          totalOvertimeHoursDecimal += overtimeHours;
                        }
                      }
                    }

                    return {
                      ...r,
                      durationHours,
                      overtimeHours,
                      durationText
                    };
                  });

                  const aylikMaasTry = p.aylik_maas_try || 50000;
                  const gunlukUcretTry = aylikMaasTry / 26;

                  const uniqueDates = new Set<string>();
                  personRecords.forEach(r => {
                    const dateStr = r.checkIn.slice(0, 10);
                    const dateObj = new Date(r.checkIn);
                    if (!isNaN(dateObj.getTime()) && dateObj.getDay() !== 0) {
                      uniqueDates.add(dateStr);
                    }
                  });
                  const calistigiGunSayisi = uniqueDates.size;

                  const totalEarnedOvertimeTry = Math.round((totalOvertimeHoursDecimal * mesaiSaatUcretiTry) * 100) / 100;
                  const hakEdilenMaasTry = (calistigiGunSayisi * gunlukUcretTry) + totalEarnedOvertimeTry;
                  const hakEdilenMaasGbp = Math.round((hakEdilenMaasTry / kur) * 100) / 100;

                  const totalAlinanAvansTry = personPayments.reduce((sum, pay) => {
                    if (pay.currency === "TRY") return sum + pay.amount;
                    const txRate = pay.exchangeRate || kur;
                    return sum + (pay.amount * txRate);
                  }, 0);

                  const totalPaymentsMadeGbp = personPayments.reduce((sum, t) => sum + convertToGbp(t), 0);
                  const kalanOdenecekTry = hakEdilenMaasTry - totalAlinanAvansTry;
                  const remainingCompensationGbp = hakEdilenMaasGbp - totalPaymentsMadeGbp;

                  return (
                    <div key={p.id} className="p-5 border border-slate-100 rounded-2xl bg-slate-50/10 space-y-4 break-inside-avoid">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-dashed border-slate-100">
                        <div>
                          <div className="font-extrabold text-sm text-slate-800">{p.fullName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">Rol / Görev: {p.role} | Başlangıç: {p.startDate}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-slate-700">Toplam Mesai Süresi</div>
                          <div className="text-[10px] text-indigo-600 font-bold mt-0.5">{calistigiGunSayisi} İş Günü Giriş | {totalHoursDecimal.toFixed(1)} Toplam Saat ({totalOvertimeHoursDecimal.toFixed(1)} Fazla Mesai Saati)</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl font-mono">
                          <div className="text-[9px] font-bold text-slate-405 font-sans uppercase">Aylık Sözleşmeli Maaş</div>
                          <div className="text-xs font-extrabold text-slate-700 mt-1">₺{aylikMaasTry.toLocaleString("tr-TR")} TRY</div>
                          <div className="text-[9px] text-slate-400 mt-0.5">Masa Bazı (26 Gün / Günlük: ₺{gunlukUcretTry.toFixed(0)})</div>
                        </div>
                        <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl font-mono">
                          <div className="text-[9px] font-bold text-slate-405 font-sans uppercase">Hakedilen Fazla Mesai</div>
                          <div className="text-xs font-extrabold text-slate-700 mt-1">₺{totalEarnedOvertimeTry.toLocaleString("tr-TR")} TRY</div>
                          <div className="text-[9px] text-slate-400 mt-0.5">£{(totalEarnedOvertimeTry / kur).toFixed(1)} GBP equivalent</div>
                        </div>
                        <div className="p-2.5 bg-indigo-50/15 border border-indigo-100/50 rounded-xl font-mono">
                          <div className="text-[9px] font-bold text-indigo-500 font-sans uppercase font-bold">Toplam Hak Edilen</div>
                          <div className="text-xs font-extrabold text-indigo-700 mt-1">₺{hakEdilenMaasTry.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} TRY</div>
                          <div className="text-[9px] text-indigo-500 font-semibold mt-0.5">£{hakEdilenMaasGbp.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} GBP</div>
                        </div>
                        <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl font-mono">
                          <div className="text-[9px] font-bold text-slate-405 font-sans uppercase">Ödenmiş Maaş & Avans</div>
                          <div className="text-xs font-extrabold text-slate-700 mt-1">₺{totalAlinanAvansTry.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} TRY</div>
                          <div className="text-[9px] text-slate-400 mt-0.5">£{totalPaymentsMadeGbp.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} GBP total</div>
                        </div>
                        <div className="p-2.5 bg-emerald-50/10 border border-emerald-100 rounded-xl col-span-2 md:col-span-1 font-mono">
                          <div className="text-[9px] font-bold text-emerald-600 font-sans uppercase">Kalan Ödenecek (Net)</div>
                          <div className="text-xs font-extrabold text-emerald-700 mt-1">₺{kalanOdenecekTry.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} TRY</div>
                          <div className="text-[9px] text-emerald-600 font-bold mt-0.5">£{remainingCompensationGbp.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} GBP</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <span className="text-[10px] font-bold text-slate-550 block uppercase">📅 Günlük Ofis Giriş-Çıkış ve Performans Kaydı</span>
                        {detailedRecords.length === 0 ? (
                          <div className="text-[11px] text-slate-400 italic">Döneme ait herhangi bir kontrol/log kaydı bulunmamaktadır.</div>
                        ) : (
                          <table className="w-full text-left text-[10px] border border-slate-100 rounded-xl overflow-hidden print:border-collapse font-mono">
                            <thead>
                              <tr className="bg-slate-50 uppercase text-slate-400 font-bold border-b border-slate-100 font-sans">
                                <th className="p-2">Giriş Tarihi / Saat</th>
                                <th className="p-2">Çıkış Tarihi / Saat</th>
                                <th className="p-2">Toplam Mesai Süresi</th>
                                <th className="p-2">Hak Edilen Fazla Mesai</th>
                                <th className="p-2">Ofis İçi Notlar / İlerlemeler</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailedRecords.map(rec => (
                                <tr key={rec.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                                  <td className="p-2 text-slate-600">{rec.checkIn ? rec.checkIn.replace("T", " ") : "-"}</td>
                                  <td className="p-2 text-slate-600">{rec.checkOut ? rec.checkOut.replace("T", " ") : "Çıkış Yapılmadı"}</td>
                                  <td className="p-2 font-bold text-slate-700 font-sans">{rec.durationText}</td>
                                  <td className="p-2 font-sans">
                                    {rec.overtimeHours > 0 ? (
                                      <span className="font-bold text-indigo-650">+{rec.overtimeHours.toFixed(1)} Saat (Ödeme: ₺{(rec.overtimeHours * mesaiSaatUcretiTry).toLocaleString("tr-TR", { maximumFractionDigits: 1 })})</span>
                                    ) : (
                                      <span className="text-slate-400 font-medium">-</span>
                                    )}
                                  </td>
                                  <td className="p-2 text-slate-505 italic font-sans">{rec.note || "Kayıt yok"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-550 block uppercase">💵 Dönem İçi Yapılan Maaş ve Avans Transferleri Dökümü</span>
                        {personPayments.length === 0 ? (
                          <div className="text-[11px] text-slate-400 italic">Döneme ait herhangi bir ödeme/avans kaydı bulunmamaktadır.</div>
                        ) : (
                          <table className="w-full text-left text-[10px] border border-slate-100 rounded-xl overflow-hidden print:border-collapse font-mono">
                            <thead>
                              <tr className="bg-slate-50 uppercase text-slate-400 font-bold border-b border-slate-100 font-sans">
                                <th className="p-2">İşlem Tarihi</th>
                                <th className="p-2">Açıklama</th>
                                <th className="p-2 font-sans">Ödeme Türü / Kategori</th>
                                <th className="p-2">Aktarılan Tutar (GBP Eşiti)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {personPayments.map(pay => (
                                <tr key={pay.id} className="border-b border-slate-100 hover:bg-slate-50/40 font-mono">
                                  <td className="p-2 text-slate-500">{pay.date}</td>
                                  <td className="p-2 text-slate-700 font-sans">{pay.description}</td>
                                  <td className="p-2 font-bold font-sans">{pay.category}</td>
                                  <td className="p-2 font-bold text-rose-500">£{convertToGbp(pay).toLocaleString()} GBP</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>

                      {/* Active installments advances report */}
                      {(() => {
                        const personAdvDetails = (personnelGiderleri || []).filter(g => g.personnelId === p.id);
                        if (personAdvDetails.length === 0) return null;
                        return (
                          <div className="space-y-1 pt-2">
                            <span className="text-[10px] font-bold text-amber-800 block uppercase">💰 Taksitli Avans Takip ve Otomatik Kesinti Çizelgesi</span>
                            <table className="w-full text-left text-[10px] border border-amber-100/60 bg-amber-50/5 rounded-xl overflow-hidden print:border-collapse font-mono">
                              <thead>
                                <tr className="bg-amber-100/40 uppercase text-amber-850 font-bold border-b border-amber-200 font-sans">
                                  <th className="p-2">Avans Tarihi</th>
                                  <th className="p-2">Açıklama</th>
                                  <th className="p-2">Toplam Taksit</th>
                                  <th className="p-2">Kalan Taksit</th>
                                  <th className="p-2">Aylık Taksit Tutarı</th>
                                  <th className="p-2">Kalan Toplam Borç</th>
                                  <th className="p-2">Durum</th>
                                  <th className="p-2 text-right print:hidden">İşlemler</th>
                                </tr>
                              </thead>
                              <tbody>
                                {personAdvDetails.map(g => {
                                  const kt = g.kalan_taksit !== undefined ? g.kalan_taksit : 1;
                                  const tt = g.toplam_taksit !== undefined ? g.toplam_taksit : 1;
                                  const aylik = g.aylik_taksit_tutari_try !== undefined ? g.aylik_taksit_tutari_try : g.miktar_try;
                                  const kalanBorc = kt * aylik;

                                  const isFilteredMonthDue = (() => {
                                    if (reportPersonnelMonthFilter === "ALL") return true;
                                    const advanceMonth = g.tarih.substring(0, 7);
                                    return advanceMonth <= reportPersonnelMonthFilter;
                                  })();

                                  return (
                                    <tr key={g.id} className="border-b border-amber-100/20 hover:bg-amber-100/10 font-mono">
                                      <td className="p-2 text-slate-600">{g.tarih}</td>
                                      <td className="p-2 text-slate-800 font-sans">{g.aciklama}</td>
                                      <td className="p-2 font-sans">{tt} Taksit</td>
                                      <td className="p-2 font-sans">{kt} Taksit</td>
                                      <td className="p-2 font-bold text-slate-700">₺{aylik.toLocaleString("tr-TR")} TRY</td>
                                      <td className="p-2 font-bold text-amber-900">₺{kalanBorc.toLocaleString("tr-TR")} TRY</td>
                                      <td className="p-2 font-sans">
                                        {g.completed ? (
                                          <span className="px-1.5 py-0.5 rounded-sm text-[8px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Tamamlandı</span>
                                        ) : (
                                          <span className="px-1.5 py-0.5 rounded-sm text-[8px] font-bold bg-amber-100 text-amber-850 border border-amber-200">
                                            Aktif {isFilteredMonthDue && reportPersonnelMonthFilter !== "ALL" ? "(Kesinti Aktif)" : ""}
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-2 text-right print:hidden whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => handleEditClick(g)}
                                            className="p-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-250 rounded transition-all cursor-pointer"
                                            title="Düzenle"
                                          >
                                            <Pencil className="w-2.5 h-2.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteGider(g)}
                                            className="p-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-250 rounded transition-all cursor-pointer"
                                            title="Sil"
                                          >
                                            <Trash2 className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })
              )}

              <div className="hidden print:block text-[10px] text-slate-550 italic space-y-2 pt-6">
                <p><strong>Mutabakat Beyanı:</strong> Yukarıdaki dökümü yapılan günlük mesai saatleri ve tarihler tarafımdan kontrol edilmiş olup, doğruluğu kabul edilmiştir. Dönem içi alınan avanslar ve net kalan maaş hakedişlerim karşılıklı mutabakata uygun olarak eksiksiz beyan edilmiştir.</p>
              </div>

              <div className="hidden print:grid grid-cols-2 gap-12 pt-16 border-t border-dashed border-slate-300 mt-12 break-inside-avoid">
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-800 underline">ÇALIŞAN PERSONEL İMZA</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Bireysel Islak İmza / Beyan</p>
                  <div className="h-14"></div>
                  <p className="text-[10px] text-slate-500">İsim Soyisim: .......................................</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-800 underline">OFİS SORUMLUSU ONAY</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Ortak Güvence / İmza</p>
                  <div className="h-14"></div>
                  <p className="text-[10px] text-slate-500">Hasan Ş. & Mustafa A.</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* REPORT 3: OFİS GİDER VE ORTAK HARCAMA RAPORU (Hasan & Mustafa) */}
      {activeReportSubTab === "expenses" && (() => {
        const selectedMonth = reportExpenseMonthFilter;

        const filteredOfficeTxs = transactions.filter(t => {
          if (t.type !== "EXPENSE") return false;
          if (t.category !== "Ofis Genel Gideri") return false;
          if (selectedMonth !== "ALL" && t.date.slice(0, 7) !== selectedMonth) return false;
          return true;
        });

        const activeTxs = filteredOfficeTxs.filter(t => {
          if (reportExpensePaidByFilter === "ALL") return true;
          if (reportExpensePaidByFilter === "Hasan") {
            return t.partnerId === "Hasan_Ofis" || (t.description && t.description.includes("Ödeyen: Hasan"));
          }
          if (reportExpensePaidByFilter === "Mustafa") {
            return t.partnerId === "Mustafa_Ofis" || (t.description && t.description.includes("Ödeyen: Mustafa"));
          }
          if (reportExpensePaidByFilter === "Kasadan") {
            return (!t.partnerId && !t.description.includes("Ödeyen: Hasan") && !t.description.includes("Ödeyen: Mustafa")) || (t.description && t.description.includes("Ödeyen: Kasadan"));
          }
          return true;
        });

        const allMonthTxs = selectedMonth === "ALL" 
          ? transactions.filter(t => t.type === "EXPENSE" && t.category === "Ofis Genel Gideri")
          : transactions.filter(t => t.type === "EXPENSE" && t.category === "Ofis Genel Gideri" && t.date.slice(0, 7) === selectedMonth);

        const hasanTotalGbp = allMonthTxs
          .filter(t => t.partnerId === "Hasan_Ofis" || (t.description && t.description.includes("Ödeyen: Hasan")))
          .reduce((sum, t) => sum + convertToGbp(t), 0);

        const mustafaTotalGbp = allMonthTxs
          .filter(t => t.partnerId === "Mustafa_Ofis" || (t.description && t.description.includes("Ödeyen: Mustafa")))
          .reduce((sum, t) => sum + convertToGbp(t), 0);

        const kasadanTotalGbp = allMonthTxs
          .filter(t => (!t.partnerId && !t.description.includes("Ödeyen: Hasan") && !t.description.includes("Ödeyen: Mustafa")) || (t.description && t.description.includes("Ödeyen: Kasadan")))
          .reduce((sum, t) => sum + convertToGbp(t), 0);

        const grandTotalGbp = hasanTotalGbp + mustafaTotalGbp + kasadanTotalGbp;

        const diffGbp = hasanTotalGbp - mustafaTotalGbp;
        let calculationStatus = "Hasan ve Mustafa'nın cebinden ödediği tutarlar tamamen eşittir.";
        let debtMessage = "";

        if (diffGbp > 0) {
          const reimbursement = Math.round((diffGbp / 2) * 100) / 100;
          debtMessage = `MUSTAFA, HASAN'A BU DÖNEM İÇİN ŞAHSEN £${reimbursement.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} GBP NAKİT ÖDEME YAPMALIDIR.`;
          calculationStatus = `Hasan cebinden ${hasanTotalGbp.toLocaleString("tr-TR")} £ harcadı. Mustafa cebinden ${mustafaTotalGbp.toLocaleString("tr-TR")} £ harcadı. Hasan, Mustafa'dan £${reimbursement.toLocaleString("tr-TR")} alacaklıdır.`;
        } else if (diffGbp < 0) {
          const reimbursement = Math.round((Math.abs(diffGbp) / 2) * 100) / 100;
          debtMessage = `HASAN, MUSTAFA'YA BU DÖNEM İÇİN ŞAHSEN £${reimbursement.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} GBP NAKİT ÖDEME YAPMALIDIR.`;
          calculationStatus = `Mustafa cebinden ${mustafaTotalGbp.toLocaleString("tr-TR")} £ harcadı. Hasan cebinden ${hasanTotalGbp.toLocaleString("tr-TR")} £ harcadı. Mustafa, Hasan'dan £${reimbursement.toLocaleString("tr-TR")} alacaklıdır.`;
        }

        return (
          <div className="space-y-6">
            <div className="no-print bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
              <div className="flex flex-col sm:flex-row items-end gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Hesaplaşma Dönemi:</label>
                  <select
                    value={reportExpenseMonthFilter}
                    onChange={(e) => setReportExpenseMonthFilter(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="ALL">Tüm Zamanlar</option>
                    {uMonths.map(m => (
                      <option key={m} value={m}>{m} Dönemi</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Harcamayı Cebinden Ödeyen:</label>
                  <select
                    value={reportExpensePaidByFilter}
                    onChange={(e) => setReportExpensePaidByFilter(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="ALL">Tüm Harcamalar ve Ödeme Kaynakları</option>
                    <option value="Hasan">Hasan'ın Şahsi Cebinden Ödedikleri</option>
                    <option value="Mustafa">Mustafa'nın Şahsi Cebinden Ödedikleri</option>
                    <option value="Kasadan">Ortak Kasadan Çıkan Harcamalar</option>
                  </select>
                </div>

                <div className="flex-1"></div>

                <button
                  id="print-expenses-report-btn"
                  onClick={() => handlePrintReport("report-expenses-view-container")}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Ortaklar Gider Beyannamesi Yazdır (PDF)</span>
                </button>
              </div>
            </div>

            {/* Printable Report Content Container */}
            <div 
              id="report-expenses-view-container" 
              className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6"
            >
              {/* Sleek & Compact inline print header - replaces verbose cover layout */}
              <div className="hidden print:block border-b border-slate-300 pb-2 mb-4">
                <div className="flex justify-between items-center bg-white">
                  <div>
                    <h1 className="text-md font-black text-slate-900 uppercase tracking-tight">PROFESYONEL MİMARI MAKET & 3D RENDER OFİSİ</h1>
                    <p className="text-[10px] text-slate-500 font-medium">Hasan & Mustafa Ofis Cari Gider & Ortaklar Cebinden Harcama Matrahı (Dönem: {selectedMonth === "ALL" ? "Tüm Dönemler" : `${selectedMonth} Dönemi`})</p>
                  </div>
                  <div className="text-right text-[9px] text-slate-500 font-mono">
                    TARİH: {new Date().toLocaleDateString("tr-TR")}
                  </div>
                </div>
              </div>

              <div className="print:hidden flex justify-between items-center pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase">Hasan & Mustafa Cari Ofis Gider Dağılım Cetveli</h3>
                  <p className="text-xs text-slate-400">Biten ortak kasa bütçesi ardından Hasan & Mustafa'nın kendi ceplerinden yaptığı harcamaların dengelenmesi</p>
                </div>
                <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold">
                  Dönem: {selectedMonth === "ALL" ? "Tüm Zamanlar" : `${selectedMonth} Ayı`}
                </span>
              </div>

              {/* Dynamic 4-Box Executive Summary Panel */}
              {renderExecutiveSummary(selectedMonth)}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl font-mono">
                  <div className="text-[9px] font-bold text-slate-400 font-sans uppercase">Hasan Cebinden S. Ödenen</div>
                  <div className="text-base font-black text-slate-800 mt-0.5">£{hasanTotalGbp.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl font-mono">
                  <div className="text-[9px] font-bold text-slate-400 font-sans uppercase">Mustafa Cebinden S. Ödenen</div>
                  <div className="text-base font-black text-slate-800 mt-0.5">£{mustafaTotalGbp.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl font-mono">
                  <div className="text-[9px] font-bold text-slate-400 font-sans uppercase">Ortak Kasadan Gider</div>
                  <div className="text-base font-black text-slate-500 mt-0.5">£{kasadanTotalGbp.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-xl col-span-2 md:col-span-1 font-mono">
                  <div className="text-[9px] font-bold text-indigo-600 font-sans uppercase">Dönem Toplam Cari Gider</div>
                  <div className="text-base font-black text-indigo-850 mt-0.5">£{grandTotalGbp.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</div>
                </div>
              </div>

              <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl">
                <div className="text-xs font-bold text-indigo-805 uppercase tracking-wide">⚖️ Ortaklar Arası Gider Hesap Dengesi Sonucu:</div>
                <p className="text-[11px] text-indigo-700 mt-1 leading-relaxed font-semibold">
                  {calculationStatus}
                </p>
                {debtMessage && (
                  <div className="mt-2 text-xs font-black text-slate-900 border-t border-dashed border-indigo-200/50 pt-2 text-red-650">
                    📢 {debtMessage}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-550 block uppercase">📋 Gider Kalemleri ve Ödeyen Detay Ekstresi</span>
                {activeTxs.length === 0 ? (
                  <div className="text-xs text-slate-400 italic py-6 text-center">Bu kritere uygun kayıt edilmiş bir ofis gideri bulunmamaktadır.</div>
                ) : (
                  <table className="w-full text-left text-[11px] border border-slate-100 rounded-xl overflow-hidden print:border-collapse font-mono">
                    <thead>
                      <tr className="bg-slate-50 uppercase text-slate-400 font-bold border-b border-slate-100 font-sans">
                        <th className="p-2.5">Olay Tarihi</th>
                        <th className="p-2.5">Harcama Grubu / Fatura Türü</th>
                        <th className="p-2.5">Açıklama</th>
                        <th className="p-2.5">Harcamayı Ödeyen</th>
                        <th className="p-2.5 text-right font-bold">Harcama Tutarı (GBP)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTxs.map(t => {
                        const isHasan = t.partnerId === "Hasan_Ofis" || (t.description && t.description.includes("Ödeyen: Hasan"));
                        const isMustafa = t.partnerId === "Mustafa_Ofis" || (t.description && t.description.includes("Ödeyen: Mustafa"));
                        let payerLabel = "Ortak Kasadan";
                        if (isHasan) payerLabel = "Hasan (Şahsi Cebinden)";
                        if (isMustafa) payerLabel = "Mustafa (Şahsi Cebinden)";

                        return (
                          <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                            <td className="p-2.5 text-slate-550">{t.date}</td>
                            <td className="p-2.5 font-bold text-slate-805 font-sans">{t.category}</td>
                            <td className="p-2.5 text-slate-650 font-sans">{t.description}</td>
                            <td className="p-2.5 font-sans">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                isHasan ? "bg-amber-50 text-amber-700 border border-amber-100" :
                                isMustafa ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                                "bg-slate-50 text-slate-600 border border-slate-250"
                              }`}>
                                {payerLabel}
                              </span>
                            </td>
                            <td className="p-2.5 font-bold text-slate-800 text-right">£{convertToGbp(t).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="hidden print:grid grid-cols-2 gap-12 pt-16 border-t border-dashed border-slate-300 mt-12 break-inside-avoid">
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-850 underline">HASAN ŞAHİNER (ORTAK)</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Mutabık Onay - Islak İmza</p>
                  <div className="h-16"></div>
                  <p className="text-[10px] text-slate-500">İmza Tarihi: .... / .... / 2026</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-850 underline">MUSTAFA AKPINAR (ORTAK)</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Mutabık Onay - Islak İmza</p>
                  <div className="h-16"></div>
                  <p className="text-[10px] text-slate-500">İmza Tarihi: .... / .... / 2026</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 
        ========================================================================
        COMBINED PRINT MASTER FOR OFFICE MODE (Ofis İçi Detaylı Rapor Master)
        This is invisible on screen (hidden) but becomes visible in printing
        ========================================================================
      */}
      <div 
        id="report-office-master-view-container" 
        className="hidden print:block bg-white p-6 sm:p-8 space-y-6 text-slate-900"
      >
        {/* Sleek & Compact inline print header */}
        <div className="border-b border-slate-300 pb-2 mb-4">
          <div className="flex justify-between items-center bg-white">
            <div>
              <h1 className="text-md font-black text-slate-900 uppercase tracking-tight">PROFESYONEL MİMARI MAKET & 3D RENDER OFİSİ</h1>
              <p className="text-[10px] text-slate-500 font-medium">OFİS İÇİ DÖNEMSEL FİNANSAL DETAYLI RAPOR (Dönem: Tüm Zamanlar)</p>
            </div>
            <div className="text-right text-[9px] text-slate-500 font-mono">
              TARİH: {new Date().toLocaleDateString("tr-TR")}
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="space-y-2">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1">📊 YÖNETİCİ ÖZETİ (GENEL FİNANSAL MUTABAKAT)</h2>
          {renderExecutiveSummary("ALL")}
        </div>

        {/* 1. Müşteri Firmalar & Proje Hakediş Detayları */}
        <div className="space-y-3 break-inside-avoid">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1">1. FİRMALAR & PROJELER CARİ BEYANI</h2>
          <table className="w-full text-left text-[9px] border border-slate-200 rounded-lg overflow-hidden border-collapse">
            <thead>
              <tr className="bg-slate-50 uppercase text-slate-500 font-bold border-b border-slate-200">
                <th className="p-2">Cari ID / Firma Adı</th>
                <th className="p-2">Sorumlu S.</th>
                <th className="p-2 text-right">Teklif Bedeli (GBP)</th>
                <th className="p-2 text-right">Tahsil Edilen (GBP)</th>
                <th className="p-2 text-right">Kalan Cari Borç (GBP)</th>
              </tr>
            </thead>
            <tbody>
              {firms.map(f => {
                const firmProposals = proposals.filter(p => p.firmId === f.id);
                const firmPayments = transactions.filter(t => t.firmId === f.id && t.type === "INCOME");

                const totalAcceptedGbp = firmProposals
                  .filter(p => p.status === "Kabul Edildi")
                  .reduce((sum, p) => p.currency === "GBP" ? sum + p.amount : sum + Math.round((p.amount / 43.15) * 100) / 100, 0);

                const totalPaymentsReceivedGbp = firmPayments.reduce((sum, t) => sum + convertToGbp(t), 0);
                const remainingDebtGbp = totalAcceptedGbp - totalPaymentsReceivedGbp;

                return (
                  <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50/20 font-mono animate-none">
                    <td className="p-2 font-sans font-bold text-slate-800">{f.name} <span className="text-[8px] font-normal text-slate-400">({f.id})</span></td>
                    <td className="p-2 font-sans text-slate-600">{f.manager}</td>
                    <td className="p-2 text-right text-slate-700">£{totalAcceptedGbp.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                    <td className="p-2 text-right text-emerald-600 font-bold">£{totalPaymentsReceivedGbp.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                    <td className={`p-2 text-right font-bold ${remainingDebtGbp > 0 ? "text-rose-600" : "text-slate-400"}`}>£{remainingDebtGbp.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 2. Personel Performans ve Maaş Mutabakatı */}
        <div className="space-y-3 break-inside-avoid">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1">2. PERSONEL MAAŞ & MESAI CARI DÖKÜMÜ</h2>
          <table className="w-full text-left text-[9px] border border-slate-200 rounded-lg overflow-hidden border-collapse">
            <thead>
              <tr className="bg-slate-50 uppercase text-slate-500 font-bold border-b border-slate-200">
                <th className="p-2">Personel Adı Soyadı (Rol)</th>
                <th className="p-2 text-center">Giriş Log</th>
                <th className="p-2 text-center">Toplam Mesai (Saat)</th>
                <th className="p-2 text-right">Baz Maaş</th>
                <th className="p-2 text-right">Mesai Ücreti</th>
                <th className="p-2 text-right">Ödenen (Avans)</th>
                <th className="p-2 text-right">Kalan Ödenecek</th>
              </tr>
            </thead>
            <tbody>
              {personnel.map(p => {
                const personRecords = records.filter(r => r.personnelId === p.id && r.checkIn);
                const personPayments = transactions.filter(t => t.personnelId === p.id && t.type === "EXPENSE");
                const kur = parseFloat(reportPersonnelBaseSalary) || 43.15;
                const mesaiSaatUcretiTry = parseFloat(reportPersonnelOvertimeRate) || 500;

                let totalHoursDecimal = 0;
                let totalOvertimeHoursDecimal = 0;

                personRecords.forEach(r => {
                  if (r.checkOut) {
                    const checkInTime = new Date(r.checkIn).getTime();
                    const checkOutTime = new Date(r.checkOut).getTime();
                    const diffMs = checkOutTime - checkInTime;
                    if (diffMs > 0) {
                      const durationHours = diffMs / (1000 * 60 * 60);
                      totalHoursDecimal += durationHours;
                      if (durationHours > 8) {
                        totalOvertimeHoursDecimal += (durationHours - 8);
                      }
                    }
                  }
                });

                const aylikMaasTry = p.aylik_maas_try || 50000;
                const gunlukUcretTry = aylikMaasTry / 26;

                const uniqueDates = new Set<string>();
                personRecords.forEach(r => {
                  const dateStr = r.checkIn.slice(0, 10);
                  const dateObj = new Date(r.checkIn);
                  if (!isNaN(dateObj.getTime()) && dateObj.getDay() !== 0) {
                    uniqueDates.add(dateStr);
                  }
                });
                const calistigiGunSayisi = uniqueDates.size;

                const totalEarnedOvertimeTry = Math.round((totalOvertimeHoursDecimal * mesaiSaatUcretiTry) * 100) / 100;
                const hakEdilenMaasTry = (calistigiGunSayisi * gunlukUcretTry) + totalEarnedOvertimeTry;
                const hakEdilenMaasGbp = Math.round((hakEdilenMaasTry / kur) * 100) / 100;

                const totalAlinanAvansTry = personPayments.reduce((sum, pay) => {
                  if (pay.currency === "TRY") return sum + pay.amount;
                  const txRate = pay.exchangeRate || kur;
                  return sum + (pay.amount * txRate);
                }, 0);

                const kalanOdenecekTry = hakEdilenMaasTry - totalAlinanAvansTry;

                const totalPaymentsMadeGbp = personPayments.reduce((sum, t) => sum + convertToGbp(t), 0);
                const remainingCompensationGbp = hakEdilenMaasGbp - totalPaymentsMadeGbp;

                return (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/20 font-mono animate-none">
                    <td className="p-2 font-sans font-bold text-slate-800">{p.fullName} <span className="text-[8px] font-normal text-slate-400">({p.role})</span></td>
                    <td className="p-2 text-center text-slate-500">{calistigiGunSayisi} Gün</td>
                    <td className="p-2 text-center text-slate-600">{totalHoursDecimal.toFixed(1)} s ({totalOvertimeHoursDecimal.toFixed(1)} Fazla)</td>
                    <td className="p-2 text-right text-slate-600">
                      <div>₺{aylikMaasTry.toLocaleString("tr-TR")}</div>
                      <div className="text-[7px] text-slate-400 font-normal">£{Math.round(aylikMaasTry / kur)}</div>
                    </td>
                    <td className="p-2 text-right text-slate-600">
                      <div>₺{totalEarnedOvertimeTry.toLocaleString("tr-TR")}</div>
                      <div className="text-[7px] text-slate-400 font-normal font-sans">£{Math.round(totalEarnedOvertimeTry / kur)}</div>
                    </td>
                    <td className="p-2 text-right text-rose-500 font-bold">
                      <div>₺{totalAlinanAvansTry.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</div>
                      <div className="text-[7px] text-slate-400 font-normal">£{totalPaymentsMadeGbp.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}</div>
                    </td>
                    <td className="p-2 text-right text-emerald-600 font-bold">
                      <div>₺{kalanOdenecekTry.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</div>
                      <div className="text-[7px] text-emerald-500 font-normal">£{remainingCompensationGbp.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 3. Ofis Giderleri ve Ortaklar Harcama Matrahı */}
        {(() => {
          const allMonthTxs = transactions.filter(t => t.type === "EXPENSE" && t.category === "Ofis Genel Gideri");
          const hasanTotalGbp = allMonthTxs
            .filter(t => t.partnerId === "Hasan_Ofis" || (t.description && t.description.includes("Ödeyen: Hasan")))
            .reduce((sum, t) => sum + convertToGbp(t), 0);

          const mustafaTotalGbp = allMonthTxs
            .filter(t => t.partnerId === "Mustafa_Ofis" || (t.description && t.description.includes("Ödeyen: Mustafa")))
            .reduce((sum, t) => sum + convertToGbp(t), 0);

          const kasadanTotalGbp = allMonthTxs
            .filter(t => (!t.partnerId && !t.description.includes("Ödeyen: Hasan") && !t.description.includes("Ödeyen: Mustafa")) || (t.description && t.description.includes("Ödeyen: Kasadan")))
            .reduce((sum, t) => sum + convertToGbp(t), 0);

          const grandTotalGbp = hasanTotalGbp + mustafaTotalGbp + kasadanTotalGbp;
          const diffGbp = hasanTotalGbp - mustafaTotalGbp;
          let calculationStatus = "Hasan ve Mustafa'nın cebinden ödediği tutarlar tamamen eşittir.";
          let debtMessage = "";

          if (diffGbp > 0) {
            const reimbursement = Math.round((diffGbp / 2) * 100) / 100;
            debtMessage = `MUSTAFA, HASAN'A ŞAHSEN £${reimbursement.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} GBP NAKİT ÖDEME YAPMALIDIR.`;
            calculationStatus = `Hasan cebinden £${hasanTotalGbp.toLocaleString("tr-TR")} harcadı. Mustafa cebinden £${mustafaTotalGbp.toLocaleString("tr-TR")} harcadı. Hasan, Mustafa'dan £${reimbursement.toLocaleString("tr-TR")} alacaklıdır.`;
          } else if (diffGbp < 0) {
            const reimbursement = Math.round((Math.abs(diffGbp) / 2) * 100) / 100;
            debtMessage = `HASAN, MUSTAFA'YA ŞAHSEN £${reimbursement.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} GBP NAKİT ÖDEME YAPMALIDIR.`;
            calculationStatus = `Mustafa cebinden £${mustafaTotalGbp.toLocaleString("tr-TR")} harcadı. Hasan cebinden £${hasanTotalGbp.toLocaleString("tr-TR")} harcadı. Mustafa, Hasan'dan £${reimbursement.toLocaleString("tr-TR")} alacaklıdır.`;
          }

          return (
            <div className="space-y-3 break-inside-avoid pt-2">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1">3. OFİS GİDER & ORTAKLAR HESAP DENGE CETVELİ</h2>
              
              <div className="grid grid-cols-4 gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-250 font-mono text-[9px]">
                <div>
                  <span className="text-slate-400 block uppercase font-sans font-bold">Hasan Cebinden S.</span>
                  <span className="font-extrabold text-slate-700 text-[10px]">£{hasanTotalGbp.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-sans font-bold">Mustafa Cebinden S.</span>
                  <span className="font-extrabold text-slate-700 text-[10px]">£{mustafaTotalGbp.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-sans font-bold">Ortak Kasadan</span>
                  <span className="font-extrabold text-slate-500 text-[10px]">£{kasadanTotalGbp.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-indigo-600 block uppercase font-sans font-bold">Dönem Toplam Gider</span>
                  <span className="font-black text-indigo-700 text-[10px]">£{grandTotalGbp.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/40 border border-indigo-150 rounded-xl">
                <div className="text-[9px] font-bold text-indigo-800 uppercase tracking-wide">⚖️ HESAPLAŞMA VE BORÇ MUTABAKATI:</div>
                <p className="text-[10px] text-indigo-700 mt-1 leading-relaxed font-semibold">
                  {calculationStatus}
                </p>
                {debtMessage && (
                  <p className="mt-1.5 text-[10px] font-black text-red-650 font-mono">
                    📢 {debtMessage}
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Unified signature area for internal records */}
        <div className="pt-8 border-t border-dashed border-slate-300 mt-6 break-inside-avoid">
          <div className="grid grid-cols-2 gap-12 text-center text-slate-800">
            <div>
              <p className="text-[10px] font-bold underline">HASAN ŞAHİNER</p>
              <p className="text-[8px] text-slate-400 mt-0.5">Mutabık Onay - Islak İmza</p>
              <div className="h-10"></div>
              <p className="text-[8px] text-slate-500">Tarih: .... / .... / 2026</p>
            </div>
            <div>
              <p className="text-[10px] font-bold underline">MUSTAFA AKPINAR</p>
              <p className="text-[8px] text-slate-400 mt-0.5">Mutabık Onay - Islak İmza</p>
              <div className="h-10"></div>
              <p className="text-[8px] text-slate-500">Tarih: .... / .... / 2026</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Advance Modal */}
      {editingGider && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="report-edit-advance-modal">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Pencil className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="text-left">
                <h3 className="font-bold text-slate-800 text-sm">Avans Kaydı Düzenleme</h3>
                <p className="text-[10px] text-slate-400">Yapılan değişiklikler eş zamanlı maaş hesaplamasına ve kasa hareketine uygulanacaktır.</p>
              </div>
            </div>

            <div className="space-y-3 text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-505 mb-1">AVANS MİKTARI (TRY)</label>
                <input
                  type="number"
                  value={editAmountValue}
                  onChange={(e) => setEditAmountValue(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono font-bold focus:bg-white focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-505 mb-1">AÇIKLAMA</label>
                <input
                  type="text"
                  value={editDescValue}
                  onChange={(e) => setEditDescValue(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">TAKSİT SAYISI</label>
                  <select
                    value={editTaksitValue}
                    onChange={(e) => setEditTaksitValue(parseInt(e.target.value) || 1)}
                    className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:bg-white"
                  >
                    <option value={1}>1 Taksit (Tek Sefer)</option>
                    <option value={2}>2 Taksit (Eşit Dağılım)</option>
                    <option value={3}>3 Taksit (Eşit Dağılım)</option>
                    <option value={4}>4 Taksit (Eşit Dağılım)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-505 mb-1">TAHSİS TARİHİ</label>
                  <input
                    type="date"
                    value={editDateValue}
                    onChange={(e) => setEditDateValue(e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingGider(null)}
                className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleUpdateGider}
                className="py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                KAYDET VE GÜNCELLE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Report Alert Modal Overlay */}
      {reportAlert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="report-custom-alert-modal">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <span className="font-bold text-lg">!</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">{reportAlert.title || "Bildirim"}</h3>
              <p className="text-xs text-slate-500 leading-relaxed text-left">{reportAlert.message}</p>
            </div>
            <button
              onClick={() => setReportAlert(null)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Tamam
            </button>
          </div>
        </div>
      )}

      {/* Custom Report Confirm Modal Overlay */}
      {reportConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="report-custom-confirm-modal">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <span className="font-bold text-lg">?</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">{reportConfirm.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed text-left">{reportConfirm.message}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setReportConfirm(null)}
                className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  reportConfirm.onConfirm();
                  setReportConfirm(null);
                }}
                className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Evet, Onayla
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
