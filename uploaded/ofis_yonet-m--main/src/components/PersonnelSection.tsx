/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Personnel } from "../types";
import { 
  Users2, 
  Plus, 
  Search, 
  Trash2, 
  Phone, 
  Fingerprint, 
  Calendar, 
  Briefcase, 
  Wallet, 
  Coins, 
  History, 
  FileText, 
  Calculator, 
  ArrowRight,
  TrendingUp,
  Pencil
} from "lucide-react";

interface PersonnelSectionProps {
  personnel: Personnel[];
  onAddPersonnel: (personnelData: Omit<Personnel, "id" | "createdAt">) => Promise<boolean | string>;
  onDeletePersonnel: (id: string) => Promise<{ success: boolean; error?: string }>;
  onAddAdvance: (personnelId: string, miktar_try: number, date: string, desc: string, taksitSayisi?: number) => Promise<any>;
  onCalculateAndPay: (personnelId: string, calisilanGun: number, toplamMesaiSaati: number, ay: string) => Promise<any>;
  personnelGiderleri: any[];
  txExchangeRate: string;
  onDeleteAdvance?: (id: string) => Promise<any>;
  onEditAdvance?: (id: string, miktar_try: number, date: string, desc: string, taksitSayisi: number) => Promise<any>;
  records?: any[];
}

