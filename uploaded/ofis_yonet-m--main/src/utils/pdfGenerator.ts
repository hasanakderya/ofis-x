/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Elegant dynamic Turkish font registration and document generation system.
 * Employs a dual-mode fallback:
 *   1. Normal: Fetches & caches lightweight UTF-8 compliant Roboto Font from CDNJS.
 *   2. Fallback: Automatically transliterates Turkish characters if font download fails or is offline.
 */

import { jsPDF } from "jspdf";
import { Firm, Proposal, Transaction } from "../types";

// Standard reliable Roboto fonts from pdfmake CDN
const ROBOTO_REGULAR_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf";
const ROBOTO_BOLD_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf";

let cachedRegularBase64: string | null = null;
let cachedBoldBase64: string | null = null;

/**
 * Transliterates Turkish characters to standard Latin equivalents in fallback mode.
 */
function cleanTurkishChars(text: string): string {
  if (typeof text !== "string") return "";
  const map: Record<string, string> = {
    'ş': 's', 'Ş': 'S',
    'ı': 'i', 'İ': 'I',
    'ğ': 'g', 'Ğ': 'G',
    'ü': 'u', 'Ü': 'U',
    'ö': 'o', 'Ö': 'O',
    'ç': 'c', 'Ç': 'C'
  };
  return text.replace(/[şŞıİğĞüÜöÖçÇ]/g, (match) => map[match] || match);
}

/**
 * Prepares the font system for jsPDF.
 * Fetches and registers TrueType UTF-8 Roboto fonts.
 * Caches base64 data to keep subsequent generations instantaneous.
 */
