/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Firm, Transaction, Proposal } from "../types";
import { generateFirmStatementPDF } from "../utils/pdfGenerator";
import { 
  Building2, 
  Plus, 
  Search, 
  Trash2, 
  Phone, 
  User, 
  MapPin, 
  Tag, 
  FileText, 
  Printer, 
  Calendar, 
  Coins, 
  ArrowUpRight, 
  ArrowDownRight, 
  Check, 
  AlertCircle 
} from "lucide-react";

interface FirmSectionProps {
  firms: Firm[];
  transactions: Transaction[];
  proposals: Proposal[];
  onAddFirm: (firmData: Omit<Firm, "id" | "createdAt">) => Promise<boolean>;
  onDeleteFirm: (id: string) => Promise<{ success: boolean; error?: string }>;
  onAddTransaction: (txData: any) => Promise<boolean>;
}

export default function FirmSection({ 
  firms, 
  transactions, 
  proposals, 
  onAddFirm, 
  onDeleteFirm, 
  onAddTransaction 
}: FirmSectionProps) {
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [manager, setManager] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for visual warning/error feedback inside the card
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Deletion state
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);

  // Expanded View State: Selected firm for Ekstre (Account movements / Tahsilat)
  const [selectedFirmForEkstre, setSelectedFirmForEkstre] = useState<Firm | null>(null);

  // Tahsilat Form State inside the selected firm view
  const [colAmount, setColAmount] = useState("");
  const [colCurrency, setColCurrency] = useState("GBP");
  const [colRate, setColRate] = useState("");
  const [colMethod, setColMethod] = useState<"Havale" | "Nakit">("Havale");
  const [colDate, setColDate] = useState(new Date().toISOString().split("T")[0]);
  const [colCategory, setColCategory] = useState("Tahsilat");
  const [colNote, setColNote] = useState("");
  const [colSubmitting, setColSubmitting] = useState(false);
  const [colError, setColError] = useState("");
  const [colSuccess, setColSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name.trim() || !sector.trim() || !manager.trim() || !phone.trim()) {
      setErrorMsg("Lütfen zorunlu alanların tamamını doldurun.");
      return;
    }

    setIsSubmitting(true);
    const success = await onAddFirm({
      name: name.trim(),
      sector: sector.trim(),
      manager: manager.trim(),
      phone: phone.trim(),
      address: address.trim(),
    });
    setIsSubmitting(false);

    if (success) {
      setSuccessMsg("Firma başarıyla sisteme kayıt edildi!");
      setName("");
      setSector("");
      setManager("");
      setPhone("");
      setAddress("");
      setTimeout(() => setSuccessMsg(""), 3500);
    } else {
      setErrorMsg("Firma eklenirken bir hata oluştu. Sunucu bağlantısını veya token durumunu doğrulayın.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setDeleteErrorMsg(null);
    if (confirm(`"${name}" adlı firmayı silmek istediğinize emin misiniz?`)) {
      const result = await onDeleteFirm(id);
      if (!result.success) {
        setDeleteErrorMsg(result.error || "Firma silinemedi.");
        setTimeout(() => setDeleteErrorMsg(null), 5000);
      } else {
        if (selectedFirmForEkstre?.id === id) {
          setSelectedFirmForEkstre(null);
        }
      }
    }
  };

  const handleAddCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setColError("");
    setColSuccess("");

    if (!selectedFirmForEkstre) return;

    const numericAmount = parseFloat(colAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setColError("Lütfen sıfırdan büyük geçerli bir tutar yazın.");
      return;
    }

    // Exchange rate is optional but if TRY, we recommend it for transparency
    let numericRate = parseFloat(colRate);
    if (colCurrency === "TRY" && colRate && (isNaN(numericRate) || numericRate <= 0)) {
      setColError("Lütfen geçerli bir döviz kuru girin.");
      return;
    }

    setColSubmitting(true);
    try {
      let description = `${selectedFirmForEkstre.name} Tahsilat Girdisi`;
      let gbpEquivalent: number | undefined = undefined;

      if (colCurrency === "TRY" && numericRate > 0) {
        gbpEquivalent = Math.round((numericAmount / numericRate) * 100) / 100;
        description = `${selectedFirmForEkstre.name} Tahsilatı (${gbpEquivalent.toFixed(2)} GBP karşılığı ${colAmount} TRY - Kur: ${colRate})`;
      } else {
        description = `${selectedFirmForEkstre.name} Tahsilatı (Makbuz No: ${Date.now().toString().slice(-6)})`;
      }

      const payload = {
        date: colDate,
        type: "INCOME" as const, // Collection decreases firm liability, registers asIncome for company
        amount: numericAmount,
        currency: colCurrency,
        description: colNote.trim() ? `${description} - Not: ${colNote.trim()}` : description,
        category: colCategory,
        firmId: selectedFirmForEkstre.id,
        exchangeRate: colCurrency === "TRY" && numericRate > 0 ? numericRate : undefined,
        gbpEquivalent: gbpEquivalent,
        paymentMethod: colMethod
      };

      const success = await onAddTransaction(payload);
      if (success) {
        setColSuccess("Tahsilat başarıyla kaydedildi ve ortak kasaya/cari hesaba işlendi.");
        setColAmount("");
        setColRate("");
        setColNote("");
        setTimeout(() => setColSuccess(""), 4000);
      } else {
        setColError("Tahsilat sisteme işlenirken bir hata oluştu.");
      }
    } catch (err: any) {
      setColError(err.message || "Tahsilat işleminde beklenmedik bir hata oluştu.");
    } finally {
      setColSubmitting(false);
    }
  };

  const filteredFirms = firms.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.manager.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6" id="firm-section-wrapper">
      
      {/* Upper Grid: Firm Register Form & Firm List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="firm-section">
        {/* Add Firm Form Card */}
        <div 
          id="firm-add-form-card"
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs h-fit"
        >
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Yeni Firma Kaydı</h2>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-100 font-medium animate-fade-in">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-100 font-medium animate-fade-in">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" id="firm-registration-form">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">FİRMA ADI *</label>
              <input
                type="text"
                placeholder="Örn: Esas Mimarlık Ofisi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">SEKTÖR *</label>
                <input
                  type="text"
                  placeholder="Örn: Mimarlık & Tasarım"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">YETKİLİ KİŞİ *</label>
                <input
                  type="text"
                  placeholder="Örn: Ahmet Üçer"
                  value={manager}
                  onChange={(e) => setManager(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">İLETİŞİM TELEFONU *</label>
              <input
                type="tel"
                placeholder="Örn: 0532 111 22 33"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">FİRMA ADRESİ</label>
              <textarea
                placeholder="Maslak, Şişli / İstanbul"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 font-medium resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              id="register-firm-btn"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-colors shadow-xs disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? "Kaydediliyor..." : "Firmayı Kaydet"}
            </button>
          </form>
        </div>

        {/* Firm List Screen Card */}
        <div 
          id="firm-list-card"
          className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">İş Ortağı Firmalar ({firms.length})</h2>
              <p className="text-xs text-slate-400">Kayıtlı firmaların detayları, koordinatörleri ve cari hareketleri</p>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Firma ara (Ad, Sektör)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 w-full sm:w-64 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-700 font-medium"
              />
            </div>
          </div>

          {deleteErrorMsg && (
            <div className="mb-4 p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200 font-medium">
              🚩 {deleteErrorMsg}
            </div>
          )}

          {filteredFirms.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-100 rounded-2xl">
              <Building2 className="w-12 h-12 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-500">Kayıtlı Firma Bulunamadı</p>
              <p className="text-xs text-slate-400 mt-1">Arama kriterini değiştirebilir veya soldan yeni bir firma ekleyebilirsiniz.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[480px] overflow-y-auto pr-1">
              {filteredFirms.map((firm) => {
                const isSelected = selectedFirmForEkstre?.id === firm.id;
                
                return (
                  <div
                    key={firm.id}
                    id={`firm-card-${firm.id}`}
                    className={`p-4 rounded-xl border transition-all relative flex flex-col justify-between group bg-slate-50/50 ${
                      isSelected 
                        ? "border-indigo-500 ring-2 ring-indigo-505/20 bg-indigo-50/20" 
                        : "border-slate-100 hover:border-slate-200 hover:shadow-xs"
                    }`}
                  >
                    {/* Delete button wrapper */}
                    <button
                      type="button"
                      id={`delete-firm-btn-${firm.id}`}
                      onClick={() => handleDelete(firm.id, firm.name)}
                      className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Firmayı Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="pr-6">
                      <h3 className="font-bold text-slate-800 text-sm leading-tight flex items-center gap-1.5 mb-1.5">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {firm.name}
                      </h3>
                      
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md mb-3">
                        <Tag className="w-2.5 h-2.5" />
                        {firm.sector}
                      </span>

                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-700">{firm.manager}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{firm.phone}</span>
                        </div>
                        {firm.address && (
                          <div className="flex items-start gap-1.5 mt-1 pt-1 border-t border-slate-100">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 leading-relaxed text-slate-500">{firm.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick navigation to Statement Section */}
                    <div className="mt-4 pt-3 border-t border-slate-100/65 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFirmForEkstre(firm);
                          // Scroll down to the statement node smoothly
                          setTimeout(() => {
                            document.getElementById("firm-statement-anchor")?.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        }}
                        className="w-full py-2 px-3 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-indigo-600 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Cari Ekstre & Tahsilat Girişi
                      </button>

                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium">
                        <span>ID: {firm.id}</span>
                        <span>Kayıt: {new Date(firm.createdAt).toLocaleDateString("tr-TR")}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Expandable Module: FIRM STATEMENT (CARI RAPOR) & TAHSILAT MASASI */}
      {selectedFirmForEkstre && (() => {
        const firm = selectedFirmForEkstre;
        
        // Filter transactions relative to this firm
        const firmTxs = transactions.filter(t => t.firmId === firm.id);
        
        // Debits / What we charge (Anything that is not a payment collection)
        const debits = firmTxs.filter(t => t.category !== "Tahsilat" && t.category !== "Hakediş Tahsilatı");
        // Credits / What they pay (Payment collections)
        const credits = firmTxs.filter(t => t.category === "Tahsilat" || t.category === "Hakediş Tahsilatı");

        // Separate balances by currency (raw sums for total headers)
        const gbpDebitsSum = debits.filter(t => t.currency === "GBP").reduce((sum, t) => sum + t.amount, 0);
        const gbpCreditsSum = credits.filter(c => c.currency === "GBP").reduce((sum, c) => sum + c.amount, 0);

        const tryDebitsSum = debits.filter(t => t.currency === "TRY").reduce((sum, t) => sum + t.amount, 0);
        const tryCreditsSum = credits.filter(c => c.currency === "TRY").reduce((sum, c) => sum + c.amount, 0);

        // Core conversion helper to compute exact impact on the GBP ledger (rounded to 2 decimal places)
        const getTxGbpEquivalent = (t: Transaction) => {
          if (t.currency === "GBP") return t.amount;
          if (t.currency === "TRY") {
            const rate = t.exchangeRate || 43.15;
            return Math.round((t.amount / rate) * 100) / 100;
          }
          return t.amount;
        };

        const totalGbpDebits = debits.reduce((sum, t) => sum + getTxGbpEquivalent(t), 0);
        const totalGbpCredits = credits.reduce((sum, t) => sum + getTxGbpEquivalent(t), 0);
        const unifiedGbpNet = totalGbpDebits - totalGbpCredits;

        // Auto-compute TRY to GBP if rate selected
        const exchangeRatePrompt = colCurrency === "TRY" && colRate && !isNaN(parseFloat(colRate))
          ? `(${ (parseFloat(colAmount) / parseFloat(colRate)).toFixed(2) } GBP karşılık düşmektedir.)`
          : "";

        return (
          <div 
            id="firm-statement-anchor"
            className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-md space-y-6 animate-fade-in"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 tracking-tight text-base">Cari Hesap Ekstre Masası</h3>
                  <p className="text-xs text-slate-400">
                    <strong>{firm.name}</strong> firmasının hesap özeti, borç/alacak hareketleri ve tahsilat makbuzları listesi
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => generateFirmStatementPDF(firm, transactions, proposals)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                  title="Ekstreyi MUSTAFA MİMARLIK OFİS antetli PDF olarak indirir."
                >
                  <Printer className="w-4 h-4" />
                  Makbuz & Cari Ekstre İndir (PDF)
                </button>

                <button
                  onClick={() => setSelectedFirmForEkstre(null)}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Masayı Kapat
                </button>
              </div>
            </div>

            {/* Balances Banners Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Debit total cards */}
              <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">TOPLAM BORÇLANDIRMA (BORE/DEBITS)</span>
                  <p className="text-xs text-slate-400 mt-0.5">Firmaya kesilen teklif / hakediş fatura toplamları</p>
                </div>
                <div className="mt-4 space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>GBP (£):</span>
                    <span className="font-mono font-bold text-slate-900">£{gbpDebitsSum.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>TRY (₺):</span>
                    <span className="font-mono font-bold text-slate-900">₺{tryDebitsSum.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Credit total cards */}
              <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">TOPLAM TAHSİLAT (ALACAK/CREDITS)</span>
                  <p className="text-xs text-slate-400 mt-0.5">Firmadan gelen ödeme transferleri (Kasa / Banka)</p>
                </div>
                <div className="mt-4 space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>GBP (£):</span>
                    <span className="font-mono font-bold text-slate-900">£{gbpCreditsSum.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>TRY (₺):</span>
                    <span className="font-mono font-bold text-slate-900">₺{tryCreditsSum.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Outstanding Net Balance */}
              <div className="bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100 flex flex-col justify-between ring-1 ring-indigo-500/5">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">NET HAKEDİŞ CARİ BAKİYE</span>
                  <p className="text-xs text-slate-400 mt-0.5">Firma tarafından ödenmesi beklenen bakiye tutarları</p>
                </div>
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Güncel Net Cari Bakiye (GBP):</span>
                    <span className={`font-mono font-black text-sm ${unifiedGbpNet > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      £{unifiedGbpNet.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {unifiedGbpNet >= 0 ? " (Firma Borçlu)" : " (Özde Fazla Alınan)"}
                    </span>
                  </div>
                  {tryCreditsSum > 0 && (
                    <div className="text-[10px] text-indigo-700/80 leading-relaxed font-semibold bg-indigo-50/80 p-2.5 rounded-xl border border-indigo-100/40 mt-1">
                      💡 ₺{tryCreditsSum.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TRY tahsilat tutarı o günkü kurdan GBP karşılığına çevrilerek (£{credits.filter(c => c.currency === "TRY").reduce((sum, c) => sum + getTxGbpEquivalent(c), 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP) ana borçtan düşülmüştür.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Lower Region: New Collection input & Statements Ledger Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

              {/* Left Column Form: Tahsilat / Collection desk */}
              <div className="p-5 bg-slate-50/70 rounded-2xl border border-slate-100 h-fit">
                <div className="flex items-center gap-2 mb-4">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-slate-800 text-xs">Yeni Tahsilat Girişi (Ortak Kasa)</h4>
                </div>

                {colError && (
                  <div className="mb-3 p-2.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl font-medium">
                    🚩 {colError}
                  </div>
                )}

                {colSuccess && (
                  <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl font-medium">
                    🎉 {colSuccess}
                  </div>
                )}

                <form onSubmit={handleAddCollectionSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">TAHSİLAT TUTARI *</label>
                      <input
                        type="number"
                        placeholder="Örn: 2500"
                        step="0.01"
                        value={colAmount}
                        onChange={(e) => setColAmount(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">DÖVİZ BAZI *</label>
                      <select
                        value={colCurrency}
                        onChange={(e) => {
                          setColCurrency(e.target.value);
                          if (e.target.value === "GBP") {
                            setColRate("");
                          }
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-extrabold text-slate-700"
                        required
                      >
                        <option value="GBP">GBP (£)</option>
                        <option value="TRY">TRY (₺)</option>
                      </select>
                    </div>
                  </div>

                  {/* exchangeRate only if Currency is TRY */}
                  {colCurrency === "TRY" && (
                    <div className="animate-fade-in">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        DÖVİZ KURU DETAYI (İşlem Günü Kuru) *
                      </label>
                      <input
                        type="number"
                        placeholder="Örn: 43.15"
                        step="0.0001"
                        value={colRate}
                        onChange={(e) => setColRate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-800"
                        required
                      />
                      {exchangeRatePrompt && (
                        <span className="text-[10px] text-indigo-600 block mt-1 font-medium">{exchangeRatePrompt}</span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">ÖDEME METODU *</label>
                      <select
                        value={colMethod}
                        onChange={(e) => setColMethod(e.target.value as any)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                        required
                      >
                        <option value="Havale">Havale (Banka)</option>
                        <option value="Nakit">Nakit (Kasa)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">İŞLEM TARİHİ *</label>
                      <input
                        type="date"
                        value={colDate}
                        onChange={(e) => setColDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">AÇIKLAMA NOTU</label>
                    <textarea
                      placeholder="Örn: Hak ediş dekont numarası 448373..."
                      rows={2}
                      value={colNote}
                      onChange={(e) => setColNote(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={colSubmitting}
                    className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs disabled:bg-emerald-300 cursor-pointer"
                  >
                    {colSubmitting ? "Kaydediliyor..." : "Tahsilatı Kaydet ve Kasaya İşle"}
                  </button>
                </form>
              </div>

              {/* Right Column List: Statement account movements list */}
              <div id="statement-table-view" className="xl:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs">Hesap Hareketi Detayı ({firmTxs.length})</h4>
                  <span className="text-[10px] text-slate-400 font-medium">Bütün borç, alacak ve bakiye dökümleri</span>
                </div>

                {firmTxs.length === 0 ? (
                  <div className="p-12 border-2 border-dashed border-slate-100 rounded-2xl text-center bg-slate-50/20">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-500">Hesap Hareketi Bulunmıyor</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Bu firmaya ait kabul edilmiş bir maket teklifi veya yapılan tahsilat/ödeme bulunmuyor.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-[11px] text-left border-collapse bg-white table-fixed">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-400 font-bold border-b border-slate-100">
                          <th className="py-2.5 px-3 w-[15%] min-w-[75px]">TARIH</th>
                          <th className="py-2.5 px-3 w-[20%] min-w-[100px]">HESAP TÜRÜ</th>
                          <th className="py-2.5 px-3 w-[45%]">KATEGORİ / AÇIKLAMA</th>
                          <th className="py-2.5 px-3 text-right w-[12%] min-w-[90px]">TUTAR</th>
                          <th className="py-2.5 px-3 w-[8%] min-w-[65px] pl-4">METOD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {firmTxs.map((tx) => {
                          const isCollection = tx.category === "Tahsilat" || tx.category === "Hakediş Tahsilatı";
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                                {new Date(tx.date).toLocaleDateString("tr-TR")}
                              </td>
                              <td className="py-3 px-3">
                                {isCollection ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                    <ArrowDownRight className="w-3 h-3" />
                                    ALACAK
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                                    <ArrowUpRight className="w-3 h-3" />
                                    BORÇ
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 leading-relaxed break-words whitespace-normal text-slate-800">
                                <div className="font-semibold text-slate-800 break-words line-clamp-4 hover:line-clamp-none transition-all">{tx.description}</div>
                                <span className="inline-block text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-sm mt-0.5">
                                  {tx.category}
                                </span>
                              </td>
                              <td className={`py-3 px-3 text-right font-mono font-bold text-xs whitespace-nowrap ${
                                isCollection ? "text-emerald-600" : "text-slate-800"
                              }`}>
                                {tx.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {tx.currency === "GBP" ? "£" : "₺"}
                              </td>
                              <td className="py-3 px-3 pl-4 font-semibold text-slate-500 uppercase whitespace-nowrap">
                                {tx.paymentMethod || "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