export default function PersonnelSection({
  personnel,
  onAddPersonnel,
  onDeletePersonnel,
  onAddAdvance,
  onCalculateAndPay,
  personnelGiderleri = [],
  txExchangeRate,
  onDeleteAdvance,
  onEditAdvance,
  records = []
}: PersonnelSectionProps) {
  // Add personnel form states
  const [idCardNo, setIdCardNo] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState("");
  const [aylikMaasTry, setAylikMaasTry] = useState("50000");
  const [mesaiSaatUcretiTry, setMesaiSaatUcretiTry] = useState("500");

  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // General feedback messages
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);

  // Custom dialog alert/confirm states to bypass blocked standard modals inside PersonnelSection
  const [sectionAlert, setSectionAlert] = useState<{ message: string; title?: string } | null>(null);
  const [sectionConfirm, setSectionConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  // Edit Advance Modal/Popup states
  const [editingGider, setEditingGider] = useState<any | null>(null);
  const [editAmountValue, setEditAmountValue] = useState<string>("");
  const [editDescValue, setEditDescValue] = useState<string>("");
  const [editDateValue, setEditDateValue] = useState<string>("");
  const [editTaksitValue, setEditTaksitValue] = useState<number>(1);

  // Card interactive states indexed by personnel ID
  const [activeCardAction, setActiveCardAction] = useState<Record<string, "none" | "avans" | "hesapla">>({});
  const [personnelDays, setPersonnelDays] = useState<Record<string, number>>({});
  const [personnelOvertimeHours, setPersonnelOvertimeHours] = useState<Record<string, number>>({});
  const [personnelMonth, setPersonnelMonth] = useState<Record<string, string>>({});

  // Avans Form States indexed by personnel ID
  const [avansAmount, setAvansAmount] = useState<Record<string, string>>({});
  const [avansDate, setAvansDate] = useState<Record<string, string>>({});
  const [avansDesc, setAvansDesc] = useState<Record<string, string>>({});
  const [avansTaksit, setAvansTaksit] = useState<Record<string, number>>({});

  // Action submitting indicators
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Defaults helpers for interactive states
  const getActiveAction = (id: string) => activeCardAction[id] ?? "none";
  const getDays = (id: string) => personnelDays[id] ?? 26;
  const getOvertime = (id: string) => personnelOvertimeHours[id] ?? 0;
  const getMonth = (id: string) => personnelMonth[id] ?? new Date().toISOString().slice(0, 7); // YYYY-MM

  const getDerivedDaysAndOvertime = (id: string) => {
    const selectedMonth = getMonth(id);
    const personRecords = (records || []).filter(r => {
      if (r.personnelId !== id) return false;
      if (!r.checkIn) return false;
      return r.checkIn.slice(0, 7) === selectedMonth;
    });

    const hasRecords = personRecords.length > 0;

    const uniqueDates = new Set<string>();
    personRecords.forEach(r => {
      const dateStr = r.checkIn.slice(0, 10);
      const dateObj = new Date(r.checkIn);
      if (!isNaN(dateObj.getTime()) && dateObj.getDay() !== 0) {
        uniqueDates.add(dateStr);
      }
    });

    let calculatedOvertime = 0;
    personRecords.forEach(r => {
      if (r.checkOut) {
        const inMs = new Date(r.checkIn).getTime();
        const outMs = new Date(r.checkOut).getTime();
        const diff = outMs - inMs;
        if (diff > 0) {
          const hours = diff / (1000 * 60 * 60);
          if (hours > 8) {
            calculatedOvertime += (hours - 8);
          }
        }
      }
    });

    const days = personnelDays[id] !== undefined 
      ? personnelDays[id] 
      : (hasRecords ? Math.min(26, uniqueDates.size) : 26);

    const overtime = personnelOvertimeHours[id] !== undefined 
      ? personnelOvertimeHours[id] 
      : (hasRecords ? Math.round(calculatedOvertime * 10) / 10 : 0);

    return { 
      days, 
      overtime, 
      hasRecords, 
      actualDaysFromRecords: uniqueDates.size, 
      actualOvertimeFromRecords: Math.round(calculatedOvertime * 10) / 10 
    };
  };

  const getAvansAmount = (id: string) => avansAmount[id] ?? "";
  const getAvansDate = (id: string) => avansDate[id] ?? new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const getAvansDesc = (id: string) => avansDesc[id] ?? "";
  const getAvansTaksit = (id: string) => avansTaksit[id] ?? 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!idCardNo.trim() || !fullName.trim() || !role.trim() || !phone.trim() || !startDate || !aylikMaasTry.trim() || !mesaiSaatUcretiTry.trim()) {
      setErrorMsg("Lütfen tüm alanları (TC Kimlik No dahil) eksiksiz bir şekilde doldurun.");
      return;
    }

    if (idCardNo.trim().length !== 11 || isNaN(Number(idCardNo.trim()))) {
      setErrorMsg("TC Kimlik No tam olarak 11 haneli sayısal bir değer olmalıdır.");
      return;
    }

    if (isNaN(Number(aylikMaasTry.trim())) || parseFloat(aylikMaasTry.trim()) <= 0) {
      setErrorMsg("Aylık Maaş geçerli bir pozitif sayı olmalıdır.");
      return;
    }

    if (isNaN(Number(mesaiSaatUcretiTry.trim())) || parseFloat(mesaiSaatUcretiTry.trim()) <= 0) {
      setErrorMsg("Mesai Saat Ücreti geçerli bir pozitif sayı olmalıdır.");
      return;
    }

    setIsSubmitting(true);
    const result = await onAddPersonnel({
      idCardNo: idCardNo.trim(),
      fullName: fullName.trim(),
      role: role.trim(),
      phone: phone.trim(),
      startDate: startDate,
      aylik_maas_try: parseFloat(aylikMaasTry.trim()),
      mesai_saat_ucreti_try: parseFloat(mesaiSaatUcretiTry.trim())
    });
    setIsSubmitting(false);

    if (result === true) {
      setSuccessMsg("Personel başarıyla kayıt edildi!");
      setIdCardNo("");
      setFullName("");
      setRole("");
      setPhone("");
      setStartDate("");
      setAylikMaasTry("50000");
      setMesaiSaatUcretiTry("500");
      setTimeout(() => setSuccessMsg(""), 3500);
    } else {
      setErrorMsg(typeof result === "string" ? result : "Personel eklenirken sunucu hatası oluştu.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setDeleteErrorMsg(null);
    setSectionConfirm({
      title: "Personel Kartı Silinecek",
      message: `"${name}" adlı personelin kartını silmek istediğinize emin misiniz?`,
      onConfirm: async () => {
        const result = await onDeletePersonnel(id);
        if (!result.success) {
          setDeleteErrorMsg(result.error || "Personel silinemedi.");
          setTimeout(() => setDeleteErrorMsg(null), 5000);
        } else {
          setSectionAlert({
            title: "Başarılı",
            message: `"${name}" adlı personelin kaydı silindi.`
          });
        }
      }
    });
  };

  // Submit Avans
  const handleAvansSubmit = async (personnelId: string) => {
    const amount = parseFloat(getAvansAmount(personnelId));
    const date = getAvansDate(personnelId);
    const desc = getAvansDesc(personnelId).trim();

    if (isNaN(amount) || amount <= 0) {
      setSectionAlert({
        title: "Hata",
        message: "Lütfen geçerli bir avans tutarı girin."
      });
      return;
    }
    if (!desc) {
      setSectionAlert({
        title: "Hata",
        message: "Lütfen avans açıklaması sağlayın."
      });
      return;
    }

    setActionLoading(prev => ({ ...prev, [personnelId]: true }));
    try {
      const taksit = getAvansTaksit(personnelId);
      await onAddAdvance(personnelId, amount, date, desc, taksit);
      setSectionAlert({
        title: "Başarılı",
        message: "Avans kaydı başarıyla oluşturuldu ve kasaya yansıtıldı."
      });
      // Reset State
      setAvansAmount(prev => ({ ...prev, [personnelId]: "" }));
      setAvansDesc(prev => ({ ...prev, [personnelId]: "" }));
      setAvansTaksit(prev => ({ ...prev, [personnelId]: 1 }));
      setActiveCardAction(prev => ({ ...prev, [personnelId]: "none" }));
    } catch (err: any) {
      setSectionAlert({
        title: "Hata",
        message: err.message || "Avans işlenirken hata oluştu."
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [personnelId]: false }));
    }
  };

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
      setSectionAlert({ title: "Hata", message: "Lütfen geçerli bir tutar girin." });
      return;
    }
    if (!editDescValue.trim()) {
      setSectionAlert({ title: "Hata", message: "Lütfen açıklama girin." });
      return;
    }
    try {
      if (onEditAdvance) {
        await onEditAdvance(editingGider.id, amount, editDateValue, editDescValue, editTaksitValue);
        setEditingGider(null);
        setSectionAlert({
          title: "Başarılı",
          message: "Avans kaydı ve ilişkili kasa hareketi başarıyla güncellendi."
        });
      }
    } catch (err: any) {
      setSectionAlert({ title: "Hata", message: err.message || "Güncelleme yapılırken hata oluştu." });
    }
  };

  const handleDeleteGider = (g: any) => {
    setSectionConfirm({
      title: "Avans Silme Onayı",
      message: `${g.aciklama} (₺${g.miktar_try.toLocaleString("tr-TR")} TRY) tutarındaki avans kaydını silmek istediğinize emin misiniz? Bu işlem ilişkili kasa hareketini de silecektir.`,
      onConfirm: async () => {
        try {
          if (onDeleteAdvance) {
            await onDeleteAdvance(g.id);
            setSectionAlert({
              title: "Başarılı",
              message: "Avans kaydı ve ilişkili kasa hareketi silindi."
            });
          }
        } catch (err: any) {
          setSectionAlert({ title: "Hata", message: err.message || "Avans silinemedi." });
        }
      }
    });
  };

  // Submit Calculation / Payment
  const handleCalculateSubmit = async (personnelId: string) => {
    const days = getDays(personnelId);
    const overtime = getOvertime(personnelId);
    const month = getMonth(personnelId);

    setSectionConfirm({
      title: "Maaş Hak Ediş Ödemesi",
      message: "Hesaplanan net tutar Kasa defterine (GBP olarak) yansıtılacak ve personelin kalan maaş alacağı sıfırlanacaktır. Devam etmek istiyor musunuz?",
      onConfirm: async () => {
        setActionLoading(prev => ({ ...prev, [personnelId]: true }));
        try {
          await onCalculateAndPay(personnelId, days, overtime, month);
          setSectionAlert({
            title: "Ödeme Başarılı",
            message: "Personel maaş hak edişi başarıyla kasaya gider olarak işlendi."
          });
          setActiveCardAction(prev => ({ ...prev, [personnelId]: "none" }));
        } catch (err: any) {
          setSectionAlert({
            title: "Ödeme Başarısız",
            message: err.message || "Hesaplama ve ödeme işlemi başarısız oldu."
          });
        } finally {
          setActionLoading(prev => ({ ...prev, [personnelId]: false }));
        }
      }
    });
  };

  const filteredPersonnel = personnel.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.idCardNo.includes(searchQuery)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="personnel-section">
      
      {/* Create Personnel Form Card */}
      <div 
        id="personnel-add-form-card"
        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs h-fit"
      >
        <div className="flex items-center gap-2 mb-4">
          <Users2 className="w-5 h-5 text-indigo-550" />
          <h2 className="text-base font-bold text-slate-800 tracking-tight">Yeni Personel Kartı</h2>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-100 font-medium animate-pulse">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-100 font-medium">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" id="personnel-registration-form">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">TC KİMLİK NO *</label>
            <input
              type="text"
              maxLength={11}
              placeholder="Örn: 12345678901"
              value={idCardNo}
              onChange={(e) => setIdCardNo(e.target.value.replace(/\D/g, ""))}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 font-bold tracking-wider"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">AD SOYAD *</label>
            <input
              type="text"
              placeholder="Örn: Ahmet Erdem"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">GÖREV / UNVAN *</label>
            <input
              type="text"
              placeholder="Örn: Maket Tasarım Uzmanı"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">TELEFON *</label>
              <input
                type="tel"
                placeholder="0532..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">BAŞLAMA TARİHİ *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 font-medium text-center"
                required
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-indigo-700 tracking-wider mb-1">NET MAAŞ (TRY) *</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-500">₺</span>
                  <input
                    type="number"
                    placeholder="50000"
                    value={aylikMaasTry}
                    onChange={(e) => setAylikMaasTry(e.target.value)}
                    className="w-full pl-6 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-550 focus:bg-white transition-all text-slate-800 font-bold text-center"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-indigo-700 tracking-wider mb-1">MESAİ SAAT ÜCRETİ *</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-500">₺</span>
                  <input
                    type="number"
                    placeholder="500"
                    value={mesaiSaatUcretiTry}
                    onChange={(e) => setMesaiSaatUcretiTry(e.target.value)}
                    className="w-full pl-6 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-550 focus:bg-white transition-all text-slate-800 font-bold text-center"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            id="register-personnel-btn"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs disabled:bg-indigo-300 cursor-pointer mt-2"
          >
            <Plus className="w-4 h-4" />
            {isSubmitting ? "Kaydediliyor..." : "PERSONEL KARTINI OLUŞTUR"}
          </button>
        </form>
      </div>

      {/* Personnel List Container */}
      <div 
        id="personnel-list-card"
        className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Users2 className="w-5 h-5 text-indigo-500" />
              Kayıtlı Çalışan Kadrosu ({personnel.length})
            </h2>
            <p className="text-[11px] text-slate-400">Türk Lirası (TRY) tabanlı hakediş, mesai ve avans takip defteri</p>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Personel ara (Görev, İsim)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 w-full sm:w-64 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-700 font-medium"
            />
          </div>
        </div>

        {deleteErrorMsg && (
          <div className="mb-4 p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200 font-semibold">
            🚩 {deleteErrorMsg}
          </div>
        )}

        {filteredPersonnel.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-100 rounded-2xl">
            <Users2 className="w-12 h-12 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-500">Kriterlere Uygun Personel Bulunamadı</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[680px] overflow-y-auto pr-1">
            {filteredPersonnel.map((person) => {
              const contractSalary = person.aylik_maas_try || 50000;
              const overtimeRate = person.mesai_saat_ucreti_try || 500;
              const dailyWage = contractSalary / 26;

              // Action Form State local values
              const action = getActiveAction(person.id);
              const { days, overtime, hasRecords, actualDaysFromRecords, actualOvertimeFromRecords } = getDerivedDaysAndOvertime(person.id);
              const selectedMonth = getMonth(person.id);

              // Calculate active-month total advances from personel_giderleri
              const personAdvancesThisMonth = personnelGiderleri
                .filter(g => g.personnelId === person.id && g.tarih.startsWith(selectedMonth));
              const totalAdvancesThisMonthTry = personAdvancesThisMonth.reduce((sum, g) => sum + g.miktar_try, 0);

              // Mathematical motor results
              const earnedBaseTry = days * dailyWage;
              const earnedOvertimeTry = overtime * overtimeRate;
              const totalEarnedTry = earnedBaseTry + earnedOvertimeTry;
              const remainingNetPayTry = totalEarnedTry - totalAdvancesThisMonthTry;
              const remainingNetPayGbp = remainingNetPayTry / (parseFloat(txExchangeRate) || 43.15);

              // All historic advances
              const personAllAdvances = personnelGiderleri.filter(g => g.personnelId === person.id);

              return (
                <div
                  key={person.id}
                  id={`personnel-card-${person.id}`}
                  className="p-5 rounded-2xl border border-slate-150 bg-slate-50/30 hover:border-indigo-200 hover:bg-indigo-50/5 transition-all relative flex flex-col justify-between group"
                >
                  {/* Delete Button */}
                  <button
                    type="button"
                    id={`delete-personnel-btn-${person.id}`}
                    onClick={() => handleDelete(person.id, person.fullName)}
                    className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Personeli Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="space-y-4">
                    {/* Header */}
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                        {person.fullName}
                      </h3>
                      <p className="text-[10px] font-bold text-indigo-650 tracking-wider uppercase mt-1 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 shrink-0" />
                        {person.role}
                      </p>
                    </div>

                    {/* Metadata specs */}
                    <div className="grid grid-cols-2 gap-2 p-3 bg-white rounded-xl border border-slate-100 text-[11px] text-slate-600 font-mono">
                      <div className="col-span-2 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>Telefon: <strong>{person.phone}</strong></span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1 border-t border-slate-50 pt-1 mt-1 text-[10px] text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Giriş: {person.startDate ? new Date(person.startDate).toLocaleDateString("tr-TR") : "-"}</span>
                      </div>
                    </div>

                    {/* Financial Terms (TRY) */}
                    <div className="space-y-1.5 text-xs bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/40 font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-sans">Net Aylık Maaş:</span>
                        <span className="font-bold text-indigo-750">₺{contractSalary.toLocaleString("tr-TR")} / Ay</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-indigo-100/30 text-[10px]">
                        <span className="text-slate-400 font-sans">Günlük Taban Ücret (1/26):</span>
                        <span className="font-bold text-slate-600">₺{dailyWage.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {/* Active Advances Status Box */}
                    {(() => {
                      const activeAdvs = (personnelGiderleri || []).filter(
                        g => g.personnelId === person.id && !g.completed && (g.kalan_taksit !== undefined ? g.kalan_taksit : 1) > 0
                      );
                      if (activeAdvs.length === 0) return null;
                      return (
                        <div className="p-3 bg-amber-50/50 border border-amber-200/50 rounded-xl space-y-1.5 font-mono">
                          <div className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5 text-amber-600" />
                            AKTİF AVANS DURUMU
                          </div>
                          <div className="space-y-1 text-[11px] text-amber-970">
                            {activeAdvs.map(g => {
                              const kt = g.kalan_taksit !== undefined ? g.kalan_taksit : 1;
                              const tt = g.toplam_taksit !== undefined ? g.toplam_taksit : 1;
                              const aylik = g.aylik_taksit_tutari_try !== undefined ? g.aylik_taksit_tutari_try : g.miktar_try;
                              const odendiCount = tt - kt;
                              const suankiTaksitSirasi = odendiCount + 1;
                              const kalanTutar = kt * aylik;

                              return (
                                <div key={g.id} className="leading-normal border-b border-amber-200/20 pb-1 last:border-0 last:pb-0">
                                  Aktif Avans Borcu: <strong className="text-amber-900">₺{kalanTutar.toLocaleString("tr-TR")}</strong> TRY ({suankiTaksitSirasi}. Taksit / Toplam {tt} Taksit - Bu Ay Kesilecek: <strong className="text-amber-900">₺{aylik.toLocaleString("tr-TR")}</strong> TRY)
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Interactive Action Forms Block */}
                    {action === "none" && (
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveCardAction(prev => ({ ...prev, [person.id]: "avans" }))}
                          className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          AVANS İŞLE
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveCardAction(prev => ({ ...prev, [person.id]: "hesapla" }))}
                          className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          HAK EDİŞ HESAPLA
                        </button>
                      </div>
                    )}

                    {/* Action SUBFORM 1: Avans Isleme */}
                    {action === "avans" && (
                      <div className="p-3.5 bg-amber-50/60 border border-amber-200/60 rounded-xl space-y-3 animate-fade-in relative">
                        <h4 className="text-[11px] font-bold text-amber-800 tracking-wider uppercase flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-amber-600" />
                          PERSONELE AVANS ÖDEME KAYDI
                        </h4>

                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[8px] font-bold text-amber-700 uppercase mb-0.5">TUTAR (TRY)</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-600">₺</span>
                                <input
                                  type="number"
                                  placeholder="Tutar"
                                  value={getAvansAmount(person.id)}
                                  onChange={(e) => setAvansAmount(p => ({ ...p, [person.id]: e.target.value }))}
                                  className="w-full pl-5 pr-1.5 py-1 text-xs bg-white border border-amber-200 rounded-lg text-slate-800 font-bold"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-amber-700 uppercase mb-0.5">ÖDEME TARİHİ</label>
                              <input
                                type="date"
                                value={getAvansDate(person.id)}
                                onChange={(e) => setAvansDate(p => ({ ...p, [person.id]: e.target.value }))}
                                className="w-full px-1.5 py-1 text-xs bg-white border border-amber-200 rounded-lg text-slate-700 text-center font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[8px] font-bold text-amber-700 uppercase mb-0.5">TAKSİT SAYISI</label>
                            <select
                              value={getAvansTaksit(person.id)}
                              onChange={(e) => setAvansTaksit(p => ({ ...p, [person.id]: Number(e.target.value) }))}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-amber-200 rounded-lg text-slate-700 font-medium cursor-pointer"
                            >
                              <option value={1}>1 (Tek Seferde)</option>
                              <option value={2}>2 Taksit</option>
                              <option value={3}>3 Taksit</option>
                              <option value={4}>4 Taksit</option>
                            </select>
                            {getAvansTaksit(person.id) > 1 && getAvansAmount(person.id) && (
                              <p className="text-[10px] text-amber-800 font-mono mt-1 font-semibold">
                                Aylık Kesinti Tutarı: <strong>₺{Math.round((Number(getAvansAmount(person.id)) || 0) / getAvansTaksit(person.id)).toLocaleString("tr-TR")} TRY</strong>
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-[8px] font-bold text-amber-700 uppercase mb-0.5">AÇIKLAMA / NOT</label>
                            <input
                              type="text"
                              placeholder="Örn: Haziran ilk avansı"
                              value={getAvansDesc(person.id)}
                              onChange={(e) => setAvansDesc(p => ({ ...p, [person.id]: e.target.value }))}
                              className="w-full px-2 py-1 text-xs bg-white border border-amber-200 rounded-lg text-slate-850"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={actionLoading[person.id]}
                            onClick={() => handleAvansSubmit(person.id)}
                            className="flex-1 py-1 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            {actionLoading[person.id] ? "Gönderiliyor..." : "AVANSI DEFTERE İŞLE"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveCardAction(p => ({ ...p, [person.id]: "none" }))}
                            className="py-1 px-2.5 bg-slate-200 hover:bg-slate-350 text-slate-700 rounded-lg text-[10px] font-bold transition-all"
                          >
                            İPTAL
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action SUBFORM 2: Hakedis Hesaplama Motoru */}
                    {action === "hesapla" && (
                      <div className="p-3.5 bg-indigo-50/60 border border-indigo-200/60 rounded-xl space-y-3.5 animate-fade-in text-xs font-sans">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[11px] font-bold text-indigo-850 uppercase tracking-tight flex items-center gap-1">
                            <Calculator className="w-3.5 h-3.5 text-indigo-650" />
                            HAKEDİŞ & MAAŞ HESAP MOTORU
                          </h4>
                          <select
                            value={selectedMonth}
                            onChange={(e) => setPersonnelMonth(p => ({ ...p, [person.id]: e.target.value }))}
                            className="px-1.5 py-0.5 text-[10px] font-bold bg-white border border-indigo-200 rounded-md text-indigo-700 font-mono"
                          >
                            <option value="2026-05">Mayıs 2026</option>
                            <option value="2026-06">Haziran 2026</option>
                            <option value="2026-07">Temmuz 2026</option>
                          </select>
                        </div>

                        {hasRecords && (
                          <div className="p-2.5 bg-emerald-55/70 text-emerald-850 rounded-xl border border-emerald-100 text-[10px] leading-relaxed flex flex-col gap-0.5 font-sans mb-2">
                            <span className="font-extrabold text-[10px] text-emerald-900 flex items-center gap-1">🌐 Ofis Wi-Fi Giriş-Çıkış Entegrasyonu Aktif</span>
                            <span className="text-[9.5px] text-slate-650 leading-snug">Bu çalışanın {selectedMonth} dönemi mesai loglarından <strong>{actualDaysFromRecords} gün</strong> ve <strong>{actualOvertimeFromRecords} saat fazla mesai</strong> hesaplanıp otomatik getirilmiştir. Değerleri değiştirmek için aşağıdan manuel yazabilirsiniz.</span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 pb-2 border-b border-indigo-100/50">
                          <div>
                            <label className="block text-[8.5px] font-bold text-indigo-600 mb-1">ÇALIŞILAN GÜN (Max 26)</label>
                            <input
                              type="number"
                              min={0}
                              max={26}
                              value={days}
                              onChange={(e) => setPersonnelDays(p => ({ ...p, [person.id]: parseInt(e.target.value) || 0 }))}
                              className="w-full px-2 py-1 text-xs bg-white border border-indigo-200 rounded-lg font-bold text-center"
                            />
                          </div>

                          <div>
                            <label className="block text-[8.5px] font-bold text-indigo-600 mb-1">TOPLAM MESAİ (SAAT)</label>
                            <input
                              type="number"
                              min={0}
                              value={overtime}
                              onChange={(e) => setPersonnelOvertimeHours(p => ({ ...p, [person.id]: parseFloat(e.target.value) || 0 }))}
                              className="w-full px-2 py-1 text-xs bg-white border border-indigo-200 rounded-lg font-bold text-center"
                            />
                          </div>
                        </div>

                        {/* Motor Results Dynamic Breakdown Preview */}
                        <div className="space-y-1 text-[10px] font-mono text-slate-650 pt-1">
                          <div className="flex items-center justify-between">
                            <span>Kazanılan Taban Maaş ({days} Gün):</span>
                            <span className="font-semibold text-slate-800">₺{Math.round(earnedBaseTry).toLocaleString("tr-TR")}</span>
                          </div>
                          <div className="flex items-center justify-between text-rose-600">
                            <span>Mesai Hakedişi (+{overtime}s):</span>
                            <span className="font-semibold">₺{Math.round(earnedOvertimeTry).toLocaleString("tr-TR")}</span>
                          </div>
                          <div className="flex items-center justify-between text-amber-600">
                            <span>Sistem Avans Kayıtları ({selectedMonth}):</span>
                            <span className="font-semibold">-₺{totalAdvancesThisMonthTry.toLocaleString("tr-TR")}</span>
                          </div>
                          
                          <div className="flex items-center justify-between pt-1.5 border-t border-indigo-150/40 text-[11px] font-sans text-slate-800 font-bold">
                            <span>Kalan Ödenecek Net:</span>
                            <span className="text-emerald-600 font-mono">₺{Math.round(remainingNetPayTry).toLocaleString("tr-TR")} TRY</span>
                          </div>

                          <div className="flex items-center justify-between text-[9px] text-slate-500 font-sans border-b border-indigo-100/30 pb-1 mt-0.5">
                            <span className="italic">Kasa Sterlin Karşılığı (Kur: 1 GBP = {txExchangeRate} TRY):</span>
                            <span className="font-bold font-mono">£{remainingNetPayGbp.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} GBP</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={actionLoading[person.id] || remainingNetPayTry <= 0}
                            onClick={() => handleCalculateSubmit(person.id)}
                            className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-750 text-white rounded-lg text-[10px] font-bold transition-all disabled:bg-slate-300 disabled:text-slate-500 cursor-pointer flex items-center justify-center gap-1"
                          >
                            <TrendingUp className="w-3 h-3" />
                            {actionLoading[person.id] ? "Yansıtılıyor..." : "KASADAN ÖDEMEYİ YAP"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveCardAction(p => ({ ...p, [person.id]: "none" }))}
                            className="py-1.5 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-bold transition-all"
                          >
                            İPTAL
                          </button>
                        </div>
                        {remainingNetPayTry <= 0 && (
                          <div className="text-[9px] text-amber-600 font-medium leading-normal bg-amber-50 p-1.5 rounded-lg border border-amber-100/50">
                            ⓘ Bu dönem için kalan ödenecek tutar bulunmadığı için kasadan nakit/havale düşüşü yapılamaz.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Historical Advances list inside Card */}
                    {personAllAdvances.length > 0 && (
                      <div className="pt-2 border-t border-slate-100/50">
                        <h4 className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mb-1.5 flex items-center gap-1">
                          <History className="w-3 h-3 text-slate-400" />
                          HESAP HAREKETLERİ & AVANSLARI ({personAllAdvances.length})
                        </h4>
                        <div className="max-h-[140px] overflow-y-auto space-y-1 pr-0.5 font-mono text-[9px] text-slate-500">
                          {personAllAdvances.slice().reverse().map((g) => (
                            <div key={g.id} className="flex items-center justify-between p-1 bg-slate-100/50 rounded border border-slate-100 gap-1 group/item">
                              <div className="min-w-0 flex-1">
                                <span className="truncate block font-bold text-slate-700 font-sans" title={g.aciklama}>{g.aciklama}</span>
                                <span className="text-[7.5px] text-slate-400 block">{g.tarih} {g.toplam_taksit && g.toplam_taksit > 1 ? `(${g.toplam_taksit - (g.kalan_taksit ?? 1) + 1}/${g.toplam_taksit} Tks - Kalan Tks: ${g.kalan_taksit})` : ""}</span>
                              </div>
                              <div className="text-right whitespace-nowrap shrink-0 ml-1">
                                <strong className="text-rose-500">-₺{g.miktar_try.toLocaleString("tr-TR")}</strong>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 ml-1 opacity-60 group-hover/item:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleEditClick(g)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition-colors cursor-pointer"
                                  title="Avansı Düzenle"
                                >
                                  <Pencil className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteGider(g)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition-colors cursor-pointer"
                                  title="Avansı Sil"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-[9px] text-slate-400 font-mono tracking-wider justify-between shrink-0">
                    <span>PERS ID: <span className="font-bold text-slate-650">{person.id}</span></span>
                    <span>{new Date(person.createdAt).toLocaleDateString("tr-TR")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Advance Modal */}
      {editingGider && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="edit-advance-modal">
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

      {/* Custom Section Alert Modal Overlay */}
      {sectionAlert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in animate-duration-200" id="section-custom-alert-modal">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <span className="font-bold text-lg">!</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">{sectionAlert.title || "Bildirim"}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{sectionAlert.message}</p>
            </div>
            <button
              onClick={() => setSectionAlert(null)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Tamam
            </button>
          </div>
        </div>
      )}

      {/* Custom Section Confirm Modal Overlay */}
      {sectionConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in animate-duration-200" id="section-custom-confirm-modal">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <span className="font-bold text-lg">?</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">{sectionConfirm.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{sectionConfirm.message}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  if (sectionConfirm.onCancel) sectionConfirm.onCancel();
                  setSectionConfirm(null);
                }}
                className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  sectionConfirm.onConfirm();
                  setSectionConfirm(null);
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
}