async function setupTurkishFonts(doc: jsPDF): Promise<boolean> {
  try {
    if (!cachedRegularBase64 || !cachedBoldBase64) {
      const [regRes, boldRes] = await Promise.all([
        fetch(ROBOTO_REGULAR_URL),
        fetch(ROBOTO_BOLD_URL)
      ]);

      if (!regRes.ok || !boldRes.ok) {
        throw new Error("CDN fonts not available.");
      }

      const [regBuffer, boldBuffer] = await Promise.all([
        regRes.arrayBuffer(),
        boldRes.arrayBuffer()
      ]);

      const regBytes = new Uint8Array(regBuffer);
      let regBinary = "";
      for (let i = 0; i < regBytes.byteLength; i++) {
        regBinary += String.fromCharCode(regBytes[i]);
      }
      cachedRegularBase64 = btoa(regBinary);

      const boldBytes = new Uint8Array(boldBuffer);
      let boldBinary = "";
      for (let i = 0; i < boldBytes.byteLength; i++) {
        boldBinary += String.fromCharCode(boldBytes[i]);
      }
      cachedBoldBase64 = btoa(boldBinary);
    }

    doc.addFileToVFS("Roboto-Regular.ttf", cachedRegularBase64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    
    doc.addFileToVFS("Roboto-Bold.ttf", cachedBoldBase64);
    doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");

    return true;
  } catch (err) {
    console.warn("Turkish UTF-8 Roboto fonts could not be loaded dynamically. Using clean transliteration fallback.", err);
    return false;
  }
}

/**
 * Generates an elegant brand proposal PDF with complete UTF-8 Turkish character accuracy.
 */
export async function generateProposalPDF(proposal: Proposal, firm: Firm) {
  const doc = new jsPDF();
  const hasTurkishFont = await setupTurkishFonts(doc);

  const fontName = hasTurkishFont ? "Roboto" : "helvetica";
  const pText = (val: string) => hasTurkishFont ? val : cleanTurkishChars(val);

  // Set fonts and layout
  doc.setFont(fontName, "bold");
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(pText("MUSTAFA MİMARLIK OFİSİ"), 105, 20, { align: "center" });
  
  doc.setDrawColor(99, 102, 241); // Indigo color line
  doc.setLineWidth(1.5);
  doc.line(15, 25, 195, 25);
  
  // Header text info
  doc.setFontSize(10);
  doc.setTextColor(115, 115, 140); 
  doc.setFont(fontName, "normal");
  doc.text(pText(`Tarih: ${new Date(proposal.date).toLocaleDateString("tr-TR")}`), 195, 32, { align: "right" });
  doc.text(pText(`Teklif Referans No: ${proposal.id}`), 15, 32);
  
  // Details boxes
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.5);
  doc.setFillColor(250, 250, 250);
  doc.rect(15, 38, 180, 42, "FD"); // container for firm info
  
  doc.setFont(fontName, "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(pText("MÜŞTERİ / FİRMA BİLGİLERİ"), 20, 44);
  
  doc.setFont(fontName, "normal");
  doc.text(pText(`Firma Adı: ${firm.name}`), 20, 52);
  doc.text(pText(`Sektör / İş Kolu: ${firm.sector}`), 20, 58);
  doc.text(pText(`Yetkili Kişi: ${firm.manager}`), 20, 64);
  doc.text(pText(`Telefon: ${firm.phone}`), 20, 70);
  doc.text(pText(`Adres: ${firm.address || "Belirtilmemiş"}`), 20, 76);
  
  // Proposal details box
  doc.rect(15, 88, 180, 50);
  doc.setFont(fontName, "bold");
  doc.text(pText("MAKET TEKLİF DETAYLARI"), 20, 94);
  
  doc.setFont(fontName, "normal");
  doc.text(pText(`Teklif Başlığı:`), 20, 102);
  doc.setFont(fontName, "bold");
  doc.text(pText(`${proposal.title}`), 55, 102);
  
  doc.setFont(fontName, "normal");
  doc.text(pText(`Teklif Tutarı:`), 20, 110);
  doc.setFont(fontName, "bold");
  doc.setTextColor(79, 70, 229); // Indigo
  doc.text(`${proposal.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ${proposal.currency}`, 55, 110);
  
  doc.setFont(fontName, "normal");
  doc.setTextColor(30, 41, 59);
  doc.text(pText(`Teklif Tarihi:`), 20, 118);
  doc.text(`${new Date(proposal.date).toLocaleDateString("tr-TR")}`, 55, 118);
  
  doc.text(pText(`Mevcut Durum:`), 20, 126);
  if (proposal.status === "Kabul Edildi") {
    doc.setTextColor(16, 185, 129); // emerald green
  } else if (proposal.status === "Reddedildi") {
    doc.setTextColor(239, 68, 68); // red
  } else {
    doc.setTextColor(245, 158, 11); // amber
  }
  doc.setFont(fontName, "bold");
  doc.text(pText(`${proposal.status.toUpperCase()}`), 55, 126);
  
  // Reset text color
  doc.setTextColor(30, 41, 59);
  doc.setFont(fontName, "normal");
  
  // Notes
  if (proposal.notes) {
    doc.rect(15, 146, 180, 40);
    doc.setFont(fontName, "bold");
    doc.text(pText("İLAVE NOTLAR & AÇIKLAMALAR"), 20, 152);
    doc.setFont(fontName, "normal");
    const splitNotes = doc.splitTextToSize(pText(proposal.notes), 170);
    doc.text(splitNotes, 20, 160);
  }
  
  // Footer decoration
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(pText("Bu belge sanal makine hakediş, maket ve takip sistemi üzerinden üretilmiştir."), 105, 280, { align: "center" });
  doc.text(pText("MUSTAFA MİMARLIK OFİSİ © 2026 - İSTANBUL"), 105, 285, { align: "center" });
  
  doc.save(`teklif-${proposal.id}.pdf`);
}

/**
 * Generates an extensive company statement PDF containing all accounts & records.
 */
export async function generateFirmStatementPDF(firm: Firm, transactions: Transaction[], proposals: Proposal[]) {
  const doc = new jsPDF();
  const hasTurkishFont = await setupTurkishFonts(doc);

  const fontName = hasTurkishFont ? "Roboto" : "helvetica";
  const pText = (val: string) => hasTurkishFont ? val : cleanTurkishChars(val);

  doc.setFont(fontName, "bold");
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59);
  doc.text(pText("MUSTAFA MİMARLIK OFİSİ"), 105, 20, { align: "center" });
  
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(1.5);
  doc.line(15, 25, 195, 25);
  
  // Text content
  doc.setFontSize(10);
  doc.setTextColor(115, 115, 140);
  doc.setFont(fontName, "normal");
  doc.text(pText(`Rapor Tarihi: ${new Date().toLocaleDateString("tr-TR")}`), 195, 32, { align: "right" });
  doc.text(pText("MÜŞTERİ CARİ HESAP EKSTRESİ (CARI EKSTRE)"), 15, 32);
  
  // Firm details
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.setFillColor(250, 250, 250);
  doc.rect(15, 38, 180, 36, "FD");
  
  doc.setFont(fontName, "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(pText(`FİRMA: ${firm.name}`), 20, 44);
  doc.setFont(fontName, "normal");
  doc.text(pText(`Yetkili Yönetici: ${firm.manager} | İletişim: ${firm.phone}`), 20, 51);
  doc.text(pText(`Sektör / İş Kolu: ${firm.sector}`), 20, 57);
  doc.text(pText(`Adres: ${firm.address || "Belirtilmemiş"}`), 20, 63);
  
  // Financial Summary logic
  const firmTxs = transactions.filter(t => t.firmId === firm.id);
  // Debits / What we charge (Anything that is not a payment collection)
  const debits = firmTxs.filter(t => t.category !== "Tahsilat" && t.category !== "Hakediş Tahsilatı");
  // Credits / What they pay (Payment collections)
  const credits = firmTxs.filter(t => t.category === "Tahsilat" || t.category === "Hakediş Tahsilatı");
  
  const gbpDebitsSum = debits.filter(d => d.currency === "GBP").reduce((sum, d) => sum + d.amount, 0);
  const tryDebitsSum = debits.filter(d => d.currency === "TRY").reduce((sum, d) => sum + d.amount, 0);
  const gbpCreditsSum = credits.filter(c => c.currency === "GBP").reduce((sum, c) => sum + c.amount, 0);
  const tryCreditsSum = credits.filter(c => c.currency === "TRY").reduce((sum, c) => sum + c.amount, 0);

  // Conversion helper for consistent GBP ledger calculations (rounded to 2 decimal places)
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

  doc.rect(15, 80, 180, 36);
  doc.setFont(fontName, "bold");
  doc.text(pText("MALİ BAKİYE VE HAKEDİŞ DURUMU ÖZETİ"), 20, 86);
  
  doc.setFont(fontName, "normal");
  doc.text(pText("Toplam Borçlandırma (Maket & İş Bedelleri):"), 20, 93);
  doc.setFont(fontName, "bold");
  doc.text(`GBP £${gbpDebitsSum.toLocaleString("tr-TR")} / TRY ₺${tryDebitsSum.toLocaleString("tr-TR")}`, 115, 93);
  
  doc.setFont(fontName, "normal");
  doc.text(pText("Toplam Yapılan Tahsilat (Collected / Credits):"), 20, 99);
  doc.setFont(fontName, "bold");
  doc.text(`GBP £${gbpCreditsSum.toLocaleString("tr-TR")} / TRY ₺${tryCreditsSum.toLocaleString("tr-TR")}`, 115, 99);
  
  doc.setFont(fontName, "normal");
  doc.text(pText("Güncel Net Cari Bakiye (Outstanding Balance):"), 20, 106);
  doc.setFont(fontName, "bold");
  
  doc.setTextColor(unifiedGbpNet > 0 ? 239 : 16, unifiedGbpNet > 0 ? 68 : 185, unifiedGbpNet > 0 ? 68 : 129);
  doc.text(`£${unifiedGbpNet.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP`, 115, 106);
  
  if (tryCreditsSum > 0) {
    doc.setFont(fontName, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(99, 102, 241);
    doc.text(pText(`* Toplam ₺${tryCreditsSum.toLocaleString("tr-TR")} TRY tahsilatı kurdan GBP karşılığına çevrilip (£${credits.filter(c => c.currency === "TRY").reduce((sum, c) => sum + getTxGbpEquivalent(c), 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP) ana borçtan düşülmüştür.`), 20, 112);
  }

  // Reset Colors
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont(fontName, "bold");
  doc.text(pText("CARİ HESAP EKSTRE HAREKETLERİ DETAYI"), 15, 122);
  
  // Draw table header
  doc.setLineWidth(0.3);
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 126, 180, 8, "F");
  doc.setFont(fontName, "bold");
  doc.setFontSize(8);
  doc.text(pText("TARİH"), 18, 131);
  doc.text(pText("TÜR"), 37, 131);
  doc.text(pText("KATEGORİ / PROJE DETAYI"), 65, 131);
  doc.text(pText("TUTAR"), 145, 131, { align: "right" });
  doc.text(pText("BAZ"), 152, 131);
  doc.text(pText("ORAN / KUR"), 163, 131);
  doc.text(pText("METOT"), 182, 131);
  
  doc.setFont(fontName, "normal");
  let y = 139;
  
  if (firmTxs.length === 0) {
    doc.text(pText("Kayıtlı hesap ekstresi veya para hareketi bulunmamaktadır."), 20, y);
  } else {
    firmTxs.forEach((tx) => {
      if (y > 260) {
        doc.addPage();
        y = 30;
        
        // table header inside new page
        doc.setFillColor(241, 245, 249);
        doc.rect(15, 15, 180, 8, "F");
        doc.setFont(fontName, "bold");
        doc.text(pText("TARİH"), 18, 20);
        doc.text(pText("TÜR"), 37, 20);
        doc.text(pText("KATEGORİ / PROJE DETAYI"), 65, 20);
        doc.text(pText("TUTAR"), 145, 20, { align: "right" });
        doc.text(pText("BAZ"), 152, 20);
        doc.text(pText("ORAN / KUR"), 163, 20);
        doc.text(pText("METOT"), 182, 20);
        doc.setFont(fontName, "normal");
        y = 28;
      }
      
      const isCollection = tx.category === "Tahsilat" || tx.category === "Hakediş Tahsilatı";
      doc.text(tx.date, 18, y);
      doc.setFont(fontName, "bold");
      doc.setTextColor(isCollection ? 16 : 239, isCollection ? 185 : 68, isCollection ? 129 : 68);
      doc.text(isCollection ? pText("ALACAK") : pText("BORÇ"), 37, y);
      doc.setTextColor(30, 41, 59);
      doc.setFont(fontName, "normal");
      
      let desc = tx.description;
      let rateCol = "-";
      if (tx.currency === "TRY" && tx.exchangeRate) {
        const eqGbp = Math.round((tx.amount / tx.exchangeRate) * 100) / 100;
        desc += ` (${eqGbp.toFixed(2)} GBP Kar.)`;
        rateCol = `Kur: ${tx.exchangeRate.toFixed(2)}`;
      }
      const splitDesc = doc.splitTextToSize(pText(desc), 60);
      doc.text(splitDesc, 65, y);
      
      doc.text(`${tx.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`, 145, y, { align: "right" });
      doc.text(tx.currency, 152, y);
      doc.text(rateCol, 163, y);
      doc.text(tx.paymentMethod ? pText(tx.paymentMethod.toUpperCase()) : "-", 182, y);
      
      const numLines = splitDesc.length;
      y += (numLines * 4.5) + 3;
    });
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(pText("Bu evrak resmi muhasebe belgesi olmayıp internal takip carisi işlevindedir."), 105, 280, { align: "center" });
  doc.text(pText("MUSTAFA MİMARLIK OFİSİ © 2026 - RAPORLAMA SERVİSİ"), 105, 285, { align: "center" });
  
  doc.save(`cari-ekstre-${firm.name}.pdf`);
}

/**
 * Generates an elegant and mathematically precise Partnership Account Settlement Statement
 * with full Turkish character encoding support.
 */
export async function generatePartnershipStatementPDF(monthName: string, calc: any) {
  const doc = new jsPDF();
  const hasTurkishFont = await setupTurkishFonts(doc);

  const fontName = hasTurkishFont ? "Roboto" : "helvetica";
  const pText = (val: string) => hasTurkishFont ? val : cleanTurkishChars(val);

  const monthLabel = monthName === "ALL" ? "Tüm Dönemler" : `${monthName} Dönemi`;

  // Main Header
  doc.setFont(fontName, "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(pText("MUSTAFA MİMARLIK OFİSİ"), 105, 18, { align: "center" });
  
  doc.setFontSize(11);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text(pText("ORTAKLAR HESAP KESİM CETVELİ & KÂR DAĞITIM RAPORU"), 105, 25, { align: "center" });

  doc.setDrawColor(79, 70, 229); // Indigo divider line
  doc.setLineWidth(1.5);
  doc.line(15, 29, 195, 29);

  // Period / Date Info
  doc.setFontSize(9);
  doc.setTextColor(115, 115, 140);
  doc.setFont(fontName, "normal");
  doc.text(pText(`Rapor Dönemi: ${monthLabel}`), 15, 36);
  doc.text(pText(`Yazdırılma Tarihi: ${new Date().toLocaleDateString("tr-TR")} ${new Date().toLocaleTimeString("tr-TR").slice(0, 5)}`), 195, 36, { align: "right" });

  // 1. Core Operating Ledger Summary Table
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.rect(15, 42, 180, 50, "F");
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.rect(15, 42, 180, 50, "S");

  doc.setFont(fontName, "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(pText("I. GENEL OPERASYONEL GELİR & GİDER ÖZETİ"), 20, 49);

  doc.setFont(fontName, "normal");
  doc.setFontSize(9);
  doc.text(pText("Toplam Ofis Gelirleri (Hakediş & Kasa Girişleri):"), 20, 57);
  doc.text(pText("Toplam Ortak Ofis Altyapı ve Personel Giderleri:"), 20, 64);
  doc.text(pText("Net Dağıtılabilir Ortak Operasyon Kârı:"), 20, 71);
  doc.text(pText("Ortağın Baseline Pay Oranı (%50.00 each):"), 20, 78);
  doc.text(pText("Ortak Başına Düşen Net Hak Ediş Tutarı:"), 20, 85);

  // Values in bold aligned right
  doc.setFont(fontName, "bold");
  doc.text(`£${(calc.activeRevenue + calc.prevNetProfit).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP`, 190, 57, { align: "right" });
  doc.text(`£${(calc.activeOperatingExpenses + (calc.prevNetProfit - calc.prevHasanBalance - calc.prevMustafaBalance - calc.prevHasanWithdrawals - calc.prevMustafaWithdrawals)).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP`, 190, 64, { align: "right" });
  
  doc.setTextColor(16, 185, 129); // Success color
  doc.text(`£${calc.cumulativeNetProfit.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP`, 190, 71, { align: "right" });
  
  doc.setTextColor(30, 41, 59);
  doc.text("% 50.00", 190, 78, { align: "right" });
  doc.text(`£${calc.cumulativeShare.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP`, 190, 85, { align: "right" });

  // 2. Individual withdrawals & balances Table
  doc.setFillColor(255, 255, 255);
  doc.rect(15, 98, 180, 52, "FD");
  
  doc.setFont(fontName, "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(pText("II. ORTAKLAR HESAP HAREKETLERİ & MUTABAKATI"), 20, 105);

  doc.setFontSize(9);
  doc.text(pText("ORTAK ADI"), 22, 113);
  doc.text(pText("BASELINE HAK EDİŞ"), 65, 113);
  doc.text(pText("ŞAHSİ NAKİT ÇEKİM"), 118, 113);
  doc.text(pText("KALAN BAKİYE (ALACAK)"), 158, 113);

  doc.setLineWidth(0.5);
  doc.setDrawColor(203, 213, 225);
  doc.line(15, 116, 195, 116);

  // HASAN
  doc.setFont(fontName, "bold");
  doc.text(pText("Hasan (Ortak)"), 22, 124);
  doc.setFont(fontName, "normal");
  doc.text(`£${calc.cumulativeShare.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 65, 124);
  doc.text(`£${calc.totalHasanWithdrawals.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 118, 124);
  
  const hBal = calc.hasanBalance;
  doc.setFont(fontName, "bold");
  doc.setTextColor(hBal >= 0 ? 16 : 239, hBal >= 0 ? 185 : 68, hBal >= 0 ? 129 : 68);
  doc.text(`£${hBal.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 158, 124);

  // MUSTAFA
  doc.setTextColor(30, 41, 59);
  doc.text(pText("Mustafa (Ortak)"), 22, 134);
  doc.setFont(fontName, "normal");
  doc.text(`£${calc.cumulativeShare.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 65, 134);
  doc.text(`£${calc.totalMustafaWithdrawals.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 118, 134);
  
  const mBal = calc.mustafaBalance;
  doc.setFont(fontName, "bold");
  doc.setTextColor(mBal >= 0 ? 16 : 239, mBal >= 0 ? 185 : 68, mBal >= 0 ? 129 : 68);
  doc.text(`£${mBal.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 158, 134);

  // Underline
  doc.line(15, 138, 195, 138);

  // Month Carryover block
  if (monthName !== "ALL") {
    doc.setFont(fontName, "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(pText(`* Bu hesaplamaya önceki aylardan Hasan için £${calc.prevHasanBalance.toLocaleString("tr-TR", {minimumFractionDigits:2})} ve Mustafa için £${calc.prevMustafaBalance.toLocaleString("tr-TR", {minimumFractionDigits:2})} devreden bakiyeler dahildir.`), 22, 144);
  }

  // 3. Debt tracking box (Core highlight!)
  doc.setFillColor(239, 246, 255); // Blue-50
  doc.setDrawColor(191, 219, 254); // Blue-200
  doc.rect(15, 158, 180, 24, "FD");

  doc.setFont(fontName, "bold");
  doc.setFontSize(10);
  doc.setTextColor(29, 78, 216); // Blue-700
  doc.text(pText("III. MUTABIK KALINAN NET ALACAK/BORÇ ORTAK ÇIKTISI"), 20, 164);

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(pText(calc.debtMessage), 20, 173);

  // Signatures section
  doc.setFontSize(9);
  doc.setFont(fontName, "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("İmza: Hasan", 40, 215, { align: "center" });
  doc.text("İmza: Mustafa", 150, 215, { align: "center" });
  
  doc.setFont(fontName, "normal");
  doc.setFontSize(8);
  doc.text("Kurucu Ortak", 40, 221, { align: "center" });
  doc.text("Kurucu Ortak", 150, 221, { align: "center" });

  doc.setDrawColor(203, 213, 225);
  doc.line(20, 235, 60, 235);
  doc.line(130, 235, 170, 235);

  // PDF standard metadata
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(pText("Bu evrak ortaklar arası mutabakat doğrultusunda hazırlanmış resmi hesap kesim bakiye bildirisidir."), 105, 275, { align: "center" });
  doc.text(pText("MUSTAFA MİMARLIK OFİSİ © 2026 - RAPORLAMA SERVİSİ"), 105, 281, { align: "center" });

  doc.save(`ortaklar-hesap-kesim-${monthName}.pdf`);
}
