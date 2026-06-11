/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Firm, 
  Personnel, 
  WorkRecord, 
  Transaction,
  Proposal
} from "./types";
import { 
  Wallet, 
  Handshake, 
  Users, 
  Clock, 
  BarChart3, 
  Settings, 
  Building2, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Play, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  Download, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  Calendar, 
  Check, 
  MapPin, 
  User, 
  Phone,
  FileSpreadsheet,
  FileText,
  Printer,
  FileDown,
  Pencil,
  Wifi,
  WifiOff,
  ChevronDown
} from "lucide-react";

import StatsGrid from "./components/StatsGrid";
import FirmSection from "./components/FirmSection";
import PersonnelSection from "./components/PersonnelSection";
import { OfficeReports } from "./components/OfficeReports";
import { 
  calculateAndFormatDuration, 
  formatTurkishDateTime, 
  getLocalISOStringForInput 
} from "./utils/dateHelpers";
import { 
  generateProposalPDF, 
  generateFirmStatementPDF, 
  generatePartnershipStatementPDF 
} from "./utils/pdfGenerator";

export default function App() {
  // Global States
  const [firms, setFirms] = useState<Firm[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [personnelGiderleri, setPersonnelGiderleri] = useState<any[]>([]);
  
  // Proposal Form States
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalFirmId, setProposalFirmId] = useState("");
  const [proposalAmount, setProposalAmount] = useState("");
  const [proposalCurrency, setProposalCurrency] = useState("GBP");
  const [proposalDate, setProposalDate] = useState(new Date().toISOString().split("T")[0]);
  const [proposalNotes, setProposalNotes] = useState("");
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [proposalSearch, setProposalSearch] = useState("");
  const [proposalStatusFilter, setProposalStatusFilter] = useState<"ALL" | "Beklemede" | "Kabul Edildi" | "Reddedildi">("ALL");
  
  // App Config & Auth States
  const [tokenRequired, setTokenRequired] = useState(false);
  const [adminToken, setAdminToken] = useState(() => {
    return localStorage.getItem("authToken") || localStorage.getItem("operasyonel_admin_token") || "test-admin-token-2026";
  });
  const [tokenInput, setTokenInput] = useState(() => {
    return localStorage.getItem("authToken") || localStorage.getItem("operasyonel_admin_token") || "test-admin-token-2026";
  });
  const [authErrorOccurred, setAuthErrorOccurred] = useState(false);

  useEffect(() => {
    localStorage.setItem("authToken", adminToken);
    localStorage.setItem("operasyonel_admin_token", adminToken);
  }, [adminToken]);
  const [isLoading, setIsLoading] = useState(true);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Custom dialog alert/confirm states to bypass blocked standard modals:
  const [appAlert, setAppAlert] = useState<{ message: string; title?: string } | null>(null);
  const [appConfirm, setAppConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  // Shadow non-blocking alert function to redirect window.alert to elegant custom dialog overlay
  const alert = (message: string) => {
    setAppAlert({ message, title: "Sistem Mesajı" });
  };

  // Active Tab State
  // Tabs: 'kasa', 'ortaklik', 'personel', 'takip', 'raporlar', 'ayarlar', 'firmalar'
  const [activeTab, setActiveTab] = useState<string>("takip"); 

  // Mobile responsive layout view state detection (width < 768px)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []); 

  // Check-In Form State
  const [selectedPersonnelId, setSelectedPersonnelId] = useState("");
  const [selectedFirmId, setSelectedFirmId] = useState("");
  const [checkInTime, setCheckInTime] = useState(getLocalISOStringForInput());
  const [recordNote, setRecordNote] = useState("");
  const [recordActionLoading, setRecordActionLoading] = useState(false);

  // 🚀 Ofis Wi-Fi Tabanlı Çevrimdışı Giriş-Çıkış Modülü States & Queues
  const [wifiSSID, setWifiSSID] = useState(() => {
    return localStorage.getItem("wifi_ssid_simulation") || "Ekinoks_Ofis_Wifi";
  });
  const [syncingOfflineRecords, setSyncingOfflineRecords] = useState(false);
  const [isServerOffline, setIsServerOffline] = useState(false);

  useEffect(() => {
    localStorage.setItem("wifi_ssid_simulation", wifiSSID);
  }, [wifiSSID]);

  const getOfflineCheckIns = (): WorkRecord[] => {
    try {
      return JSON.parse(localStorage.getItem("offline_checkins_queue") || "[]");
    } catch {
      return [];
    }
  };

  const getOfflineCheckOuts = (): { recordId: string; checkOut: string; note: string }[] => {
    try {
      return JSON.parse(localStorage.getItem("offline_checkouts_queue") || "[]");
    } catch {
      return [];
    }
  };

  const saveOfflineCheckIns = (list: WorkRecord[]) => {
    localStorage.setItem("offline_checkins_queue", JSON.stringify(list));
  };

  const saveOfflineCheckOuts = (list: { recordId: string; checkOut: string; note: string }[]) => {
    localStorage.setItem("offline_checkouts_queue", JSON.stringify(list));
  };

  const synchronizeOfflineRecords = async () => {
    const checkins = getOfflineCheckIns();
    const checkouts = getOfflineCheckOuts();

    if (checkins.length === 0 && checkouts.length === 0) {
      if (isServerOffline) {
        setIsServerOffline(false);
      }
      return;
    }

    setSyncingOfflineRecords(true);

    const offlineIdMap: Record<string, string> = {};
    const updatedCheckins = [...checkins];
    const updatedCheckouts = [...checkouts];

    try {
      // 1. Process Check-ins
      for (let i = 0; i < checkins.length; i++) {
        const item = checkins[i];
        try {
          // Send to server
          const res = await apiFetch("/api/records", {
            method: "POST",
            body: JSON.stringify({
              personnelId: item.personnelId,
              firmId: item.firmId,
              checkIn: item.checkIn,
              note: item.note,
              checkOut: item.checkOut
            })
          });

          offlineIdMap[item.id] = res.id;
          
          const idx = updatedCheckins.findIndex(c => c.id === item.id);
          if (idx !== -1) {
            updatedCheckins.splice(idx, 1);
          }
          saveOfflineCheckIns(updatedCheckins);
          
          setRecords(prev => prev.map(r => r.id === item.id ? res : r));
        } catch (err: any) {
          if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError") || err.message.includes("İşlem başarısız oldu"))) {
            throw err; 
          }
        }
      }

      // Update checkouts' recordId if they were linked to offline check-in IDs
      const mappedCheckouts = updatedCheckouts.map(co => {
        if (co.recordId && offlineIdMap[co.recordId]) {
          return { ...co, recordId: offlineIdMap[co.recordId] };
        }
        return co;
      });

      // 2. Process Checkouts
      const remainingCheckouts = [...mappedCheckouts];
      for (let i = 0; i < mappedCheckouts.length; i++) {
        const item = mappedCheckouts[i];
        if (item.recordId.startsWith("offline-")) {
          continue;
        }

        try {
          const res = await apiFetch(`/api/records/${item.recordId}/checkout`, {
            method: "PUT",
            body: JSON.stringify({
              checkOut: item.checkOut,
              note: item.note
            })
          });

          const idx = remainingCheckouts.findIndex(c => c.recordId === item.recordId);
          if (idx !== -1) {
            remainingCheckouts.splice(idx, 1);
          }
          saveOfflineCheckOuts(remainingCheckouts);

          setRecords(prev => prev.map(r => r.id === item.recordId ? res : r));
        } catch (err: any) {
          if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError") || err.message.includes("İşlem başarısız oldu"))) {
            throw err; 
          }
        }
      }

      setIsServerOffline(false);
      // Fetch fresh records list once synchronization completes
      const recordsData = await apiFetch("/api/records");
      setRecords(recordsData);
      triggerToast("🔄 Çevrimdışı kayıtlar başarıyla sunucuyla eşitlendi!");

    } catch (error: any) {
      console.warn("[Offline Sync] Sync failed:", error);
      setIsServerOffline(true);
    } finally {
      setSyncingOfflineRecords(false);
    }
  };

  // Periodic background offline sync check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      synchronizeOfflineRecords();
    }, 4000);

    const intervalId = setInterval(() => {
      synchronizeOfflineRecords();
    }, 8000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  // Check-Out Popup/Modal State
  const [checkoutItem, setCheckoutItem] = useState<WorkRecord | null>(null);
  const [checkoutTime, setCheckoutTime] = useState("");
  const [checkoutNote, setCheckoutNote] = useState("");

  // Kasa Ledger Form State
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [txType, setTxType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [txAmount, setTxAmount] = useState("");
  const [txCurrency, setTxCurrency] = useState("GBP");
  const [txDescription, setTxDescription] = useState("");
  const [txCategory, setTxCategory] = useState("Hakediş");
  const [txFirmId, setTxFirmId] = useState("");
  const [txPaymentMethod, setTxPaymentMethod] = useState<"Havale" | "Nakit">("Havale");
  const [txExchangeRate, setTxExchangeRate] = useState("");
  const [txFilterType, setTxFilterType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [txSearchQuery, setTxSearchQuery] = useState("");
  const [txSubmitLoading, setTxSubmitLoading] = useState(false);

  // Custom enhanced category fields for EXPENSE
  const [txCategoryType, setTxCategoryType] = useState<"personel" | "altyapi" | "kar_cekimi" | "diger">("altyapi");
  const [txPersonnelId, setTxPersonnelId] = useState("");
  const [txPersonnelType, setTxPersonnelType] = useState<"Maaş" | "Avans">("Maaş");
  const [txOfficeSubcategory, setTxOfficeSubcategory] = useState("Market Malzemesi");
  const [txPartnerId, setTxPartnerId] = useState("Hasan");
  const [txExpensePaidBy, setTxExpensePaidBy] = useState<"Kasadan" | "Hasan" | "Mustafa">("Kasadan");

  // Partnership State - Hasan and Mustafa
  const [partners, setPartners] = useState([
    { id: "hasan", name: "Hasan", ratio: 50 },
    { id: "mustafa", name: "Mustafa", ratio: 50 },
  ]);
  const [pSelectedMonth, setPSelectedMonth] = useState<string>("ALL");

  // Transaction Edit states
  const [editingTx, setEditingTx] = useState<any>(null);
  const [editTxAmount, setEditTxAmount] = useState("");
  const [editTxDate, setEditTxDate] = useState("");
  const [editTxDescription, setEditTxDescription] = useState("");
  const [editTxCurrency, setEditTxCurrency] = useState("GBP");
  const [editTxExchangeRate, setEditTxExchangeRate] = useState("");
  const [editTxPartnerId, setEditTxPartnerId] = useState("Hasan");

  // Reports date range filter
  const [reportStartDate, setReportStartDate] = useState<string>("");
  const [reportEndDate, setReportEndDate] = useState<string>("");
  const [activeReportStartDate, setActiveReportStartDate] = useState<string>("");
  const [activeReportEndDate, setActiveReportEndDate] = useState<string>("");

  // Deep structural report localized states
  const [reportFirmFilter, setReportFirmFilter] = useState<string>("ALL");
  const [reportFirmMonthFilter, setReportFirmMonthFilter] = useState<string>("ALL");

  const [reportPersonnelFilter, setReportPersonnelFilter] = useState<string>("ALL");
  const [reportPersonnelMonthFilter, setReportPersonnelMonthFilter] = useState<string>("ALL");
  const [reportPersonnelBaseSalary, setReportPersonnelBaseSalary] = useState<string>("2500");
  const [reportPersonnelOvertimeRate, setReportPersonnelOvertimeRate] = useState<string>("20");

  const [reportExpenseMonthFilter, setReportExpenseMonthFilter] = useState<string>("ALL");
  const [reportExpensePaidByFilter, setReportExpensePaidByFilter] = useState<string>("ALL");
  const [activeReportSubTab, setActiveReportSubTab] = useState<"firm" | "personnel" | "expenses">("firm");

  // Dynamic status tracking for model projects
  const [firmProjectStatuses, setFirmProjectStatuses] = useState<Record<string, string>>({});
  const [firmProjectProgress, setFirmProjectProgress] = useState<Record<string, string>>({});

  // Printing engine for specific tables with layout preserving
  const handlePrintReport = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (!el) {
      alert("Hata: Yazdırılacak alan bulunamadı.");
      return;
    }
    document.body.classList.add("printing-mode");
    el.classList.add("print-target-active");
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.warn("Print execution caught an exception:", err);
        alert(
          "YAZDIRMA UYARISI / BİLGİLENDİRME:\n\n" +
          "Tarayıcı güvenlik önlemleri (iframe koruması) nedeniyle 'window.print()' komutu bu test penceresinde doğrudan çalıştırılamadı.\n\n" +
          "Lütfen şu adımları izleyin:\n" +
          "1. Sağ üst köşedeki 'Yeni Sekmede Aç' (Open in New Tab) düğmesini kullanarak uygulamayı doğrudan kendi sekmesinde açın.\n" +
          "2. Raporlar sekmesine gidip aynı butona basın; yazdırma ekranı sorunsuz açılacaktır.\n" +
          "3. Alternatif olarak klavyenizden 'Ctrl + P' (veya Mac'te 'Cmd + P') yapabilirsiniz."
        );
      } finally {
        document.body.classList.remove("printing-mode");
        el.classList.remove("print-target-active");
      }
    }, 250);
  };

  // Helper Custom Toast Trigger
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Dedicated API Client Wrapper
  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const localToken = localStorage.getItem("authToken") || localStorage.getItem("operasyonel_admin_token") || adminToken || "";
    const headers = {
      ...options.headers,
      "Content-Type": "application/json",
      ...(localToken ? { 
        "Authorization": `Bearer ${localToken}`,
        "authToken": localToken
      } : {})
    };
    
    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401) {
        setAuthErrorOccurred(true);
        throw new Error("Sistemde Token Koruması Aktiftir! Lütfen geçerli bir yönetici token'ı girin.");
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `İşlem başarısız oldu (Hata Kod: ${response.status})`);
      }
      
      setAuthErrorOccurred(false);
      return response.json();
    } catch (err: any) {
      if (err.message && err.message.includes("Token Koruması")) {
        setAuthErrorOccurred(true);
      }
      throw err;
    }
  };

  // Fetch all data from server
  const loadWorkspaceData = async () => {
    setIsLoading(true);
    setGeneralError(null);
    try {
      // 1. Auth Status check
      const authResponse = await fetch("/api/auth/status").then(r => r.json()).catch(() => ({ isTokenRequired: false }));
      setTokenRequired(authResponse.isTokenRequired);

      // 2. Fetch firms
      const firmsData = await apiFetch("/api/firms");
      setFirms(firmsData);

      // 3. Fetch personnel
      const personnelData = await apiFetch("/api/personnel");
      setPersonnel(personnelData);

      // 4. Fetch work records
      const recordsData = await apiFetch("/api/records");
      setRecords(recordsData);

      // 5. Fetch transactions
      const txData = await apiFetch("/api/transactions");
      setTransactions(txData);

      // 6. Fetch proposals (with empty fallback for backwards compatibility)
      const proposalsData = await apiFetch("/api/proposals").catch(() => []);
      setProposals(proposalsData);

      // 7. Fetch personnel expenses (avans)
      const pgData = await apiFetch("/api/personnel-giderleri").catch(() => []);
      setPersonnelGiderleri(pgData);
      
      setAuthErrorOccurred(false);
    } catch (err: any) {
      console.error("Workspace initial data load error:", err);
      setGeneralError(err.message || "Uygulama verileri sunucudan yüklenirken hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, [adminToken]);

  // Auth Toggle Controller (API)
  const toggleTokenSafety = async () => {
    try {
      const result = await apiFetch("/api/auth/toggle", { method: "POST" });
      setTokenRequired(result.isTokenRequired);
      triggerToast(`Token Koruması ${result.isTokenRequired ? "Aktifleştirildi" : "Kapatıldı"}`);
    } catch (err: any) {
      alert(err.message || "Güvenlik ayarı güncellenemedi.");
    }
  };

  // 1. ADD FIRM HANDLER (Passed to FirmSection)
  const handleAddFirm = async (firmData: Omit<Firm, "id" | "createdAt">): Promise<boolean> => {
    try {
      const newFirm = await apiFetch("/api/firms", {
        method: "POST",
        body: JSON.stringify(firmData)
      });
      setFirms(prev => [...prev, newFirm]);
      triggerToast("Firma başarıyla sisteme kayıt edildi!");
      return true;
    } catch (err: any) {
      alert(err.message || "Firma kaydedilirken bir hata oluştu.");
      return false;
    }
  };

  // 2. DELETE FIRM HANDLER (Passed to FirmSection)
  const handleDeleteFirm = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiFetch(`/api/firms/${id}`, { method: "DELETE" });
      setFirms(prev => prev.filter(f => f.id !== id));
      triggerToast("Firma kaydı silindi.");
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Firma silinemedi." };
    }
  };

  // 3. ADD PERSONNEL HANDLER (Passed to PersonnelSection)
  const handleAddPersonnel = async (personnelData: Omit<Personnel, "id" | "createdAt">): Promise<boolean | string> => {
    try {
      const newPers = await apiFetch("/api/personnel", {
        method: "POST",
        body: JSON.stringify(personnelData)
      });
      setPersonnel(prev => [...prev, newPers]);
      triggerToast("Personel kartı başarıyla oluşturuldu!");
      return true;
    } catch (err: any) {
      return err.message || "Personel kartı oluşturulurken hata oluştu.";
    }
  };

  // 4. DELETE PERSONNEL HANDLER (Passed to PersonnelSection)
  const handleDeletePersonnel = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiFetch(`/api/personnel/${id}`, { method: "DELETE" });
      setPersonnel(prev => prev.filter(p => p.id !== id));
      triggerToast("Personel kartı silindi.");
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Personel kartı silinemedi." };
    }
  };

  // 4.1 ADD AVANS ÖDEMESİ HANDLER (Passed to PersonnelSection)
  const handleAddAdvance = async (personnelId: string, miktar_try: number, date: string, desc: string, taksitSayisi?: number): Promise<any> => {
    try {
      const res = await apiFetch("/api/personnel-giderleri", {
        method: "POST",
        body: JSON.stringify({
          personnelId,
          miktar_try,
          tarih: date,
          aciklama: desc,
          taksitSayisi: taksitSayisi ?? 1,
          exchangeRate: parseFloat(txExchangeRate) || 43.15
        })
      });
      // Güncel verileri çek
      const pgData = await apiFetch("/api/personnel-giderleri").catch(() => []);
      setPersonnelGiderleri(pgData);
      const txData = await apiFetch("/api/transactions");
      setTransactions(txData);
      triggerToast("Avans ödemesi işlendi ve Kasa defterine yansıtıldı!");
      return res;
    } catch (err: any) {
      throw new Error(err.message || "Avans eklenirken hata oluştu.");
    }
  };

  // 4.1b DELETE AND EDIT AVANS ÖDEMESİ HANDLERS
  const handleDeleteAdvance = async (id: string): Promise<any> => {
    try {
      const res = await apiFetch(`/api/personnel/avans-sil/${id}`, {
        method: "DELETE"
      });
      const pgData = await apiFetch("/api/personnel-giderleri").catch(() => []);
      setPersonnelGiderleri(pgData);
      const txData = await apiFetch("/api/transactions");
      setTransactions(txData);
      triggerToast("Avans ödemesi sistemden silindi ve kasa hareketi güncellendi.");
      return res;
    } catch (err: any) {
      throw new Error(err.message || "Avans silinirken hata oluştu.");
    }
  };

  const handleEditAdvance = async (id: string, miktar_try: number, date: string, desc: string, taksitSayisi: number): Promise<any> => {
    try {
      const res = await apiFetch(`/api/personnel/avans-duzenle/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          miktar_try,
          tarih: date,
          aciklama: desc,
          taksitSayisi,
          exchangeRate: parseFloat(txExchangeRate) || 43.15
        })
      });
      const pgData = await apiFetch("/api/personnel-giderleri").catch(() => []);
      setPersonnelGiderleri(pgData);
      const txData = await apiFetch("/api/transactions");
      setTransactions(txData);
      triggerToast("Avans ödemesi başarıyla güncellendi ve kasa hareketi revize edildi.");
      return res;
    } catch (err: any) {
      throw new Error(err.message || "Avans güncellenirken hata oluştu.");
    }
  };

  // 4.2 HESAPLA VE MAAS ODEMESI YAP HANDLER (Passed to PersonnelSection)
  const handleCalculateAndPay = async (personnelId: string, calisilanGun: number, toplamMesaiSaati: number, ay: string): Promise<any> => {
    try {
      const res = await apiFetch("/api/personnel/calculate-and-pay", {
        method: "POST",
        body: JSON.stringify({
          personnelId,
          calisilanGun,
          toplamMesaiSaati,
          ay,
          exchangeRate: parseFloat(txExchangeRate) || 43.15
        })
      });
      // Güncel verileri çek
      const txData = await apiFetch("/api/transactions");
      setTransactions(txData);
      triggerToast("Maaş hakediş ödemesi başarıyla Kasa defterine işlendi!");
      return res;
    } catch (err: any) {
      throw new Error(err.message || "Ödeme kaydı oluşturulurken hata oluştu.");
    }
  };

  // 5. WORK CHECK-IN SUBMIT
  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonnelId || !checkInTime) {
      alert("Lütfen Personel ve Giriş Tarih/Saatini eksiksiz seçin.");
      return;
    }

    if (wifiSSID !== "Ekinoks_Ofis_Wifi") {
      alert("Giriş ve çıkış işlemleri sadece 'Ekinoks_Ofis_Wifi' ağına bağlıyken yapılabilir.");
      return;
    }

    setRecordActionLoading(true);
    try {
      const recordData = {
        personnelId: selectedPersonnelId,
        firmId: "ofis",
        checkIn: checkInTime,
        note: recordNote
      };

      const newRecord = await apiFetch("/api/records", {
        method: "POST",
        body: JSON.stringify(recordData)
      });

      setRecords(prev => [...prev, newRecord]);
      setSelectedPersonnelId("");
      setRecordNote("");
      setCheckInTime(getLocalISOStringForInput());
      triggerToast("Mesai girişi başarılı şekilde kaydedildi!");
    } catch (err: any) {
      console.warn("[Check-In] Remote server inaccessible or error. Falling back to offline client-side storage.", err);
      
      const offlineId = `offline-${Date.now()}`;
      const offlineRecord: WorkRecord = {
        id: offlineId,
        personnelId: selectedPersonnelId,
        firmId: "ofis",
        checkIn: checkInTime,
        checkOut: null,
        note: recordNote || "",
        createdAt: new Date().toISOString()
      };

      const checkins = getOfflineCheckIns();
      saveOfflineCheckIns([...checkins, offlineRecord]);
      
      setRecords(prev => [...prev, offlineRecord]);
      setIsServerOffline(true);

      setSelectedPersonnelId("");
      setRecordNote("");
      setCheckInTime(getLocalISOStringForInput());

      alert("⚠️ Sunucu çevrimdışı (kapalı). Giriş kaydınız telefonunuzun LocalStorage hafızasına güvenle kaydedildi. Sunucu açıldığında arka planda otomatik senkronize edilecektir.");
    } finally {
      setRecordActionLoading(false);
    }
  };

  // 6. WORK CHECK-OUT POPUP OPENER
  const openCheckOutModal = (record: WorkRecord) => {
    setCheckoutItem(record);
    const nowLocal = getLocalISOStringForInput();
    setCheckoutTime(nowLocal);
    setCheckoutNote(record.note || "");
  };

  // 7. WORK CHECK-OUT SUBMIT
  const handleCheckOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutItem || !checkoutTime) return;

    if (new Date(checkoutTime) < new Date(checkoutItem.checkIn)) {
      alert("Çıkış Tarihi / Saati, Giriş vaktinden daha eski olamaz!");
      return;
    }

    if (wifiSSID !== "Ekinoks_Ofis_Wifi") {
      alert("Giriş ve çıkış işlemleri sadece 'Ekinoks_Ofis_Wifi' ağına bağlıyken yapılabilir.");
      return;
    }

    try {
      if (checkoutItem.id.startsWith("offline-")) {
        // Update checkout information inside checkins offline queue
        const checkins = getOfflineCheckIns();
        const foundIdx = checkins.findIndex(c => c.id === checkoutItem.id);
        if (foundIdx !== -1) {
          checkins[foundIdx].checkOut = checkoutTime;
          checkins[foundIdx].note = checkoutNote;
          saveOfflineCheckIns(checkins);
        } else {
          // Add into checkout queue
          const checkouts = getOfflineCheckOuts();
          saveOfflineCheckOuts([...checkouts, { recordId: checkoutItem.id, checkOut: checkoutTime, note: checkoutNote }]);
        }

        setRecords(prev => prev.map(r => r.id === checkoutItem.id ? { ...r, checkOut: checkoutTime, note: checkoutNote } : r));
        setCheckoutItem(null);
        triggerToast("⚠️ Çevrimdışı çıkış kaydı tamamlandı! Cihaz hafızasına yazıldı.");
        return;
      }

      // Online checkout attempt
      try {
        const updated = await apiFetch(`/api/records/${checkoutItem.id}/checkout`, {
          method: "PUT",
          body: JSON.stringify({
            checkOut: checkoutTime,
            note: checkoutNote
          })
        });

        setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
        setCheckoutItem(null);
        triggerToast("Mesai başarıyla tamamlandı ve süresi otomatik güncellendi!");
      } catch (err: any) {
        console.warn("[Check-Out] Remote server down. Falling back to offline client-side storage.", err);

        const checkouts = getOfflineCheckOuts();
        saveOfflineCheckOuts([...checkouts, { recordId: checkoutItem.id, checkOut: checkoutTime, note: checkoutNote }]);

        setRecords(prev => prev.map(r => r.id === checkoutItem.id ? { ...r, checkOut: checkoutTime, note: checkoutNote } : r));
        setCheckoutItem(null);
        setIsServerOffline(true);
        alert("⚠️ Sunucu kapalı. Çıkış kaydınız telefonunuzun LocalStorage hafızasına alındı. Sunucu açıldığında arka planda otomatik senkronize edilecektir.");
      }
    } catch (e: any) {
      alert("Çıkış kaydı yapılırken bir hata oluştu: " + e.message);
    }
  };

  // 8. DELETE WORK RECORD
  const handleDeleteRecord = async (id: string) => {
    setAppConfirm({
      title: "Giriş-Çıkış Kaydı Silinecek",
      message: "Bu giriş-çıkış kaydını tamamen silmek istediğinize emin misiniz?",
      onConfirm: async () => {
        try {
          await apiFetch(`/api/records/${id}`, { method: "DELETE" });
          setRecords(prev => prev.filter(r => r.id !== id));
          triggerToast("Mesai kaydı sistemden silindi.");
        } catch (err: any) {
          alert(err.message || "Silme işlemi yapılamadı.");
        }
      }
    });
  };

  // 9. KASA LEDGER ADD TRANSACTION
  const handleAddTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numericAmount = parseFloat(txAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert("Lütfen sıfırdan büyük geçerli bir tutar yazın.");
      return;
    }

    let numericRate = parseFloat(txExchangeRate);
    if (txCurrency === "TRY" && txExchangeRate && (isNaN(numericRate) || numericRate <= 0)) {
      alert("Lütfen döviz kuru için geçerli bir sayı girin.");
      return;
    }

    let finalCategory = txCategory.trim();
    let finalDescription = txDescription.trim();
    let finalPartnerId: string | undefined = undefined;
    let finalPersonnelId: string | undefined = undefined;

    if (txType === "EXPENSE") {
      if (txCategoryType === "personel") {
        if (!txPersonnelId) {
          alert("Lütfen gider kaydı için personel seçiniz.");
          return;
        }
        const selectedPerson = personnel.find(p => p.id === txPersonnelId);
        const personName = selectedPerson ? selectedPerson.fullName : "Bilinmeyen Personel";
        finalCategory = "Personel Giderleri";
        finalDescription = `[Personel Gideri - ${personName} (${txPersonnelType})] ${txDescription.trim()}`;
        finalPersonnelId = txPersonnelId;
      } else if (txCategoryType === "altyapi") {
        finalCategory = "Ofis Genel Gideri";
        finalDescription = `[${txOfficeSubcategory} - Ödeyen: ${txExpensePaidBy}] ${txDescription.trim()}`;
        finalPartnerId = txExpensePaidBy === "Kasadan" ? undefined : (txExpensePaidBy === "Hasan" ? "Hasan_Ofis" : "Mustafa_Ofis");
      } else if (txCategoryType === "kar_cekimi") {
        finalCategory = "Ortaklar Kâr Çekimi";
        finalDescription = `[Ortak Kâr Çekimi - ${txPartnerId}] ${txDescription.trim()}`;
        finalPartnerId = txPartnerId;
      } else {
        if (!finalCategory) {
          alert("Lütfen gider kategorisi belirtiniz.");
          return;
        }
      }
    } else {
      if (!finalCategory) {
        alert("Lütfen gelir kategorisi belirtiniz.");
        return;
      }
    }

    if (!txDate || !finalDescription || !finalCategory) {
      alert("Lütfen para hareketi formundaki tüm zorunlu alanları doldurun.");
      return;
    }

    setTxSubmitLoading(true);
    try {
      let gbpEquivalent: number | undefined = undefined;

      if (txCurrency === "TRY" && numericRate > 0) {
        gbpEquivalent = Math.round((numericAmount / numericRate) * 100) / 100;
        finalDescription = `${finalDescription} (${gbpEquivalent.toFixed(2)} GBP karşılığı ${txAmount} TRY - Kur: ${txExchangeRate})`;
      }

      const payload = {
        date: txDate,
        type: txType,
        amount: numericAmount,
        currency: txCurrency,
        description: finalDescription,
        category: finalCategory,
        firmId: txType === "EXPENSE" ? undefined : (txFirmId || undefined),
        paymentMethod: txPaymentMethod,
        exchangeRate: txCurrency === "TRY" && numericRate > 0 ? numericRate : undefined,
        gbpEquivalent: gbpEquivalent,
        partnerId: finalPartnerId,
        personnelId: finalPersonnelId
      };

      const newTx = await apiFetch("/api/transactions", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setTransactions(prev => [...prev, newTx]);
      setTxAmount("");
      setTxDescription("");
      setTxExchangeRate("");
      setTxFirmId("");
      triggerToast("İşlem deftere başarıyla işlendi.");
    } catch (err: any) {
      alert(err.message || "Finansal işlem kaydedilemedi.");
    } finally {
      setTxSubmitLoading(false);
    }
  };

  // 10. DELETE TRANSACTION
  const handleDeleteTransaction = async (id: string) => {
    setAppConfirm({
      title: "Para Hareketi Silinecek",
      message: "Seçilen para hareketi kaydını silmek istediğinize emin misiniz?",
      onConfirm: async () => {
        try {
          await apiFetch(`/api/transactions/${id}`, { method: "DELETE" });
          setTransactions(prev => prev.filter(t => t.id !== id));
          triggerToast("Kayıt defterden başarıyla kaldırıldı.");
        } catch (err: any) {
          alert(err.message || "Silme işlemi sırasında hata oluştu.");
        }
      }
    });
  };

  // Transaction Edit Handlers
  const startEditTx = (tx: any) => {
    setEditingTx(tx);
    setEditTxAmount(tx.amount.toString());
    setEditTxDate(tx.date || "");
    setEditTxCurrency(tx.currency || "GBP");
    setEditTxExchangeRate(tx.exchangeRate ? tx.exchangeRate.toString() : "");
    setEditTxPartnerId(tx.partnerId || "Hasan");

    let cleanDesc = tx.description || "";
    if (cleanDesc.startsWith("[")) {
      const closingBracketIndex = cleanDesc.indexOf("]");
      if (closingBracketIndex !== -1) {
        cleanDesc = cleanDesc.slice(closingBracketIndex + 1).trim();
      }
    }
    const suffixIndex = cleanDesc.indexOf(" (");
    if (suffixIndex !== -1 && cleanDesc.includes("GBP karşılığı")) {
      cleanDesc = cleanDesc.substring(0, suffixIndex).trim();
    }
    setEditTxDescription(cleanDesc);
  };

  const handleSaveTxEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    const numericAmount = parseFloat(editTxAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert("Lütfen geçerli bir tutar yazın.");
      return;
    }

    let numericRate = parseFloat(editTxExchangeRate);
    if (editTxCurrency === "TRY" && (isNaN(numericRate) || numericRate <= 0)) {
      alert("Lütfen geçerli bir döviz kuru girin.");
      return;
    }

    let cleanDesc = editTxDescription.trim();
    let finalDesc = cleanDesc;
    if (editingTx.category === "Ortaklar Kâr Çekimi") {
      finalDesc = `[Ortak Kâr Çekimi - ${editTxPartnerId}] ${cleanDesc}`;
    } else if (editingTx.category === "Ofis Genel Gideri") {
      const isOutPocket = editingTx.partnerId === "Hasan_Ofis" || editingTx.partnerId === "Mustafa_Ofis" || (editingTx.description && (editingTx.description.includes("Ödeyen: Hasan") || editingTx.description.includes("Ödeyen: Mustafa")));
      if (isOutPocket) {
        // Let's recognize the subcategory if it has prefix
        let subcat = "Market Malzemesi"; 
        if (editingTx.description && editingTx.description.startsWith("[")) {
          const closing = editingTx.description.indexOf(" - Ödeyen:");
          if (closing !== -1) {
            subcat = editingTx.description.substring(1, closing);
          }
        }
        const payerText = editTxPartnerId === "Kasadan" ? "Kasadan" : (editTxPartnerId === "Hasan" || editTxPartnerId === "Hasan_Ofis" ? "Hasan" : "Mustafa");
        finalDesc = `[${subcat} - Ödeyen: ${payerText}] ${cleanDesc}`;
      }
    }

    let gbpEquivalent: number | undefined = undefined;
    if (editTxCurrency === "TRY" && numericRate > 0) {
      gbpEquivalent = Math.round((numericAmount / numericRate) * 100) / 100;
      finalDesc = `${finalDesc} (${gbpEquivalent.toFixed(2)} GBP karşılığı ${editTxAmount} TRY - Kur: ${editTxExchangeRate})`;
    } else {
      gbpEquivalent = numericAmount;
    }

    try {
      let finalPartnerVal = editingTx.partnerId;
      if (editingTx.category === "Ortaklar Kâr Çekimi") {
        finalPartnerVal = editTxPartnerId;
      } else if (editingTx.category === "Ofis Genel Gideri") {
        finalPartnerVal = editTxPartnerId === "Kasadan" ? null : (editTxPartnerId === "Hasan" || editTxPartnerId === "Hasan_Ofis" ? "Hasan_Ofis" : "Mustafa_Ofis");
      }

      const updated = await apiFetch(`/api/transactions/${editingTx.id}`, {
        method: "PUT",
        body: JSON.stringify({
          date: editTxDate,
          amount: numericAmount,
          currency: editTxCurrency,
          description: finalDesc,
          exchangeRate: editTxCurrency === "TRY" && numericRate > 0 ? numericRate : null,
          gbpEquivalent: gbpEquivalent,
          partnerId: finalPartnerVal
        })
      });

      setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
      setEditingTx(null);
      triggerToast("Finansal hareket ve kasa kaydı başarıyla güncellendi!");
    } catch (err: any) {
      alert(err.message || "Kaydetme işlemi başarısız oldu.");
    }
  };

  // 10b. GLOBAL TRANSACTION CREATOR (Passed to sub-components)
  const handleCreateTransaction = async (txData: any): Promise<boolean> => {
    try {
      const newTx = await apiFetch("/api/transactions", {
        method: "POST",
        body: JSON.stringify(txData)
      });
      setTransactions(prev => [...prev, newTx]);
      triggerToast("Finansal hareket ve kasa kaydı başarıyla işlendi.");
      return true;
    } catch (err: any) {
      alert(err.message || "Finansal işlem kaydedilemedi.");
      return false;
    }
  };

  // 11. PROPOSAL CRUD HANDLERS
  const handleAddProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalTitle.trim() || !proposalFirmId || !proposalAmount || !proposalDate) {
      alert("Lütfen teklif oluşturma formundaki tüm zorunlu alanları doldurun.");
      return;
    }

    const numericAmount = parseFloat(proposalAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert("Teklif tutarı sıfırdan büyük geçerli bir sayı olmalıdır.");
      return;
    }

    setIsSubmittingProposal(true);
    try {
      const payload = {
        firmId: proposalFirmId,
        title: proposalTitle.trim(),
        amount: numericAmount,
        currency: proposalCurrency,
        date: proposalDate,
        notes: proposalNotes.trim()
      };

      const newProposal = await apiFetch("/api/proposals", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setProposals(prev => [...prev, newProposal]);
      setProposalTitle("");
      setProposalAmount("");
      setProposalNotes("");
      triggerToast("Maket teklifi başarıyla oluşturuldu.");
    } catch (err: any) {
      alert(err.message || "Teklif oluşturulurken bir hata oluştu.");
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  const handleUpdateProposalStatus = async (id: string, newStatus: Proposal['status']) => {
    try {
      const updated = await apiFetch(`/api/proposals/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus })
      });

      setProposals(prev => prev.map(p => p.id === id ? updated : p));
      
      // Auto-sync transactions list when proposal gets Accepted or changed from Accepted
      const txData = await apiFetch("/api/transactions");
      setTransactions(txData);

      triggerToast(`Teklif durumu "${newStatus}" olarak güncellendi.`);
    } catch (err: any) {
      alert(err.message || "Durum güncellenirken hata oluştu.");
    }
  };

  const handleDeleteProposal = async (id: string) => {
    setAppConfirm({
      title: "Teklifi Sil",
      message: "Bu teklifi silmek istediğinize emin misiniz? (İlişkili tüm otomatik borç kayıtları kaldırılacaktır.)",
      onConfirm: async () => {
        try {
          await apiFetch(`/api/proposals/${id}`, { method: "DELETE" });
          setProposals(prev => prev.filter(p => p.id !== id));
          
          // Sync transactions
          const txData = await apiFetch("/api/transactions");
          setTransactions(txData);
          
          triggerToast("Teklif sistemden silindi.");
        } catch (err: any) {
          alert(err.message || "Teklif silinemedi.");
        }
      }
    });
  };

  // Local JSON Backup Export
  const backupFileInputRef = React.useRef<HTMLInputElement>(null);
  const [isFetchingRate, setIsFetchingRate] = useState(false);

  const handleFetchExchangeRate = async () => {
    setIsFetchingRate(true);
    try {
      const data = await apiFetch("/api/rates");
      const tryRate = data.rates?.TRY;
      if (tryRate) {
        setTxExchangeRate(tryRate.toString());
        triggerToast(`Güncel döviz kuru başarıyla alındı: 1 GBP = ${tryRate} TRY`);
      } else {
        throw new Error("Kur verisi alınamadı.");
      }
    } catch (err: any) {
      console.warn("Exchange rate API failed:", err);
      setTxExchangeRate("43.15");
      triggerToast("Kur servisi geçici olarak çevrimdışı, sistem referans kuru kullanıldı (43.15)");
    } finally {
      setIsFetchingRate(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.firms || !json.personnel || !json.records || !json.transactions) {
          throw new Error("Yedek dosyası doğrulanmadı. Gerekli tüm veri tabloları (firmalar, personel, mesailer ve hareketler) mevcut olmalıdır.");
        }

        setAppConfirm({
          title: "Veritabanı Yedeği Yüklenecek",
          message: "DİKKAT: Bu işlem mevcut tüm veritabanı kayıtlarının üzerine yazacaktır. Devam etmek istiyor musunuz?",
          onConfirm: async () => {
            setIsLoading(true);
            try {
              await apiFetch("/api/backup/restore", {
                method: "POST",
                body: JSON.stringify({
                  firms: json.firms,
                  personnel: json.personnel,
                  records: json.records,
                  transactions: json.transactions,
                  proposals: json.proposals || []
                })
              });

              triggerToast("Veritabanı yedeği başarıyla yüklendi ve tüm veriler güncellendi!");
              await loadWorkspaceData();
            } catch (err: any) {
              alert("Yedek geri yüklenirken hata oluştu: " + (err.message || err));
            } finally {
              setIsLoading(false);
            }
          }
        });
      } catch (err: any) {
        alert("Yedek geri yüklenirken hata oluştu: " + (err.message || err));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExportData = () => {
    const fullBackup = {
      firms,
      personnel,
      records,
      transactions,
      proposals,
      exportedAt: new Date().toISOString(),
      system: "Operasyonel Takip Paneli v2"
    };

    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `operasyonel-takip-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetDatabase = async () => {
    setAppConfirm({
      title: "Veritabanını Sıfırla (Kendi Verileriniz İçin)",
      message: "DİKKAT: Bu işlem veritabanındaki tüm örnek firmaları, personelleri, mesaileri, teklifleri ve işlemleri kalıcı olarak silecektir. Boş ve temiz bir veritabanı ile sıfırdan başlamak istediğinize emin misiniz?",
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await apiFetch("/api/admin/clear-db", { method: "POST" });
          triggerToast("Tüm örnek veriler temizlendi! Sıfır veritabanı ile başlamaya hazırsınız.");
          await loadWorkspaceData();
        } catch (err: any) {
          alert("Sıfırlama işlemi esnasında hata oluştu: " + (err.message || err));
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  // Local Partner Ratio change validation
  const handlePartnerRatioChange = (id: string, newRatio: number) => {
    setPartners(prev => prev.map(p => p.id === id ? { ...p, ratio: Number(newRatio) } : p));
  };

  // ORTAKLAR CARİ VE BORÇ TAKİP MOTORU (Hasan & Mustafa)
  const getPartnershipCalculations = (selectedMonth: string) => {
    const convertToGbp = (t: Transaction) => {
      if (t.currency === "GBP") return t.amount;
      if (t.currency === "TRY") {
        const rate = t.exchangeRate || 43.15;
        return Math.round((t.amount / rate) * 100) / 100;
      }
      return t.amount;
    };

    // Gather all distinct months from transactions (format YYYY-MM)
    const allMonths = Array.from(new Set(transactions.map(t => t.date.slice(0, 7)))).sort();

    let prevHasanBalance = 0;
    let prevMustafaBalance = 0;
    let prevNetProfit = 0;
    let prevHasanWithdrawals = 0;
    let prevMustafaWithdrawals = 0;

    let activeRevenue = 0;
    let activeOperatingExpenses = 0;
    let activeHasanWithdrawals = 0;
    let activeMustafaWithdrawals = 0;
    let activeNetProfit = 0;
    let activeShare = 0;

    let totalHasanWithdrawals = 0;
    let totalMustafaWithdrawals = 0;
    let cumulativeNetProfit = 0;
    let cumulativeShare = 0;

    let hasanBalance = 0;
    let mustafaBalance = 0;

    let debtAmount = 0;
    let debtor = "";
    let creditor = "";
    let debtMessage = "KASA DENGEDEDİR. ORTAKLARIN BİRER ALACAK/BORÇ DURUMU BULUNMAMAKTADIR.";

    if (selectedMonth === "ALL") {
      // Calculate overall sum of all times
      transactions.forEach(t => {
        const valGbp = convertToGbp(t);
        if (t.type === "INCOME") {
          activeRevenue += valGbp;
        } else {
          // Check if partner withdrawal
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

      activeNetProfit = activeRevenue - activeOperatingExpenses;
      activeShare = activeNetProfit / 2;

      totalHasanWithdrawals = activeHasanWithdrawals;
      totalMustafaWithdrawals = activeMustafaWithdrawals;
      cumulativeNetProfit = activeNetProfit;
      cumulativeShare = activeShare;

      hasanBalance = cumulativeShare - totalHasanWithdrawals;
      mustafaBalance = cumulativeShare - totalMustafaWithdrawals;

      const diff = hasanBalance - mustafaBalance;
      if (diff > 0) {
        debtor = "Mustafa";
        creditor = "Hasan";
        debtAmount = Math.round((diff / 2) * 100) / 100;
        debtMessage = `MUSTAFA, HASAN'A ${debtAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP NAKİT ÖDEMEKLE YÜKÜMLÜDÜR.`;
      } else if (diff < 0) {
        debtor = "Hasan";
        creditor = "Mustafa";
        debtAmount = Math.round((Math.abs(diff) / 2) * 100) / 100;
        debtMessage = `HASAN, MUSTAFA'YA ${debtAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP NAKİT ÖDEMEKLE YÜKÜMLÜDÜR.`;
      }
    } else {
      // Chronic month-by-month evaluation
      let runningHasan = 0;
      let runningMustafa = 0;
      let runningNetProfitSum = 0;
      let runningHasanDrawsSum = 0;
      let runningMustafaDrawsSum = 0;

      // Ensure we run chronologically on all months up to selectedMonth
      const monthsToProcess = allMonths.filter(m => m <= selectedMonth);
      if (!monthsToProcess.includes(selectedMonth)) {
        monthsToProcess.push(selectedMonth);
        monthsToProcess.sort();
      }

      for (const m of monthsToProcess) {
        const monthTxs = transactions.filter(t => t.date.slice(0, 7) === m);
        const mPool = monthTxs.filter(t => t.type === "INCOME").reduce((sum, t) => sum + convertToGbp(t), 0);
        const mExpenses = monthTxs.filter(t => 
          t.type === "EXPENSE" &&
          t.category !== "Ortaklar Kâr Çekimi"
        ).reduce((sum, t) => sum + convertToGbp(t), 0);

        const mHasanDraw = monthTxs.filter(t => 
          t.type === "EXPENSE" &&
          t.category === "Ortaklar Kâr Çekimi" &&
          (t.partnerId === "Hasan" || (t.description && t.description.includes("Hasan")))
        ).reduce((sum, t) => sum + convertToGbp(t), 0);

        const mMustafaDraw = monthTxs.filter(t => 
          t.type === "EXPENSE" &&
          t.category === "Ortaklar Kâr Çekimi" &&
          (t.partnerId === "Mustafa" || (t.description && t.description.includes("Mustafa")))
        ).reduce((sum, t) => sum + convertToGbp(t), 0);

        const mNetProfit = mPool - mExpenses;
        const mShare = mNetProfit / 2;

        const mCarriedHasan = runningHasan;
        const mCarriedMustafa = runningMustafa;

        const mEndingHasan = mShare - mHasanDraw + mCarriedHasan;
        const mEndingMustafa = mShare - mMustafaDraw + mCarriedMustafa;

        if (m === selectedMonth) {
          prevHasanBalance = mCarriedHasan;
          prevMustafaBalance = mCarriedMustafa;
          prevNetProfit = runningNetProfitSum;
          prevHasanWithdrawals = runningHasanDrawsSum;
          prevMustafaWithdrawals = runningMustafaDrawsSum;

          activeRevenue = mPool;
          activeOperatingExpenses = mExpenses;
          activeHasanWithdrawals = mHasanDraw;
          activeMustafaWithdrawals = mMustafaDraw;
          activeNetProfit = mNetProfit;
          activeShare = mShare;

          totalHasanWithdrawals = prevHasanWithdrawals + activeHasanWithdrawals;
          totalMustafaWithdrawals = prevMustafaWithdrawals + activeMustafaWithdrawals;
          cumulativeNetProfit = prevNetProfit + activeNetProfit;
          cumulativeShare = cumulativeNetProfit / 2;

          hasanBalance = mEndingHasan;
          mustafaBalance = mEndingMustafa;

          const diff = hasanBalance - mustafaBalance;
          if (diff > 0) {
            debtor = "Mustafa";
            creditor = "Hasan";
            debtAmount = Math.round((diff / 2) * 100) / 100;
            debtMessage = `MUSTAFA, HASAN'A ${debtAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP NAKİT ÖDEMEKLE YÜKÜMLÜDÜR.`;
          } else if (diff < 0) {
            debtor = "Hasan";
            creditor = "Mustafa";
            debtAmount = Math.round((Math.abs(diff) / 2) * 100) / 100;
            debtMessage = `HASAN, MUSTAFA'YA ${debtAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP NAKİT ÖDEMEKLE YÜKÜMLÜDÜR.`;
          }
        }

        runningHasan = mEndingHasan;
        runningMustafa = mEndingMustafa;
        runningNetProfitSum += mNetProfit;
        runningHasanDrawsSum += mHasanDraw;
        runningMustafaDrawsSum += mMustafaDraw;
      }
    }

    return {
      prevHasanBalance,
      prevMustafaBalance,
      prevNetProfit,
      prevHasanWithdrawals,
      prevMustafaWithdrawals,
      activeRevenue,
      activeOperatingExpenses,
      activeHasanWithdrawals,
      activeMustafaWithdrawals,
      activeNetProfit,
      activeShare,
      totalHasanWithdrawals,
      totalMustafaWithdrawals,
      cumulativeNetProfit,
      cumulativeShare,
      hasanBalance,
      mustafaBalance,
      debtAmount,
      debtor,
      creditor,
      debtMessage
    };
  };

  // KASA Calculation Logic
  const getKasaLedgerSummary = () => {
    // Collect separate currency totals
    let gbpIncome = 0;
    let gbpExpense = 0;
    let tryIncome = 0;
    let tryExpense = 0;

    transactions.forEach(t => {
      if (t.currency === "GBP") {
        if (t.type === "INCOME") gbpIncome += t.amount;
        else gbpExpense += t.amount;
      } else if (t.currency === "TRY") {
        if (t.type === "INCOME") tryIncome += t.amount;
        else tryExpense += t.amount;
      }
    });

    return {
      gbpIncome,
      gbpExpense,
      gbpNet: gbpIncome - gbpExpense,
      tryIncome,
      tryExpense,
      tryNet: tryIncome - tryExpense
    };
  };

  const ledgerSummary = getKasaLedgerSummary();

  // Filtered Ledger transactions for UI list
  const filteredTxs = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(txSearchQuery.toLowerCase()) || 
                          t.category.toLowerCase().includes(txSearchQuery.toLowerCase());
    const matchesType = txFilterType === "ALL" || t.type === txFilterType;
    return matchesSearch && matchesType;
  });

  if (isMobile) {
    // Check if the selected personnel has an active session
    const activeSessionOfSelected = selectedPersonnelId 
      ? records.find(r => r.personnelId === selectedPersonnelId && r.checkOut === null) 
      : null;

    const handleMobileCheckIn = async () => {
      if (!selectedPersonnelId) return;
      if (wifiSSID !== "Ekinoks_Ofis_Wifi") {
        alert("Giriş ve çıkış işlemleri sadece 'Ekinoks_Ofis_Wifi' ağına bağlıyken yapılabilir.");
        return;
      }
      setRecordActionLoading(true);
      try {
        const nowLocal = getLocalISOStringForInput();
        const recordData = {
          personnelId: selectedPersonnelId,
          firmId: "ofis",
          checkIn: nowLocal,
          note: "Mobil Giriş Paneli üzerinden giriş yapıldı."
        };
        const newRecord = await apiFetch("/api/records", {
          method: "POST",
          body: JSON.stringify(recordData)
        });
        setRecords(prev => [...prev, newRecord]);
        triggerToast("Mesaî başarıyla başlatıldı! Keyifli çalışmalar.");
      } catch (err: any) {
        console.warn("Mobile Check-In failed. falling back to offline", err);
        const offlineId = `offline-${Date.now()}`;
        const offlineRecord: WorkRecord = {
          id: offlineId,
          personnelId: selectedPersonnelId,
          firmId: "ofis",
          checkIn: getLocalISOStringForInput(),
          checkOut: null,
          note: "Mobil Giriş Paneli (Çevrimdışı)",
          createdAt: new Date().toISOString()
        };
        const checkins = getOfflineCheckIns();
        saveOfflineCheckIns([...checkins, offlineRecord]);
        setRecords(prev => [...prev, offlineRecord]);
        setIsServerOffline(true);
        alert("⚠️ Sunucu çevrimdışı. Giriş kaydınız telefonunuzun LocalStorage hafızasına kaydedildi.");
      } finally {
        setRecordActionLoading(false);
      }
    };

    const handleMobileCheckOut = async () => {
      if (!selectedPersonnelId || !activeSessionOfSelected) return;
      if (wifiSSID !== "Ekinoks_Ofis_Wifi") {
        alert("Giriş ve çıkış işlemleri sadece 'Ekinoks_Ofis_Wifi' ağına bağlıyken yapılabilir.");
        return;
      }
      setRecordActionLoading(true);
      try {
        const nowLocal = getLocalISOStringForInput();
        if (activeSessionOfSelected.id.startsWith("offline-")) {
          const checkins = getOfflineCheckIns();
          const foundIdx = checkins.findIndex(c => c.id === activeSessionOfSelected.id);
          if (foundIdx !== -1) {
            checkins[foundIdx].checkOut = nowLocal;
            checkins[foundIdx].note = "Mobil Çıkış Paneli (Çevrimdışı)";
            saveOfflineCheckIns(checkins);
          }
          setRecords(prev => prev.map(r => r.id === activeSessionOfSelected.id ? { ...r, checkOut: nowLocal, note: "Mobil Çıkış Paneli (Çevrimdışı)" } : r));
          triggerToast("⚠️ Çevrimdışı çıkış kaydı tamamlandı!");
          return;
        }

        const updated = await apiFetch(`/api/records/${activeSessionOfSelected.id}/checkout`, {
          method: "PUT",
          body: JSON.stringify({
            checkOut: nowLocal,
            note: "Mobil Giriş Paneli üzerinden çıkış yapıldı."
          })
        });
        setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
        triggerToast("Mesaî başarıyla tamamlandı!");
      } catch (err: any) {
        console.warn("Mobile Check-Out failed. fallback to offline", err);
        const checkouts = getOfflineCheckOuts();
        const nowLocal = getLocalISOStringForInput();
        saveOfflineCheckOuts([...checkouts, { recordId: activeSessionOfSelected.id, checkOut: nowLocal, note: "Mobil Çıkış Paneli (Çevrimdışı)" }]);
        setRecords(prev => prev.map(r => r.id === activeSessionOfSelected.id ? { ...r, checkOut: nowLocal, note: "Mobil Çıkış Paneli (Çevrimdışı)" } : r));
        setIsServerOffline(true);
        alert("⚠️ Sunucu kapalı. Çıkış kaydınız LocalStorage hafızasına alındı.");
      } finally {
        setRecordActionLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans p-4 md:p-6 justify-between selection:bg-indigo-100 selection:text-indigo-950">
        
        {/* Custom Alerts block */}
        {appAlert && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl border border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 mb-2">{appAlert.title || "Sistem Mesajı"}</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">{appAlert.message}</p>
              <button
                onClick={() => setAppAlert(null)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        )}

        <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center">
          
          {/* Header */}
          <header className="text-center mb-8">
            <div className="inline-flex p-3.5 bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-2xl shadow-md mb-3">
              <Clock className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Ekinoks Mimarlık - Personel Giriş Paneli
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">Ofis Mesaî Takip İş İstasyonu</p>
          </header>

          {/* Interactive Core Box */}
          <div className="bg-white p-6 rounded-3xl border border-slate-150/85 shadow-sm space-y-6">
            
            {/* Selection Dropdown */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Lütfen İsminizi Seçin</label>
              <div className="relative">
                <select
                  value={selectedPersonnelId}
                  onChange={(e) => setSelectedPersonnelId(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-semibold appearance-none"
                >
                  <option value="">-- Personel Seçiniz --</option>
                  {personnel.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.role})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Selected user active state info panel */}
            {selectedPersonnelId && (
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-center animate-fade-in text-xs font-medium">
                <span className="text-slate-500 block mb-1">Seçili Personel Durumu:</span>
                {activeSessionOfSelected ? (
                  <span className="text-indigo-950 font-bold block bg-indigo-100/40 p-2 rounded-xl font-mono text-center">
                    Mesaî Açık 🟢 <br/>
                    <span className="text-[10px] text-slate-500 font-normal">Giriş: {new Date(activeSessionOfSelected.checkIn).toLocaleString("tr-TR")}</span>
                  </span>
                ) : (
                  <span className="text-emerald-700 font-bold bg-emerald-50 p-2 rounded-xl block text-center">
                    Mesaî Dışı (Giriş Yapabilir) ⚪
                  </span>
                )}
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-1 gap-3.5 pt-2">
              <button
                type="button"
                disabled={recordActionLoading || wifiSSID !== "Ekinoks_Ofis_Wifi" || !selectedPersonnelId || !!activeSessionOfSelected}
                onClick={handleMobileCheckIn}
                className={`w-full py-4 text-sm font-bold rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                  !selectedPersonnelId || !!activeSessionOfSelected
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : wifiSSID !== "Ekinoks_Ofis_Wifi"
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.99]"
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                Mesai Başlat (Giriş)
              </button>

              <button
                type="button"
                disabled={recordActionLoading || wifiSSID !== "Ekinoks_Ofis_Wifi" || !selectedPersonnelId || !activeSessionOfSelected}
                onClick={handleMobileCheckOut}
                className={`w-full py-4 text-sm font-bold rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                  !selectedPersonnelId || !activeSessionOfSelected
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : wifiSSID !== "Ekinoks_Ofis_Wifi"
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-rose-600 hover:bg-rose-700 text-white active:scale-[0.99]"
                }`}
              >
                <div className="w-3.5 h-3.5 bg-current rounded-sm inline-block mr-1 align-middle" />
                Mesai Bitir (Çıkış)
              </button>
            </div>

            {/* WiFi Restrictions Alert Box */}
            {wifiSSID !== "Ekinoks_Ofis_Wifi" ? (
              <div className="text-center p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-700 font-bold block animate-pulse">
                <WifiOff className="w-4 h-4 inline mr-1 text-rose-500" />
                Giriş/Çıkış yapabilmek için lütfen Ofis Wi-Fi ağına bağlanın!
              </div>
            ) : null}

            {/* WiFi Toggle Widget for testing/visual inspection on mobile */}
            <div className="border-t border-slate-100 pt-4 text-slate-400 text-[10px] flex items-center justify-between font-mono">
              <span>Sanal Bağlantı:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[9px] font-bold">
                <button
                  type="button"
                  onClick={() => setWifiSSID("Ekinoks_Ofis_Wifi")}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    wifiSSID === "Ekinoks_Ofis_Wifi" ? "bg-white text-indigo-950 shadow-xs" : "text-slate-500"
                  }`}
                >
                  Wifi Açık
                </button>
                <button
                  type="button"
                  onClick={() => setWifiSSID("Mobil_Veri")}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    wifiSSID !== "Ekinoks_Ofis_Wifi" ? "bg-white text-indigo-950 shadow-xs" : "text-slate-500"
                  }`}
                >
                  Wifi Kapalı
                </button>
              </div>
            </div>

          </div>

          {/* Hidden Admin Entry Link at footer for easy testing and admin usage if screen gets narrow */}
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => setIsMobile(false)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline transition-colors cursor-pointer bg-transparent border-0"
            >
              Yönetici Paneline Geç (Sadece Yetkililer)
            </button>
          </div>

        </div>

        <footer className="text-center py-6 text-[10px] text-slate-400 font-mono tracking-widest uppercase">
          EKİNOKS MIMARLIK © 2026 • WORKFLOW
        </footer>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-950" id="main-panel">
      
      {/* 🚀 Sticky Header Banner with Live Stats Indicator */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-xs" id="header-section">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
          {/* App Branding Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-xl shadow-xs">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900 tracking-tight" id="app-title-header">
                  Operasyonel Takip Paneli
                </h1>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded-md border border-indigo-100">
                  v2.4 Stabil
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Personel Giriş-Çıkış Zamanları, Çalışılan Firmalar ve Kasa Ledger</p>
            </div>
          </div>

          {/* Quick Stats Summary & Refresh Indicator */}
          <div className="flex flex-wrap items-center gap-3" id="quick-actions-bar">
            
            {/* Live Clock Check API state */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/70 border border-slate-200/50 rounded-xl text-xs font-semibold text-slate-600">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sistem Aktif (UTC)</span>
            </div>

            {/* Token state banner */}
            <button 
              type="button" 
              onClick={toggleTokenSafety}
              className={`flex items-center gap-1 px-3 py-1.5 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tokenRequired 
                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                  : 'bg-emerald-50/70 text-emerald-800 border-emerald-100/80 hover:bg-emerald-100'
              }`}
              title="Güvenlik yetki token durumunu değiştirmek için tıklayın."
            >
              {tokenRequired ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />}
              {tokenRequired ? "Token Aktif" : "Token Esnek"}
            </button>

            {/* Manual Reload Button */}
            <button
              onClick={loadWorkspaceData}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer border border-slate-200/50"
              title="Verileri Sunucudan Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* 🚀 Error Block */}
      {generalError && (
        <div className="max-w-7xl mx-auto px-4 mt-4 w-full">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Sunucu İletişim Hatası</h4>
              <p className="text-xs text-rose-600 mt-1 leading-relaxed">{generalError}</p>
              <button 
                onClick={loadWorkspaceData}
                className="mt-3.5 px-4 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Yeniden Bağlanmayı Dene
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 Key Token Input panel for testing environment */}
      {authErrorOccurred && (
        <div className="max-w-7xl mx-auto px-4 mt-4 w-full animate-fade-in" id="auth-shield-card">
          <div className="p-5 bg-amber-50 border border-amber-200 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
                <ShieldAlert className="w-6 h-6 shrink-0" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-amber-800">Yönetici Token Doğrulaması Gerekiyor</h4>
                <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
                  İşlem gerçekleştirmek veya veri okumak için geçerli bir token sağlayın.
                </p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                  Test ortamındaki varsayılan token: <strong className="text-slate-600">test-admin-token-2026</strong>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Örn: test-admin-token-2026"
                className="px-3 py-2 text-xs bg-white border border-amber-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono w-60 text-slate-800"
              />
              <button
                onClick={() => {
                  setAdminToken(tokenInput);
                  setAuthErrorOccurred(false);
                  loadWorkspaceData();
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0 cursor-pointer"
              >
                Token'ı Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 Main Layout Grid */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 flex flex-col gap-6" id="dashboard-content">
        
        {/* Dynamic Multi-Tab Section Selector */}
        <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap gap-1" id="nav-tabs">
          <button
            onClick={() => setActiveTab("takip")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "takip" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Clock className="w-4 h-4" />
            Mesaî Giriş-Çıkış Takibi
          </button>

          <button
            onClick={() => setActiveTab("kasa")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "kasa" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Wallet className="w-4 h-4" />
            Kasa Ledger
          </button>

          <button
            onClick={() => setActiveTab("ortaklik")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "ortaklik" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Handshake className="w-4 h-4" />
            Hasan & Mustafa Hesaplaşma Cetveli
          </button>

          <button
            onClick={() => setActiveTab("personel")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "personel" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Users className="w-4 h-4" />
            Personel Kartları
          </button>

          <button
            onClick={() => setActiveTab("firmalar")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "firmalar" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Building2 className="w-4 h-4" />
            İş Ortağı Firmalar
          </button>

          <button
            onClick={() => setActiveTab("teklifler")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "teklifler" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Maket Teklifleri
          </button>

          <button
            onClick={() => setActiveTab("raporlar")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "raporlar" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Raporlama
          </button>

          <button
            onClick={() => setActiveTab("ayarlar")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer items-center ml-auto ${
              activeTab === "ayarlar" 
                ? "bg-indigo-600 text-white shadow-xs" 
                : "text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50"
            }`}
          >
            <Settings className="w-4 h-4" />
            Yönetim Ayarları
          </button>
        </div>

        {/* 🚀 Global Stats Overview Panel updated on data refresh */}
        {activeTab !== "raporlar" && (
          <StatsGrid firms={firms} personnel={personnel} records={records} />
        )}

        {/* 🚀 Active Tab Panes rendering based on state */}
        
        {/* TAB 1: GİRİŞ ÇIKIŞ TAKİP SİSTEMİ (ANA EKRAN) */}
        {activeTab === "takip" && (
          <div className="space-y-6 animate-fade-in" id="pane-tracking">
            
            {/* 🌐 Ofis Wi-Fi & Çevrimdışı Senkronizasyon Yönetim Paneli */}
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-150/85 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm font-sans">
              
              {/* Wi-Fi SSID Simulation */}
              <div className="flex items-center gap-3.5 w-full md:w-auto">
                <div className={`p-3 rounded-2xl ${wifiSSID === "Ekinoks_Ofis_Wifi" ? "bg-emerald-100 text-emerald-850" : "bg-rose-100 text-rose-850"}`}>
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400">Ofis Ağ Denetimi</label>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-extrabold text-slate-800">
                      {wifiSSID === "Ekinoks_Ofis_Wifi" ? "Ekinoks_Ofis_Wifi" : "Mobil Veri / Farklı Ağ"}
                    </span>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md ${
                      wifiSSID === "Ekinoks_Ofis_Wifi" 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                        : "bg-rose-50 text-rose-700 border border-rose-100"
                    }`}>
                      {wifiSSID === "Ekinoks_Ofis_Wifi" ? "Giriş/Çıkış Açık ✅" : "Çevrimdışı Kısıtlı 🔒"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs md:max-w-md">
                    Personel giriş-çıkış işlemleri sadece <strong>'Ekinoks_Ofis_Wifi'</strong> ağına bağlıyken yetkilendirilir.
                  </p>
                </div>
              </div>

              {/* SSID Simulation Switch Actions */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                <div className="bg-white border border-slate-200 rounded-xl p-1 flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setWifiSSID("Ekinoks_Ofis_Wifi");
                      triggerToast("Ekinoks Ofis Wi-Fi ağına simüle bağlantı yapıldı.");
                    }}
                    className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                      wifiSSID === "Ekinoks_Ofis_Wifi"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    Ofis Wi-Fi Bağlan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWifiSSID("Mobil_Veri");
                      triggerToast("Ağ bağlantısı koptu. Mobil veri/hücresel şebekeye geçildi.");
                    }}
                    className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                      wifiSSID !== "Ekinoks_Ofis_Wifi"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    Ağdan Ayrıl
                  </button>
                </div>

                {/* LocalStorage Sync and Server Down Status */}
                <div className="p-2.5 bg-white border border-slate-150 rounded-xl flex items-center gap-3">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-[10px] font-bold text-slate-400">SUNUCU:</span>
                      <span className={`w-2 h-2 rounded-full ${isServerOffline ? "bg-amber-500 animate-pulse animate-duration-1000" : "bg-emerald-500 animate-pulse animate-duration-1000"}`} />
                      <span className="text-[11px] font-extrabold text-slate-700">
                        {isServerOffline ? "Sunucu Kapalı" : "Sunucu Aktif"}
                      </span>
                    </div>
                    
                    {/* Queue length counts */}
                    <div className="text-[9.5px] text-slate-400 mt-0.5 font-mono">
                      Yığın: {getOfflineCheckIns().length + getOfflineCheckOuts().length} Kayıt Bekliyor
                    </div>
                  </div>

                  {(getOfflineCheckIns().length > 0 || getOfflineCheckOuts().length > 0) ? (
                    <button
                      type="button"
                      onClick={synchronizeOfflineRecords}
                      disabled={syncingOfflineRecords}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-extrabold text-[11px] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer animate-pulse"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncingOfflineRecords ? "animate-spin" : ""}`} />
                      Şimdi Eşitle
                    </button>
                  ) : (
                    <div className="px-2.5 py-1.5 bg-slate-50 text-slate-450 border border-slate-100 rounded-lg text-[10.5px] font-bold">
                      Eşitlendi ✓
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Add New Check-In Log Form */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs h-fit" id="checkin-creation-card">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Play className="w-4 h-4 fill-emerald-100" />
                  </div>
                  <h2 className="text-base font-bold text-slate-800 tracking-tight">Yeni Mesaî Giriş Kaydı</h2>
                </div>

                <form onSubmit={handleCheckInSubmit} className="space-y-4" id="checkin-form">
                  
                  {/* Select Personnel Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">PERSONEL SEÇİMİ *</label>
                    <select
                      value={selectedPersonnelId}
                      onChange={(e) => setSelectedPersonnelId(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 font-medium"
                      required
                    >
                      <option value="">-- Personel Seçiniz --</option>
                      {personnel.map(p => {
                        // Check if this personnel has an unfinished session
                        const isBusy = records.some(r => r.personnelId === p.id && r.checkOut === null);
                        return (
                          <option key={p.id} value={p.id} disabled={isBusy}>
                            {p.fullName} ({p.role}) {isBusy ? " - Mesaîsi Açık!" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Check-In Time (DateTime Local) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">GİRİŞ TARİHİ VE SAATİ *</label>
                    <input
                      type="datetime-local"
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 font-medium"
                      required
                    />
                  </div>

                  {/* Optional Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">EKLENECEK NOT / PLANLANAN OPERASYON</label>
                    <textarea
                      value={recordNote}
                      onChange={(e) => setRecordNote(e.target.value)}
                      placeholder="Örn: Hafta sonu beton dökümü denetimi ve hakediş tespiti."
                      rows={2}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 font-medium resize-none"
                    />
                  </div>

                  {wifiSSID !== "Ekinoks_Ofis_Wifi" && (
                    <div className="p-3 bg-rose-50 border border-rose-100/70 text-rose-800 rounded-xl text-[11px] leading-relaxed flex flex-col gap-0.5 font-sans">
                      <span className="font-extrabold text-[11.5px] text-rose-900 flex items-center gap-1">🔒 Ofis Dışı Ağ Algılandı</span>
                      <p>Giriş ve çıkış işlemleri güvenlik amacıyla kilitlenmiştir. Lütfen üstteki panelden <strong>'Ekinoks_Ofis_Wifi'</strong> ağına bağlanın.</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={recordActionLoading || wifiSSID !== "Ekinoks_Ofis_Wifi"}
                    id="submit-checkin-btn"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs disabled:bg-slate-350 disabled:cursor-not-allowed"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    {recordActionLoading ? "Mesai Açılıyor..." : (wifiSSID !== "Ekinoks_Ofis_Wifi" ? "Mesaî Girişi Yetkilendirilmedi" : "Mesaî Girişini Başlat")}
                  </button>
                </form>

                {/* Info guidance */}
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 leading-relaxed">
                  💡 <strong>Akıllı Koruma:</strong> Aktif, kapatılmamış mesaisi olan personele ikinci bir mesai başlatılamaz. Önceki mesainin çıkışı verilmelidir.
                </div>
              </div>

              {/* 🚀 Core Tracking Table (Single Row View) */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col" id="tracking-logs-card">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 tracking-tight">Mesaî Takip Çizelgesi</h2>
                    <p className="text-xs text-slate-400">Tüm personellerin giriş-çıkış zamanları ve hesaplanan gün-saat raporu</p>
                  </div>
                  
                  {/* Local export Excel-friendly CSV */}
                  <button
                    onClick={() => {
                      const headers = ["Personel", "Firma", "Giriş Zamanı", "Çıkış Zamanı", "Toplam Süre", "Not"];
                      const rows = records.map(r => {
                        const pName = personnel.find(p => p.id === r.personnelId)?.fullName || "Bilinmeyen";
                        const fName = r.firmId === "ofis" ? "Ofis İçi Çalışma" : (firms.find(f => f.id === r.firmId)?.name || "Bilinmeyen");
                        const duration = calculateAndFormatDuration(r.checkIn, r.checkOut);
                        return [
                          pName,
                          fName,
                          r.checkIn,
                          r.checkOut || "Aktif",
                          duration,
                          r.note || ""
                        ];
                      });
                      const csvContent = "data:text/csv;charset=utf-8," 
                        + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", "mesai-takip-raporu.csv");
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>CSV Raporu İndir</span>
                  </button>
                </div>

                {records.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4 border-2 border-dashed border-slate-100 rounded-2xl">
                    <Clock className="w-12 h-12 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-500">Kayıtlı Mesaî Bulunmuyor</p>
                    <p className="text-xs text-slate-400 mt-1">Sol taraftaki paneli kullanarak yeni bir personel giriş hareketi kaydedin.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto" id="records-table-container">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100">
                          <th className="py-3 px-4">PERSONEL</th>
                          <th className="py-3 px-4">FİRMA</th>
                          <th className="py-3 px-4">GİRİŞ / ÇIKIŞ ZAMANLARI</th>
                          <th className="py-3 px-4 text-center">NET ÇALIŞMA SÜRESİ</th>
                          <th className="py-3 px-4 text-right">İŞLEMLER</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...records].reverse().map((record) => {
                          const person = personnel.find(p => p.id === record.personnelId);
                          const firm = firms.find(f => f.id === record.firmId);
                          const isCurrentlyWorking = record.checkOut === null;
                          
                          // Custom color class for background matching
                          const rowBg = isCurrentlyWorking ? "bg-emerald-50/20" : "hover:bg-slate-50/50";

                          return (
                            <tr key={record.id} className={`${rowBg} transition-all`} id={`record-row-${record.id}`}>
                              {/* Personnel Info */}
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-800 text-sm">{person ? person.fullName : "Bilinmeyen Personel"}</div>
                                <div className="text-[10px] text-slate-400 uppercase mt-0.5">{person ? person.role : "-"}</div>
                              </td>

                              {/* Firm Info */}
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-700">
                                  {record.firmId === "ofis" ? "Ofis İçi Çalışma" : (firm ? firm.name : "Bilinmeyen Firma")}
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase mt-0.5">
                                  {record.firmId === "ofis" ? "Genel Ofis" : (firm ? firm.sector : "-")}
                                </div>
                              </td>

                              {/* Dates & Times (Side by side inside the row layout) */}
                              <td className="py-3.5 px-4">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 text-slate-700">
                                    <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
                                    <span>Giriş: <strong className="font-medium text-slate-800">{formatTurkishDateTime(record.checkIn)}</strong></span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-slate-500">
                                    <span className="inline-block w-1.5 h-1.5 bg-slate-300 rounded-full shrink-0" />
                                    <span>
                                      Çıkış: {isCurrentlyWorking ? (
                                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[9px] rounded-md animate-pulse">
                                          DEVAM EDİYOR
                                        </span>
                                      ) : (
                                        <strong className="font-medium text-slate-700">{formatTurkishDateTime(record.checkOut)}</strong>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Computed formatted duration (e.g. "X Gün, Y Saat") */}
                              <td className="py-3.5 px-4 text-center font-mono">
                                <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                                  isCurrentlyWorking 
                                    ? "bg-slate-100 text-slate-500" 
                                    : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                                }`}>
                                  {calculateAndFormatDuration(record.checkIn, record.checkOut)}
                                </div>
                              </td>

                              {/* Action Buttons */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {isCurrentlyWorking ? (
                                    <button
                                      type="button"
                                      id={`checkout-btn-${record.id}`}
                                      onClick={() => openCheckOutModal(record)}
                                      disabled={wifiSSID !== "Ekinoks_Ofis_Wifi"}
                                      className={`px-3 py-1 font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer ${
                                        wifiSSID === "Ekinoks_Ofis_Wifi"
                                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                          : "bg-slate-300 text-slate-500 cursor-not-allowed"
                                      }`}
                                      title={wifiSSID === "Ekinoks_Ofis_Wifi" ? "Mesaî Çıkışı Yap" : "Çıkış yapmak için 'Ekinoks_Ofis_Wifi' ağına bağlı olmalısınız."}
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Çıkış Ver
                                    </button>
                                  ) : null}

                                  <button
                                    type="button"
                                    id={`delete-record-btn-${record.id}`}
                                    onClick={() => handleDeleteRecord(record.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Kaydı Tamamen Sil"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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

            {/* Check-Out Dialog overlay when checkOut button is clicked */}
            {checkoutItem && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-50 animate-fade-in" id="checkout-modal">
                  
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-950 text-base">Mesaî Sonlandırma İşlemi</h3>
                    <button 
                      onClick={() => setCheckoutItem(null)} 
                      className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                    >
                      Kapat ✕
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 mb-3 text-xs leading-relaxed">
                      <div className="text-slate-400 uppercase font-semibold">PERSONEL</div>
                      <div className="font-bold text-slate-800 text-sm">
                        {personnel.find(p => p.id === checkoutItem.personnelId)?.fullName}
                      </div>

                      <div className="text-slate-400 uppercase font-semibold mt-2.5">GİRİŞ TARİH/SAATİ</div>
                      <div className="font-medium text-slate-700">
                        {formatTurkishDateTime(checkoutItem.checkIn)}
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleCheckOutSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">MESAÎ BİTİŞ (ÇIKIŞ) ZAMANI *</label>
                      <input
                        type="datetime-local"
                        value={checkoutTime}
                        onChange={(e) => setCheckoutTime(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">İŞ SONU YAPILAN BEYAN / NOTLAR</label>
                      <textarea
                        value={checkoutNote}
                        onChange={(e) => setCheckoutNote(e.target.value)}
                        placeholder="Örn: Operasyon tamamlandı. Firmanın hakediş formu kontrol edildi."
                        rows={3}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium resize-none"
                      />
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setCheckoutItem(null)}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        İptal Et
                      </button>
                      
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                      >
                        Çıkış Kaydını Tamamla
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: KASA LEDGER */}
        {activeTab === "kasa" && (
          <div className="space-y-6 animate-fade-in" id="pane-kasa">
            
            {/* Currency ledger banners */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* GBP Ledger banner */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-3xl text-white shadow-md relative overflow-hidden">
                <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-white/5 font-extrabold text-9xl">£</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">GBP KASA LEDGER</span>
                  <Wallet className="w-5 h-5 text-indigo-300" />
                </div>
                <div className="mt-4">
                  <h3 className="text-3xl font-extrabold tracking-tight">
                    £{ledgerSummary.gbpNet.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <p className="text-xs text-indigo-200 mt-1">Toplam Net İngiliz Sterlini Döviz Bakiyesi</p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-emerald-300 font-medium">▲ Toplam Gelir</span>
                    <strong className="text-sm font-semibold">£{ledgerSummary.gbpIncome.toLocaleString("tr-TR")}</strong>
                  </div>
                  <div>
                    <span className="block text-rose-300 font-medium">▼ Toplam Gider</span>
                    <strong className="text-sm font-semibold">£{ledgerSummary.gbpExpense.toLocaleString("tr-TR")}</strong>
                  </div>
                </div>
              </div>

              {/* TRY Ledger banner */}
              <div className="bg-gradient-to-br from-blue-900 to-slate-900 p-6 rounded-3xl text-white shadow-md relative overflow-hidden">
                <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-white/5 font-extrabold text-9xl">₺</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">TRY KASA LEDGER</span>
                  <Wallet className="w-5 h-5 text-blue-300" />
                </div>
                <div className="mt-4">
                  <h3 className="text-3xl font-extrabold tracking-tight">
                    ₺{ledgerSummary.tryNet.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <p className="text-xs text-blue-200 mt-1">Toplam Net Türk Lirası Bakiyesi</p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-emerald-300 font-medium">▲ Toplam Gelir</span>
                    <strong className="text-sm font-semibold">₺{ledgerSummary.tryIncome.toLocaleString("tr-TR")}</strong>
                  </div>
                  <div>
                    <span className="block text-rose-300 font-medium">▼ Toplam Gider</span>
                    <strong className="text-sm font-semibold">₺{ledgerSummary.tryExpense.toLocaleString("tr-TR")}</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* Layout grid for adding action and transaction search */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Add transaction record form */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs h-fit" id="tx-add-card">
                
                <div className="flex items-center gap-2 mb-4">
                  <PlusCircle className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-base font-bold text-slate-800 tracking-tight">Deftere Para Hareketi Ekle</h2>
                </div>

                <form onSubmit={handleAddTransactionSubmit} className="space-y-4" id="ledger-form">
                  
                  {/* Transaction Type Picker */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTxType("INCOME")}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        txType === "INCOME" 
                          ? "bg-white text-emerald-700 shadow-xs" 
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      ▲ Gelir (Hakediş vb.)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType("EXPENSE")}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        txType === "EXPENSE" 
                          ? "bg-white text-rose-700 shadow-xs" 
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      ▼ Gider (Maaş vb.)
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Amount Input */}
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">MİKTAR *</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Örn: 1500"
                        value={txAmount}
                        onChange={(e) => setTxAmount(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold"
                        required
                      />
                    </div>

                    {/* Currency Input */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">BAZ *</label>
                      <select
                        value={txCurrency}
                        onChange={(e) => setTxCurrency(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold"
                        required
                      >
                        <option value="GBP">GBP (£)</option>
                        <option value="TRY">TRY (₺)</option>
                      </select>
                    </div>
                  </div>

                  {/* TRY exchange rate box if active */}
                  {txCurrency === "TRY" && (
                    <div className="animate-fade-in p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold text-slate-500">DÖVİZ KURU DETAYI (1 GBP = ? TRY) *</label>
                        <button
                          type="button"
                          onClick={handleFetchExchangeRate}
                          disabled={isFetchingRate}
                          className="text-[9px] font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {isFetchingRate ? "Çekiliyor..." : "🔄 Güncel Kuru Çek"}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="Örn: 43.15"
                        value={txExchangeRate}
                        onChange={(e) => setTxExchangeRate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 font-mono font-bold"
                        required
                      />
                      {txExchangeRate && !isNaN(parseFloat(txExchangeRate)) && txAmount && !isNaN(parseFloat(txAmount)) && (
                        <span className="text-[10px] text-indigo-600 block mt-1 tracking-tight font-medium">
                          💡 Karşılık düşen bakiye: <strong>£{(parseFloat(txAmount) / parseFloat(txExchangeRate)).toFixed(2)} GBP</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Linked Firm Choice */}
                  {txType !== "EXPENSE" && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">İLİŞKİLİ İŞ ORTAĞI (FİRMA)</label>
                      <select
                        value={txFirmId}
                        onChange={(e) => setTxFirmId(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
                      >
                        <option value="">-- Bağımsız Cari Hareket (Firma Yok) --</option>
                        {firms.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">ÖDEME METODU / ORTAK KASA TRANSFERİ *</label>
                    <select
                      value={txPaymentMethod}
                      onChange={(e) => setTxPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold"
                      required
                    >
                      <option value="Havale">Havale (Banka Havalesi)</option>
                      <option value="Nakit">Nakit (Elden Nakit)</option>
                    </select>
                  </div>

                  {/* Transaction Category - Dynamic and Enhanced */}
                  <div className="space-y-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">KATEGORİ & SEÇENEKLER *</label>
                    
                    {txType === "INCOME" ? (
                      <div>
                        <select
                          value={txCategory}
                          onChange={(e) => setTxCategory(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold"
                          required
                        >
                          <option value="Hakediş">Hakediş (Alacak Kaydı)</option>
                          <option value="Tahsilat">Tahsilat (Giriş)</option>
                          <option value="Hakediş Ödemesi">Hakediş Ödemesi</option>
                          <option value="Diğer Gelir">Diğer Gelir</option>
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Expense Type Group Selector */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">GİDER GRUBU</label>
                          <select
                            value={txCategoryType}
                            onChange={(e) => setTxCategoryType(e.target.value as any)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold"
                          >
                            <option value="altyapi">Ofis Altyapı Giderleri</option>
                            <option value="personel">Personel Giderleri</option>
                            <option value="kar_cekimi">Ortaklar Kâr Çekimi (Nakit Çekim)</option>
                            <option value="diger">Diğer Giderler / Genel</option>
                          </select>
                        </div>

                        {/* Personel Gideri - Personnel details */}
                        {txCategoryType === "personel" && (
                          <div className="space-y-2 p-2.5 bg-white rounded-xl border border-slate-100 animate-slide-up">
                            <div>
                              <label className="block text-[10px] font-bold text-indigo-600 mb-1">GİDERİN ÖDENDİĞİ PERSONEL *</label>
                              <select
                                value={txPersonnelId}
                                onChange={(e) => setTxPersonnelId(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
                                required
                              >
                                <option value="">-- Personel Seçiniz --</option>
                                {personnel.map(p => (
                                  <option key={p.id} value={p.id}>{p.fullName} ({p.role})</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-indigo-600 mb-1">ÖDEME TÜRÜ *</label>
                              <select
                                value={txPersonnelType}
                                onChange={(e) => setTxPersonnelType(e.target.value as any)}
                                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-700 font-bold"
                              >
                                <option value="Maaş">Maaş Ödemesi</option>
                                <option value="Avans">Avans Ödemesi</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {/* Altyapi Gideri sub-groups */}
                        {txCategoryType === "altyapi" && (
                          <div className="space-y-3 p-2.5 bg-white rounded-xl border border-slate-100 animate-slide-up">
                            <div>
                              <label className="block text-[10px] font-bold text-amber-600 mb-1">ALTYAPI GİDER BAŞLIĞI *</label>
                              <select
                                value={txOfficeSubcategory}
                                onChange={(e) => {
                                  setTxOfficeSubcategory(e.target.value);
                                  setTxCategory("Ofis Genel Gideri");
                                }}
                                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-700 font-bold"
                              >
                                <option value="Market Malzemesi">Market Malzemesi</option>
                                <option value="Elektrik">Elektrik Faturası</option>
                                <option value="Kira">Ofis Kirası</option>
                                <option value="İnternet">İnternet & Teknoloji</option>
                                <option value="Su">Su Faturası</option>
                                <option value="Seyahat">Seyahat / Ulaşım / Yakıt</option>
                                <option value="Diğer">Diğer Ofis Genel Gideri</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-indigo-600 mb-1">HARCAMAYI CEBİNDEN ÖDEYEN *</label>
                              <select
                                value={txExpensePaidBy}
                                onChange={(e) => setTxExpensePaidBy(e.target.value as any)}
                                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-700 font-bold"
                              >
                                <option value="Kasadan">Ortak Kasa (Kasadan Ödeme)</option>
                                <option value="Hasan">Hasan (Şahsi Cebinden Ödedi)</option>
                                <option value="Mustafa">Mustafa (Şahsi Cebinden Ödedi)</option>
                              </select>
                            </div>

                            <span className="text-[9px] text-slate-400 block mt-1">💡 Bu harcama <strong>Ofis Genel Gideri</strong> olarak ortak hesaba kaydedilir. Şahsi seçimler ortak hakedişlerde iade bakiyesi olarak izlenir.</span>
                          </div>
                        )}

                        {/* Ortaklar Kar Cekimi partners */}
                        {txCategoryType === "kar_cekimi" && (
                          <div className="p-2.5 bg-white rounded-xl border border-slate-100 animate-slide-up">
                            <label className="block text-[10px] font-bold text-indigo-600 mb-1">NAKİT ÇEKEN ORTAK *</label>
                            <select
                              value={txPartnerId}
                              onChange={(e) => setTxPartnerId(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-700 font-extrabold"
                            >
                              <option value="Hasan">Hasan</option>
                              <option value="Mustafa">Mustafa</option>
                            </select>
                            <span className="text-[9px] text-indigo-600 block mt-1 font-medium">⚠️ Bu harcama çeken ortağın bireysel kâr payından şahsi nakit çekimi olarak sayılacaktır.</span>
                          </div>
                        )}

                        {/* Diger Giderler free-text category */}
                        {txCategoryType === "diger" && (
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">SERBEST GİDER KATEGORİSİ *</label>
                            <input
                              type="text"
                              value={txCategory}
                              onChange={(e) => setTxCategory(e.target.value)}
                              placeholder="Örn: Maket Sarf Malzemesi"
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
                              required
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tx Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">İŞLEM TARİHİ *</label>
                    <input
                      type="date"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
                      required
                    />
                  </div>

                  {/* Description Info */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">DETAYLI AÇIKLAMA *</label>
                    <textarea
                      value={txDescription}
                      onChange={(e) => setTxDescription(e.target.value)}
                      placeholder="Örn: Kadıköy Konut Projesi maketi lazer kesim pleksiglas levha faturası."
                      rows={3}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium resize-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={txSubmitLoading}
                    id="submit-transaction-btn"
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
                  >
                    {txSubmitLoading ? "Kaydediliyor..." : "İşlemi Deftere Kaydet"}
                  </button>
                </form>
              </div>

              {/* Transactions List */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col" id="tx-history-card">
                
                {/* Search / Filters on top */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 tracking-tight">Kasa Ledger Hareketleri ({filteredTxs.length})</h2>
                    <p className="text-xs text-slate-400">Resmi hakedişler, masraf beyanları ve operasyonel cari takibi</p>
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={txFilterType}
                      onChange={(e) => setTxFilterType(e.target.value as any)}
                      className="px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                    >
                      <option value="ALL">Filtre Yok</option>
                      <option value="INCOME">Yalnızca Gelir</option>
                      <option value="EXPENSE">Yalnızca Gider</option>
                    </select>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Gelir/Gider ara..."
                        value={txSearchQuery}
                        onChange={(e) => setTxSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 w-44 font-medium text-slate-700 hover:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {filteredTxs.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16 border-2 border-dashed border-slate-100 rounded-2xl">
                    <Wallet className="w-12 h-12 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-500">Defter Kaydı Bulunamadı</p>
                    <p className="text-xs text-slate-400 mt-1">Belirttiğiniz arama veya filtre kriterlerinde bir işlem kaydı bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[440px] overflow-y-auto pr-1">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-100">
                          <th className="py-2 px-3">TARİH</th>
                          <th className="py-2 px-3">AÇIKLAMA / KATEGORİ</th>
                          <th className="py-2 px-3 text-right">TUTAR</th>
                          <th className="py-2 px-3 text-right">EYLEM</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...filteredTxs].reverse().map((tx) => {
                          const isInc = tx.type === "INCOME";
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/50 transition-all font-medium text-slate-700" id={`tx-row-${tx.id}`}>
                              <td className="py-3 px-3 font-mono opacity-85 shrink-0 whitespace-nowrap">
                                {new Date(tx.date).toLocaleDateString("tr-TR")}
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-800 leading-normal">{tx.description}</div>
                                <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                                  <span className="inline-block text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">
                                    {tx.category}
                                  </span>
                                  {tx.firmId && (() => {
                                    const associatedFirm = firms.find(f => f.id === tx.firmId);
                                    return (
                                      <span className="inline-block text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded-md">
                                        🏢 {associatedFirm ? associatedFirm.name : `Firma (ID: ${tx.firmId})`}
                                      </span>
                                    );
                                  })()}
                                  {tx.paymentMethod && (
                                    <span className="inline-block text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded-md uppercase">
                                      💳 {tx.paymentMethod}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className={`py-3 px-3 text-right font-bold text-sm whitespace-nowrap font-mono ${isInc ? "text-emerald-600" : "text-rose-600"}`}>
                                {isInc ? "▲ +" : "▼ -"} {tx.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {tx.currency === "GBP" ? "£" : "₺"}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  type="button"
                                  id={`delete-tx-btn-${tx.id}`}
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Defter Kaydını Sil"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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
        )}

        {/* TAB 3: ORTAKLIK DEĞERLENDİRME VE KÂR DAĞITIMI */}
        {activeTab === "ortaklik" && (() => {
          const uMonths = Array.from(new Set(transactions.map(t => t.date.slice(0, 7)))).sort().reverse();
          const calc = getPartnershipCalculations(pSelectedMonth);

          // Categorized transactions for audit log
          const periodTxs = pSelectedMonth === "ALL"
            ? transactions
            : transactions.filter(t => t.date.slice(0, 7) === pSelectedMonth);

          const incomeTxs = periodTxs.filter(t => t.type === "INCOME");
          const sharedExpenseTxs = periodTxs.filter(t => 
            t.type === "EXPENSE" &&
            t.category !== "Ortaklar Kâr Çekimi"
          );
          const hasanDrawTxs = periodTxs.filter(t => 
            t.type === "EXPENSE" &&
            t.category === "Ortaklar Kâr Çekimi" &&
            (t.partnerId === "Hasan" || (t.description && t.description.includes("Hasan")))
          );
          const mustafaDrawTxs = periodTxs.filter(t => 
            t.type === "EXPENSE" &&
            t.category === "Ortaklar Kâr Çekimi" &&
            (t.partnerId === "Mustafa" || (t.description && t.description.includes("Mustafa")))
          );

          // Converter internally
          const convertToGbp = (t: Transaction) => {
            if (t.currency === "GBP") return t.amount;
            if (t.currency === "TRY") {
              const rate = t.exchangeRate || 43.15;
              return Math.round((t.amount / rate) * 100) / 100;
            }
            return t.amount;
          };

          return (
            <div className="space-y-6 animate-fade-in" id="pane-partnership">
              
              {/* Filter and PDF generation header bar */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Handshake className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">Hasan & Mustafa Hesaplaşma Cetveli</h2>
                    <p className="text-xs text-slate-400">Ortaklar arası şeffaf kâr dağıtımı, operasyonel cari takip ve devir motoru</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Month selection dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">HESAP DÖNEMİ:</span>
                    <select
                      value={pSelectedMonth}
                      onChange={(e) => setPSelectedMonth(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="ALL">Tüm Zamanlar (Kümülatif)</option>
                      {uMonths.map(m => (
                        <option key={m} value={m}>{m} Dönemi</option>
                      ))}
                    </select>
                  </div>

                  {/* Generate PDF Button */}
                  <button
                    onClick={() => generatePartnershipStatementPDF(pSelectedMonth, calc)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Aylık Rapor Oluştur / PDF Al</span>
                  </button>

                  {/* Print / Wet Signature Button */}
                  <button
                    onClick={() => handlePrintReport("printable-partnership-contract")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Islak İmzalı Rapor Yazdır (A4)</span>
                  </button>
                </div>
              </div>

              {/* Informative Constitution Advice */}
              <div className="p-4 bg-indigo-50/50 text-indigo-950 text-xs rounded-2xl border border-indigo-100/60 leading-relaxed flex items-start gap-3 shadow-2xs">
                <svg className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="space-y-1">
                  <span className="font-bold block text-indigo-950">Ofis Ortaklık Anayasası ve Hesaplaşma Dağıtım Kuralları:</span>
                  <p className="text-[11px] text-indigo-900">
                    Sistem, her ay için kademeli ve şeffaf 4 adımlı hesaplaşma algoritmasını çalıştırır. Tüm hakediş gelirleri (%50 - %50) ortak kazanç havuzuna aktarılır. Genel ofis altyapı ve personel giderleri ortak gider havuzuna yansıtılarak her iki ortağın payından %50 oranında otomatik olarak düşülür. Ortakların şahsi veya nakit kazanç kâr çekimleri kendi hanelerine borç kaydedilir. Herhangi bir ortağın fazla çekimi varsa, bu kalan bakiye bir sonraki aya <strong>Geçmiş Aydan Devreden Borç/Alacak</strong> olarak otomatik aktarılır ve hesaplamaya dahil edilir.
                  </p>
                </div>
              </div>

              {/* THE 4 STEPS HIERARCHICAL CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* STEP A */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-sm uppercase tracking-wider">A. ADIM</span>
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="block text-xs font-bold text-slate-500">Toplam Kar Havuzu (Gelir)</span>
                    <span className="block text-lg font-black text-slate-800 font-mono">£{calc.activeRevenue.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3 border-t border-slate-50 pt-2 leading-relaxed">
                    İlgili dönemde kasaya giren hakediş ve tahsilatların GBP toplamı.
                  </p>
                </div>

                {/* STEP B */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-sm uppercase tracking-wider">B. ADIM</span>
                      <TrendingDown className="w-4 h-4 text-rose-500" />
                    </div>
                    <span className="block text-xs font-bold text-slate-500">Ortak Altyapı Giderleri</span>
                    <span className="block text-lg font-black text-slate-800 font-mono">£{calc.activeOperatingExpenses.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3 border-t border-slate-50 pt-2 leading-relaxed">
                    Kira, maaş, elektrik vb. ortak giderler (%50-%50 hisse ile paylaşılır).
                  </p>
                </div>

                {/* STEP C */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-sm uppercase tracking-wider">C. ADIM</span>
                      <Users className="w-4 h-4 text-amber-500" />
                    </div>
                    <span className="block text-xs font-bold text-slate-500">Dönem İçi Şahsi Çekimler</span>
                    <div className="space-y-0.5 mt-1 font-mono text-[11px] font-bold text-slate-700">
                      <div className="flex justify-between">
                        <span>Hasan:</span>
                        <span>£{calc.activeHasanWithdrawals.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Mustafa:</span>
                        <span>£{calc.activeMustafaWithdrawals.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3 border-t border-slate-50 pt-1.5 leading-relaxed">
                    Ortakların kasadan yaptığı şahsi kazanç ve kâr çekimlerinin toplamı.
                  </p>
                </div>

                {/* STEP D */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-sm uppercase tracking-wider">D. ADIM</span>
                      <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                    </div>
                    <span className="block text-xs font-bold text-slate-500">Önceki Aydan Devirler</span>
                    <div className="space-y-0.5 mt-1 font-mono text-[11px] font-bold text-slate-700">
                      <div className="flex justify-between">
                        <span>Hasan Devir:</span>
                        <span className={calc.prevHasanBalance >= 0 ? "text-emerald-600" : "text-rose-600"}>£{calc.prevHasanBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mustafa Devir:</span>
                        <span className={calc.prevMustafaBalance >= 0 ? "text-emerald-600" : "text-rose-600"}>£{calc.prevMustafaBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3 border-t border-slate-50 pt-1.5 leading-relaxed">
                    Önceki dönemlerin zincirleme bakiye borç/alacak devir bakiyesi.
                  </p>
                </div>

              </div>

              {/* MUTABAKAT VE HESAP KESİM RAPORU ÇIKTISI (Step D Highlight Alert Box) */}
              <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <span className="inline-block px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 font-extrabold text-[8px] rounded-full uppercase tracking-widest border border-indigo-500/30">MÜŞTEREK MUTABAKAT VE BAĞLAYICI MAHKEME CEZALI HÜKMÜ</span>
                  <p className="text-xs text-slate-450 leading-relaxed">
                    Seçilen dönem ({pSelectedMonth === "ALL" ? "Tüm Zamanlar" : `${pSelectedMonth} Ayı`}) kümülatif bakiye, kişisel kâr çekimleri ve geçmiş aylar bakiye devirlerini baz alan otomatik hesaplaşma mutabakat hakediş sonucu:
                  </p>
                  <p className="text-lg sm:text-xl font-black text-indigo-400 tracking-tight font-sans">
                    {calc.debtMessage}
                  </p>
                </div>

                {/* Signatures graphics */}
                <div className="flex gap-4 self-center lg:self-auto text-slate-400 shrink-0 text-center font-bold text-[9px] uppercase tracking-wide">
                  <div className="px-4 py-3 bg-slate-850 rounded-xl border border-slate-800 min-w-28 flex flex-col items-center justify-between gap-3">
                    <span className="text-slate-350">Hasan</span>
                    <div className="h-5 w-16 border-b border-dashed border-slate-750"></div>
                    <span className="text-[8px] text-slate-400 font-normal">Kurucu Ortak (İmza)</span>
                  </div>
                  <div className="px-4 py-3 bg-slate-850 rounded-xl border border-slate-800 min-w-28 flex flex-col items-center justify-between gap-3">
                    <span className="text-slate-350">Mustafa</span>
                    <div className="h-5 w-16 border-b border-dashed border-slate-750"></div>
                    <span className="text-[8px] text-slate-400 font-normal">Kurucu Ortak (İmza)</span>
                  </div>
                </div>
              </div>

              {/* HASAN & MUSTAFA ORTAKLIK EŞİTLEME FORMÜLÜ KARTI */}
              <div className="bg-gradient-to-tr from-amber-550/5 via-amber-600/10 to-transparent border border-amber-500/20 p-5 rounded-2xl shadow-3xs space-y-3">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-2 border border-amber-500/25 bg-amber-500/10 text-amber-700 font-bold rounded-lg text-xs leading-none">
                    Eşitleme Formülü
                  </span>
                  <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">
                    Ortaklar Arası Nihai Bakiye Sıfırlama ve Nakit Ödeme Önerisi
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-white/75 border border-amber-500/10 rounded-xl space-y-1">
                    <span className="text-slate-400 font-bold text-[10px] block">HASAN CARİ BAKİYE</span>
                    <span className="block font-mono text-sm font-black text-indigo-900">
                      £{calc.hasanBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[9px] text-slate-400 block font-normal leading-tight">
                      (Brüt Pay: £{(calc.activeShare).toLocaleString()} - Çekim: £{calc.activeHasanWithdrawals.toLocaleString()} + Önceki: £{calc.prevHasanBalance.toLocaleString()})
                    </span>
                  </div>

                  <div className="p-3 bg-white/75 border border-amber-500/10 rounded-xl space-y-1">
                    <span className="text-slate-400 font-bold text-[10px] block">MUSTAFA CARİ BAKİYE</span>
                    <span className="block font-mono text-sm font-black text-indigo-900">
                      £{calc.mustafaBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[9px] text-slate-400 block font-normal leading-tight">
                      (Brüt Pay: £{(calc.activeShare).toLocaleString()} - Çekim: £{calc.activeMustafaWithdrawals.toLocaleString()} + Önceki: £{calc.prevMustafaBalance.toLocaleString()})
                    </span>
                  </div>

                  <div className="p-3 bg-indigo-900 text-indigo-100 rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-[10px] text-indigo-300 block uppercase">Nakit Ödeme Mutabakat Tutarı</span>
                      <span className="block font-mono text-base font-black text-white mt-1">
                        £{calc.debtAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP
                      </span>
                    </div>
                    <span className="text-[9px] text-indigo-200 leading-tight block mt-2 font-mono">
                      Formül: |Hasan - Mustafa| / 2
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-white/50 border border-slate-150 rounded-xl text-xs text-slate-700 leading-relaxed">
                  {calc.debtAmount > 0 ? (
                    <p>
                      💵 <strong>Eşitleme Kararı:</strong> Ortaklar Hasan ve Mustafa'nın nihai hakediş ve cari bakiyelerini tamamen dengeleyerek sıfırlamak üzere; 
                      borçlu durumdaki <strong>{calc.debtor.toUpperCase()}</strong>, alacaklı durumdaki <strong>{calc.creditor.toUpperCase()}</strong> ortağa elden veya nakit havale yoluyla şahsen <strong>£{calc.debtAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP</strong> ödeme gerçekleştirmelidir. 
                      Bu ödeme yapıldığında her iki ortağın kalan devreden cari bakiyesi adil şekilde eşitlenmiş olacaktır.
                    </p>
                  ) : (
                    <p className="font-bold text-slate-500">
                      ⚖️ <strong>Eşitleme Kararı:</strong> İki ortağın da dönem hakediş, çekim ve devirleri kümülatif olarak bütünüyle dengededir. Şu an için herhangi bir elden nakit ödeme yapılmasına gerek yoktur.
                    </p>
                  )}
                </div>
              </div>

              {/* HESAP KESİM DETAY CETVELİ (TABLE) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Kademeli Ortaklık Hesap Kesim Cetveli</h3>
                    <p className="text-[11px] text-slate-400">Detaylı hesaplaşma algoritmasının formülsel ortak dağılım listesi</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-sm">CURRENCY: GBP (£)</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-[10px] text-slate-450 font-bold border-b border-slate-100 uppercase tracking-wider bg-slate-50/50">
                        <th className="p-3">Ortak Adı</th>
                        <th className="p-3">Dönem Brüt Payı (50%)</th>
                        <th className="p-3">Gider Hisse Payı (50%)</th>
                        <th className="p-3">Dönem Şahsi Çekimi (-)</th>
                        <th className="p-3">Geçmiş Dönem Devri (+/-)</th>
                        <th className="p-3 text-right">Net Dönem Bakiyesi (Nihai Cari)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium">
                      
                      {/* HASAN */}
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-bold text-slate-800 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                          Hasan
                        </td>
                        <td className="p-3 text-slate-500 font-mono">£{(calc.activeRevenue / 2).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-rose-500 font-mono">- £{(calc.activeOperatingExpenses / 2).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-slate-500 font-mono">£{calc.activeHasanWithdrawals.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                        <td className={`p-3 font-mono ${calc.prevHasanBalance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {calc.prevHasanBalance >= 0 ? "+" : ""} £{calc.prevHasanBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          <span className={calc.hasanBalance >= 0 ? "text-emerald-600" : "text-rose-600"}>
                            £{calc.hasanBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>

                      {/* MUSTAFA */}
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-bold text-slate-800 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                          Mustafa
                        </td>
                        <td className="p-3 text-slate-500 font-mono">£{(calc.activeRevenue / 2).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-rose-500 font-mono">- £{(calc.activeOperatingExpenses / 2).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-slate-500 font-mono">£{calc.activeMustafaWithdrawals.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                        <td className={`p-3 font-mono ${calc.prevMustafaBalance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {calc.prevMustafaBalance >= 0 ? "+" : ""} £{calc.prevMustafaBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          <span className={calc.mustafaBalance >= 0 ? "text-emerald-600" : "text-rose-600"}>
                            £{calc.mustafaBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>

                    </tbody>
                  </table>
                </div>

                {pSelectedMonth !== "ALL" && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl text-[10px] text-slate-400 font-medium leading-relaxed">
                    💡 <strong>Hesap Formül Notu:</strong> Nihai Cari Bakiye = (Dönem Brüt Payı - Gider Hisse Payı) - Dönem Şahsi Çekimi + Geçmiş Dönem Devri. 
                    Yukarıdaki formülün doğal hakediş hiyerarşi matrisi gereğince Hasan'ın bakiye hakkı <strong>£{calc.hasanBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} GBP</strong>, Mustafa'nın bakiye hakkı <strong>£{calc.mustafaBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} GBP</strong> olarak tespit edilmiştir. İki bakiye arasındaki fark eşitlenmek üzere mutabakat hükmüne bağlanmıştır.
                  </div>
                )}
              </div>

              {/* DENETİM VE KASA ŞEFFAFLIK DEFTERİ (TRANSACTIONS AUDIT LIST) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">V. İşlem ve Kasa Şeffaflık Defteri</h3>
                    <p className="text-[11px] text-slate-400">Seçilen dönemde ortaklık formüllerini besleyen tüm ham para hareketleri</p>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {periodTxs.length} Toplam İşlem
                  </span>
                </div>

                <div className="space-y-4">
                  
                  {/* CATEGORY 1: income pools */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wide bg-emerald-50 text-emerald-800 w-fit px-2 py-0.5 rounded-sm">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                      1. Adım Gelir Havuzu (Hakediş & Tahsilatlar - {incomeTxs.length} Adet)
                    </span>
                    {incomeTxs.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic pl-3">Bu dönemde kayıtlı kasa girişi bulunmamaktadır.</p>
                    ) : (
                      <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-left text-[11px] font-mono">
                          <thead>
                            <tr className="bg-slate-50 font-bold border-b border-slate-150 text-slate-450 uppercase text-[9px]">
                              <th className="p-2 w-24">Tarih</th>
                              <th className="p-2">Açıklama</th>
                              <th className="p-2 w-28">Kategori</th>
                              <th className="p-2 w-32 text-right">Orijinal Tutar</th>
                              <th className="p-2 w-32 text-right">GBP Karşılığı</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {incomeTxs.map(t => (
                              <tr key={t.id} className="hover:bg-slate-50/40">
                                <td className="p-2 text-slate-500">{t.date}</td>
                                <td className="p-2 text-slate-800 font-sans">{t.description}</td>
                                <td className="p-2 text-slate-550 font-sans">{t.category}</td>
                                <td className="p-2 text-right text-slate-600 font-bold">{t.amount.toLocaleString()} {t.currency}</td>
                                <td className="p-2 text-right text-emerald-600 font-bold">£{convertToGbp(t).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* CATEGORY 2: shared utility expenses */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wide bg-rose-50 text-rose-800 w-fit px-2 py-0.5 rounded-sm">
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                      2. Adım Ortak Altyapı Giderleri ({sharedExpenseTxs.length} Adet)
                    </span>
                    {sharedExpenseTxs.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic pl-3">Bu dönemde kayıtlı ortak ofis gideri bulunmamaktadır.</p>
                    ) : (
                      <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-left text-[11px] font-mono">
                          <thead>
                            <tr className="bg-slate-50 font-bold border-b border-slate-150 text-slate-450 uppercase text-[9px]">
                              <th className="p-2 w-24">Tarih</th>
                              <th className="p-2">Açıklama</th>
                              <th className="p-2 w-28">Kategori</th>
                              <th className="p-2 w-32 text-right">Orijinal Tutar</th>
                              <th className="p-2 w-32 text-right">GBP Karşılığı</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {sharedExpenseTxs.map(t => (
                              <tr key={t.id} className="hover:bg-slate-50/40">
                                <td className="p-2 text-slate-500">{t.date}</td>
                                <td className="p-2 text-slate-800 font-sans">{t.description}</td>
                                <td className="p-2 text-slate-550 font-sans">{t.category}</td>
                                <td className="p-2 text-right text-slate-600 font-bold">{t.amount.toLocaleString()} {t.currency}</td>
                                <td className="p-2 text-right text-rose-600 font-bold">- £{convertToGbp(t).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* CATEGORY 3: hasan draws */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wide bg-amber-50 text-amber-800 w-fit px-2 py-0.5 rounded-sm">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                      3. Adım Hasan Şahsi Kazanç Çekimleri ({hasanDrawTxs.length} Adet)
                    </span>
                    {hasanDrawTxs.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic pl-3">Hasan bu dönemde kasadan kâr çekimi yapmamıştır.</p>
                    ) : (
                      <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-left text-[11px] font-mono">
                          <thead>
                            <tr className="bg-slate-50 font-bold border-b border-slate-150 text-slate-450 uppercase text-[9px]">
                              <th className="p-2 w-24">Tarih</th>
                              <th className="p-2">Açıklama</th>
                              <th className="p-2 w-24">Metot</th>
                              <th className="p-2 w-28 text-right">Orijinal Tutar</th>
                              <th className="p-2 w-28 text-right">GBP Karşılığı</th>
                              <th className="p-2 w-20 text-center">İşlemler</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {hasanDrawTxs.map(t => (
                              <tr key={t.id} className="hover:bg-slate-50/40">
                                <td className="p-2 text-slate-500">{t.date}</td>
                                <td className="p-2 text-slate-800 font-sans">{t.description}</td>
                                <td className="p-2 text-slate-550 font-sans">{t.paymentMethod}</td>
                                <td className="p-2 text-right text-slate-600 font-bold">{t.amount.toLocaleString()} {t.currency}</td>
                                <td className="p-2 text-right text-amber-600 font-bold">- £{convertToGbp(t).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                                <td className="p-2">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => startEditTx(t)}
                                      className="p-1 text-slate-400 hover:text-indigo-650 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                      title="Avans / Çekim Düzenle"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTransaction(t.id)}
                                      className="p-1 text-slate-400 hover:text-rose-650 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                      title="İptal Et / Sil"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* CATEGORY 4: mustafa draws */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wide bg-amber-50 text-amber-800 w-fit px-2 py-0.5 rounded-sm">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                      3. Adım Mustafa Şahsi Kazanç Çekimleri ({mustafaDrawTxs.length} Adet)
                    </span>
                    {mustafaDrawTxs.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic pl-3">Mustafa bu dönemde kasadan kâr çekimi yapmamıştır.</p>
                    ) : (
                      <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-left text-[11px] font-mono">
                          <thead>
                            <tr className="bg-slate-50 font-bold border-b border-slate-150 text-slate-450 uppercase text-[9px]">
                              <th className="p-2 w-24">Tarih</th>
                              <th className="p-2">Açıklama</th>
                              <th className="p-2 w-24">Metot</th>
                              <th className="p-2 w-28 text-right">Orijinal Tutar</th>
                              <th className="p-2 w-28 text-right">GBP Karşılığı</th>
                              <th className="p-2 w-20 text-center">İşlemler</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {mustafaDrawTxs.map(t => (
                              <tr key={t.id} className="hover:bg-slate-50/40">
                                <td className="p-2 text-slate-500">{t.date}</td>
                                <td className="p-2 text-slate-800 font-sans">{t.description}</td>
                                <td className="p-2 text-slate-550 font-sans">{t.paymentMethod}</td>
                                <td className="p-2 text-right text-slate-600 font-bold">{t.amount.toLocaleString()} {t.currency}</td>
                                <td className="p-2 text-right text-amber-600 font-bold">- £{convertToGbp(t).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                                <td className="p-2">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => startEditTx(t)}
                                      className="p-1 text-slate-400 hover:text-indigo-650 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                      title="Avans / Çekim Düzenle"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTransaction(t.id)}
                                      className="p-1 text-slate-400 hover:text-rose-650 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                      title="İptal Et / Sil"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>
          );
        })()}
        {/* TAB 4: PERSONEL KARTLARI */}
        {activeTab === "personel" && (
          <div className="animate-fade-in" id="pane-personnel">
            <PersonnelSection 
              personnel={personnel}
              onAddPersonnel={handleAddPersonnel}
              onDeletePersonnel={handleDeletePersonnel}
              onAddAdvance={handleAddAdvance}
              onCalculateAndPay={handleCalculateAndPay}
              personnelGiderleri={personnelGiderleri}
              txExchangeRate={txExchangeRate || "43.15"}
              onDeleteAdvance={handleDeleteAdvance}
              onEditAdvance={handleEditAdvance}
              records={records}
            />
          </div>
        )}

        {/* TAB 5: İŞ ORTAĞI FİRMALAR */}
        {activeTab === "firmalar" && (
          <div className="animate-fade-in" id="pane-firms">
            <FirmSection 
              firms={firms}
              transactions={transactions}
              proposals={proposals}
              onAddFirm={handleAddFirm}
              onDeleteFirm={handleDeleteFirm}
              onAddTransaction={handleCreateTransaction}
            />
          </div>
        )}

        {/* TAB 5b: MAKET TEKLİFLERİ */}
        {activeTab === "teklifler" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="pane-proposals">
            
            {/* Create Proposal Form Column */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs h-fit" id="proposal-maker-card">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Yeni Maket Teklifi</h2>
              </div>

              <form onSubmit={handleAddProposal} className="space-y-4">
                
                {/* Select Firm */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">İŞ ORTAĞI / FİRMA *</label>
                  <select
                    value={proposalFirmId}
                    onChange={(e) => setProposalFirmId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-medium"
                    required
                  >
                    <option value="">-- Firma Seçiniz --</option>
                    {firms.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">TEKLİF KOORDİNATÖR BAŞLIĞI / PROJE *</label>
                  <input
                    type="text"
                    placeholder="Örn: Esas Mimarlık Maketi 1:50 Blok A"
                    value={proposalTitle}
                    onChange={(e) => setProposalTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-medium"
                    required
                  />
                </div>

                {/* Amount and Currency */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">TUTAR *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Örn: 12000"
                      value={proposalAmount}
                      onChange={(e) => setProposalAmount(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">BAZ *</label>
                    <select
                      value={proposalCurrency}
                      onChange={(e) => setProposalCurrency(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-bold"
                      required
                    >
                      <option value="GBP">GBP (£)</option>
                      <option value="TRY">TRY (₺)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>

                {/* Proposal Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">TEKLİF / FATURA TARİHİ *</label>
                  <input
                    type="date"
                    value={proposalDate}
                    onChange={(e) => setProposalDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-medium"
                    required
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">SÖZLEŞME VE TASARIM NOTLARI</label>
                  <textarea
                    placeholder="Örn: Pleksi malzeme kalınlığı 3mm, teslimat süresi 15 gündür."
                    rows={3}
                    value={proposalNotes}
                    onChange={(e) => setProposalNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-medium resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingProposal}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs disabled:bg-indigo-300 text-slate-100 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  {isSubmittingProposal ? "Teklif Oluşturuluyor..." : "Maket Teklifini Yayınla"}
                </button>
              </form>
            </div>

            {/* Proposals Tracking List Column */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col" id="proposals-display-card">
              
              {/* Header Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 tracking-tight">Teklif Durum & Cari Hesap Yönetimi ({proposals.length})</h2>
                  <p className="text-xs text-slate-400">Teklifleri takip edin; kabul edildiği an tutar firmanın cari hesabına otomatik borç yazılır.</p>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                  <select
                    value={proposalStatusFilter}
                    onChange={(e) => setProposalStatusFilter(e.target.value as any)}
                    className="px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                  >
                    <option value="ALL">Tüm Durumlar</option>
                    <option value="Beklemede">Beklemede</option>
                    <option value="Kabul Edildi">Kabul Edildi</option>
                    <option value="Reddedildi">Reddedildi</option>
                  </select>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tekliflerde ara..."
                      value={proposalSearch}
                      onChange={(e) => setProposalSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 w-44 font-semibold text-slate-700 hover:bg-white transition-all text-slate-800 animate-fade-in"
                    />
                  </div>
                </div>
              </div>

              {/* Proposals Listing Row Blocks */}
              {(() => {
                const filtered = proposals.filter(p => {
                  const firmName = firms.find(f => f.id === p.firmId)?.name || "";
                  const matchesSearch = p.title.toLowerCase().includes(proposalSearch.toLowerCase()) || 
                                        firmName.toLowerCase().includes(proposalSearch.toLowerCase());
                  const matchesStatus = proposalStatusFilter === "ALL" || p.status === proposalStatusFilter;
                  return matchesSearch && matchesStatus;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-20 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/10">
                      <FileSpreadsheet className="w-12 h-12 text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-500">Kayıtlı Teklif Bulunmuyor</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Formu kullanarak yeni bir teklif oluşturun veya filtreleri sıfırlayın.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                    {[...filtered].reverse().map(p => {
                      const associatedFirm = firms.find(f => f.id === p.firmId);
                      
                      // Status design map attributes
                      let statusBadgeBg = "bg-amber-50 border-amber-250 text-amber-900";
                      if (p.status === "Kabul Edildi") {
                        statusBadgeBg = "bg-emerald-50 border-emerald-250 text-emerald-950 animate-pulse";
                      } else if (p.status === "Reddedildi") {
                        statusBadgeBg = "bg-rose-50 border-rose-250 text-rose-900";
                      }

                      return (
                        <div 
                          key={p.id}
                          className="p-4 bg-slate-50/40 rounded-xl border border-slate-200/60 shadow-xs flex flex-col justify-between hover:border-indigo-200 transition-all group"
                          id={`proposal-card-${p.id}`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-extrabold text-xs text-slate-800 group-hover:text-indigo-650 transition-colors leading-snug">
                                {p.title}
                              </h3>
                              
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md border shrink-0 uppercase tracking-wide ${statusBadgeBg}`}>
                                {p.status}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 font-semibold mt-1.5 flex items-center gap-1">
                              🏢 {associatedFirm ? associatedFirm.name : "Bilinmeyen Firma"}
                            </p>

                            <div className="mt-2 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                              <span>Tarih: {new Date(p.date).toLocaleDateString("tr-TR")}</span>
                              <span>Tutar: <strong className="font-bold text-slate-700 text-xs">{p.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {p.currency === "GBP" ? "£" : p.currency === "TRY" ? "₺" : p.currency}</strong></span>
                            </div>

                            {p.notes && (
                              <div className="mt-2.5 p-2 bg-white rounded-lg border border-slate-100/80 text-[10px] text-slate-500 italic leading-relaxed line-clamp-3 font-medium">
                                {p.notes}
                              </div>
                            )}
                          </div>

                          {/* Quick Actions Console footer */}
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                            {/* PDF Button */}
                            <button
                              onClick={() => generateProposalPDF(p, associatedFirm)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-[10px] transition-all cursor-pointer"
                              title="Teklifi antetli resmi PDF olarak indir."
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>PDF İndir</span>
                            </button>

                            {/* Status controls */}
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleUpdateProposalStatus(p.id, "Beklemede")}
                                className={`p-1.5 rounded-md transition-all border cursor-pointer ${
                                  p.status === "Beklemede" 
                                    ? "bg-amber-100 border-amber-300 text-amber-800" 
                                    : "bg-white border-slate-200 hover:bg-amber-50 text-slate-400 hover:text-amber-600"
                                }`}
                                title="Beklemede Olarak İşaretle"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleUpdateProposalStatus(p.id, "Kabul Edildi")}
                                className={`p-1.5 rounded-md transition-all border cursor-pointer ${
                                  p.status === "Kabul Edildi" 
                                    ? "bg-emerald-100 border-emerald-300 text-emerald-800" 
                                    : "bg-white border-slate-200 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"
                                }`}
                                title="Kabul Edildi Olarak Ayarla (Otomatik Cariye Borç Yazdırır)"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleUpdateProposalStatus(p.id, "Reddedildi")}
                                className={`p-1.5 rounded-md transition-all border cursor-pointer ${
                                  p.status === "Reddedildi" 
                                    ? "bg-rose-100 border-rose-300 text-rose-800" 
                                    : "bg-white border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                                }`}
                                title="Reddedildi Yap"
                              >
                                <Trash2 className="w-3.5 h-3.5" style={{ transform: "scaleY(-1)" }} />
                              </button>

                              <span className="w-px h-5 bg-slate-200 mx-1 self-center" />

                              <button
                                onClick={() => handleDeleteProposal(p.id)}
                                className="p-1.5 rounded-md bg-white border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                                title="Teklifi Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              </button>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            </div>

          </div>
        )}

        {/* TAB 6: RAPORLAR */}
        {activeTab === "raporlar" && (
          <OfficeReports
            firms={firms}
            personnel={personnel}
            records={records}
            transactions={transactions}
            proposals={proposals}
            handlePrintReport={handlePrintReport}
            personnelGiderleri={personnelGiderleri}
            onDeleteAdvance={handleDeleteAdvance}
            onEditAdvance={handleEditAdvance}
          />
        )}

        {/* TAB 7: ADMINISTRATIVE SYSTEM CONFIGS (AYARLAR & YEDEK) */}
        {activeTab === "ayarlar" && (
          <div className="space-y-6 animate-fade-in" id="pane-settings">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Security Policy Toggle */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-800 text-sm">Yönetici Oturum ve Token Yetkisi</h3>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Sistem veri tabanını dış müdahalelerden ve izinsiz test isteklerinden korumak için token kontrol bariyerini devreye alabilirsiniz. 
                    Test aşamasında esnek kullanım için varsayılan token ile bağlanabilirsiniz.
                  </p>

                  <div className="mt-4 p-3 bg-indigo-50/70 text-indigo-950 font-mono text-[10px] rounded-xl leading-relaxed">
                    ⚙️ <strong>Aktif Token Auth Header:</strong> <br />
                    Authorization: Bearer <span className="font-bold text-indigo-700">{adminToken || "(Boş)"}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-2 items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Token Yetki Durumu:</span>
                  <button
                    onClick={toggleTokenSafety}
                    className={`px-4 py-2 font-black rounded-xl text-xs transition-all cursor-pointer ${
                      tokenRequired 
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs' 
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    }`}
                  >
                    {tokenRequired ? "Token Filtresini Kapat (Esnek)" : "Token Filtresini Aç (Koru)"}
                  </button>
                </div>
              </div>

              {/* Data Backup Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Download className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-800 text-sm">Veri Tabanı Yedekleme & Kurtarma (JSON)</h3>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Paneldeki bütün kayıtlı verileri tek bir tıkla yerel bilgisayarınıza indirebilir, 
                    veya daha sonra geri yüklemek üzere yedek JSON dosyası olarak saklayabilirsiniz.
                  </p>

                  <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 font-medium">
                    📁 <strong>Yedek Kapsamı:</strong> İş Ortağı Firmalar, Personel Kartları, Giriş-Çıkış Mesaileri ve Defter Kayıtları.
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                  <span className="text-[10px] text-slate-400 font-medium">Yedek Dosyası Yönetimi</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="file"
                      ref={backupFileInputRef}
                      onChange={handleImportBackup}
                      accept=".json"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => backupFileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      📁 Yedek Yükle (JSON)
                    </button>
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Yedek İndir (JSON)
                    </button>
                  </div>
                </div>
              </div>

              {/* Reset/Clean Database Card */}
              <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-xs flex flex-col justify-between md:col-span-2">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Trash2 className="w-5 h-5 text-rose-600" />
                    <h3 className="font-bold text-rose-800 text-sm">Örnek Verileri Temizle & Kendi Verilerinizle Başlayın</h3>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Sistemde yüklü olan şablon firmaları, örnek personelleri, atanmış çalışma mesailerini ve örnek kasa işlemlerini tek bir tıkla temizleyebilirsiniz. 
                    Bu işlem veritabanını tamamen sıfırlayarak, kendi projelerinizi, çalışanlarınızı ve finansal kasa defterinizi kaydetmeniz için tertemiz bir zemin hazırlayacaktır.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">⚠️ DİKKAT: Bu sıfırlama işlemi kalıcıdır ve geri alınamaz. Başlamadan önce mevcut verilerinizi üstteki buton ile yedeklemeniz önerilir!</span>
                  <button
                    type="button"
                    onClick={handleResetDatabase}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                  >
                    🗑️ Tüm Örnek Verileri Sil & Sıfırla
                  </button>
                </div>
              </div>

            </div>

            {/* Quick API usage documentation for personnel department */}
            <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 p-6 rounded-3xl text-white shadow-md">
              <h3 className="font-extrabold text-sm tracking-wide mb-2 uppercase text-indigo-300">🏢 Şirket İçi Operasyonlar Dijital Kılavuzu</h3>
              <p className="text-xs leading-relaxed opacity-85">
                Bu koordinasyon paneli; personellerin kontrolsüz mesai aşımı yapmasını önlemek, hangi personelin hangi mimari proje 
                veya müşteri projesinde ne kadar süre mesai sarf ettiğini raporlamak amacıyla dizayn edilmiştir. 
                Manuel saat hesapları (dakika bazlı yuvarlamalar) tamamen devreden çıkartılmış olup, sistem arka planda 
                gün ve saat kırılımlı çalışma sürelerini net değerlerle kaydeder.
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6 text-xs text-slate-300">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <strong className="text-white block mb-0.5">1. Sınıf Entegrasyon</strong>
                  Tüm HTTP paketleri temiz JSON formatında transfer edilerek kararsız sunucu çöküşleri engellenir.
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <strong className="text-white block mb-0.5">2. Döviz Kasa Defteri</strong>
                  Net bir kâr dağılımı için harcamalar TRY ve GBP para birimlerinde ayrı Kasa Ledger'larında izlenir.
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <strong className="text-white block mb-0.5">3. Akıllı Süre Hesaplayıcı</strong>
                  Tarih farkları saniye doğruluğunda çıkarılır ve Türkçe raporlama formatına dönüştürülür.
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* 🚀 Dynamic persistent notifications/toast messages */}
      {successToast && (
        <div className="fixed bottom-6 right-6 p-4 bg-slate-900 text-white rounded-2xl shadow-xl flex items-center gap-2.5 z-55 border border-slate-800 animate-slide-up">
          <div className="p-1 bg-emerald-500 rounded-lg text-slate-900">
            <Check className="w-3.5 h-3.5 stroke-[3px]" />
          </div>
          <span className="text-xs font-bold font-sans pr-2">{successToast}</span>
        </div>
      )}

      {/* 🚀 Custom App Alert Modal Overlay */}
      {appAlert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in animate-duration-200" id="app-custom-alert-overlay">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
              <span className="font-bold text-lg">!</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-slate-400">{appAlert.title || "Sistem Bildirimi"}</h3>
              <p className="text-xs font-medium text-slate-650 leading-relaxed">{appAlert.message}</p>
            </div>
            <button
              onClick={() => setAppAlert(null)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
            >
              Tamam
            </button>
          </div>
        </div>
      )}

      {/* 🚀 Custom App Confirm Modal Overlay */}
      {appConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in animate-duration-200" id="app-custom-confirm-overlay">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-655">
              <span className="font-bold text-lg">?</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">{appConfirm.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{appConfirm.message}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  if (appConfirm.onCancel) appConfirm.onCancel();
                  setAppConfirm(null);
                }}
                className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  appConfirm.onConfirm();
                  setAppConfirm(null);
                }}
                className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Evet, Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 Transaction Edit Modal */}
      {editingTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fade-in" id="app-tx-edit-modal">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Pencil className="w-5 h-5 text-indigo-600 shrink-0" />
              <div className="text-left">
                <h3 className="font-bold text-slate-800 text-sm">Defter Kaydı Düzenleme</h3>
                <p className="text-[10px] text-slate-400">Yapılan değişiklikler ortaklık hesaplama cetvelini ve kasa bakiyelerini dinamik düzeltir.</p>
              </div>
            </div>

            <form onSubmit={handleSaveTxEditSubmit} className="space-y-3 text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">İŞLEM TARİHİ</label>
                <input
                  type="date"
                  value={editTxDate}
                  onChange={(e) => setEditTxDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:bg-white focus:border-indigo-500 cursor-pointer"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">TUTAR</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editTxAmount}
                    onChange={(e) => setEditTxAmount(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono font-bold focus:bg-white focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 font-sans">BİRİM</label>
                  <select
                    value={editTxCurrency}
                    onChange={(e) => setEditTxCurrency(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:bg-white focus:border-indigo-500"
                    required
                  >
                    <option value="GBP">GBP (£)</option>
                    <option value="TRY">TRY (₺)</option>
                  </select>
                </div>
              </div>

              {editTxCurrency === "TRY" && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">DÖVİZ KURU (1 GBP = ? TRY)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editTxExchangeRate}
                    onChange={(e) => setEditTxExchangeRate(e.target.value)}
                    placeholder="Örn: 43.15"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono font-bold focus:bg-white focus:border-indigo-500"
                    required
                  />
                </div>
              )}

              {/* Show Partner Selection if it is Ortaklar Kâr Çekimi */}
              {editingTx.category === "Ortaklar Kâr Çekimi" && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">KÂR ÇEKİMİ YAPAN ORTAK</label>
                  <select
                    value={editTxPartnerId}
                    onChange={(e) => setEditTxPartnerId(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:bg-white focus:border-indigo-500"
                    required
                  >
                    <option value="Hasan">Hasan</option>
                    <option value="Mustafa">Mustafa</option>
                  </select>
                </div>
              )}

              {/* Show Partner Selection if it is Ofis Genel Gideri Out of Pocket */}
              {editingTx.category === "Ofis Genel Gideri" && (editingTx.partnerId === "Hasan_Ofis" || editingTx.partnerId === "Mustafa_Ofis" || (editingTx.description && (editingTx.description.includes("Ödeyen: Hasan") || editingTx.description.includes("Ödeyen: Mustafa")))) && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 font-sans">ÖDEYEN TARAF</label>
                  <select
                    value={editTxPartnerId === "Hasan_Ofis" || editTxPartnerId === "Hasan" ? "Hasan" : (editTxPartnerId === "Mustafa_Ofis" || editTxPartnerId === "Mustafa" ? "Mustafa" : "Kasadan")}
                    onChange={(e) => setEditTxPartnerId(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:bg-white focus:border-indigo-500"
                    required
                  >
                    <option value="Hasan">Hasan (Şahsi Cebinden)</option>
                    <option value="Mustafa">Mustafa (Şahsi Cebinden)</option>
                    <option value="Kasadan">Kasadan</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">AÇIKLAMA</label>
                <input
                  type="text"
                  value={editTxDescription}
                  onChange={(e) => setEditTxDescription(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  KAYDET VE GÜNCELLE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚀 Printable Partnership Contract (Hidden on screen, optimized for paper printouts with wet signature blocks) */}
      {(() => {
        const calc = getPartnershipCalculations(pSelectedMonth);
        return (
          <div 
            id="printable-partnership-contract" 
            className="hidden print:block bg-white p-6 sm:p-8 space-y-6 text-slate-900 border border-slate-300 rounded-sm font-sans"
          >
            {/* Sleek & Compact inline print header */}
            <div className="border-b border-rose-500 pb-3 mb-4 flex justify-between items-end">
              <div>
                <h1 className="text-xs font-black text-rose-600 tracking-wider font-sans">HASAN & MUSTAFA ADİ ORTAKLIĞI</h1>
                <h2 className="text-[10px] text-slate-550 italic font-semibold font-sans">Ortaklar Hesap Kesim ve Mutabakat Belgesi</h2>
              </div>
              <div className="text-right text-[9px] font-mono text-slate-500 font-semibold uppercase">
                <div>Hesap Dönemi: {pSelectedMonth === "ALL" ? "Tüm Dönemler" : `${pSelectedMonth} Dönemi`}</div>
                <div>Düzenleme Tarihi: {new Date().toLocaleDateString("tr-TR")}</div>
              </div>
            </div>

            {/* 1. Core Operating Ledger Summary Table */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-extrabold text-slate-800 tracking-wider border-b border-indigo-500 w-fit pb-0.5 uppercase">I. Genel Operasyonel Gelir & Gider Özeti</h3>
              <table className="w-full text-left text-[10px] font-mono border border-slate-205">
                <tbody>
                  <tr className="border-b border-slate-150">
                    <td className="p-1 px-2 text-slate-500">Toplam Ofis Hakediş ve Kasa Gelirleri (Gelir Havuzu):</td>
                    <td className="p-1 px-2 text-right font-bold text-slate-800">£{(calc.activeRevenue).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP</td>
                  </tr>
                  <tr className="border-b border-slate-150">
                    <td className="p-1 px-2 text-slate-500">Toplam Ortak Ofis Altyapı ve Personel Giderleri (Ortak Giderler):</td>
                    <td className="p-1 px-2 text-right font-bold text-slate-800">£{(calc.activeOperatingExpenses).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP</td>
                  </tr>
                  <tr className="border-b border-slate-150 bg-slate-50">
                    <td className="p-1 px-2 text-indigo-700 font-bold">Dağıtılabilir Net Ortaklık Dönem Kârı (Net Kâr):</td>
                    <td className="p-1 px-2 text-right font-bold text-emerald-600">£{(calc.activeRevenue - calc.activeOperatingExpenses).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP</td>
                  </tr>
                  <tr className="border-b border-slate-150">
                    <td className="p-1 px-2 text-slate-500">Baseline Ortaklık Pay Oranı (Eşit Dağılım Payı):</td>
                    <td className="p-1 px-2 text-right font-bold text-slate-800">% 50.00 (Kişi Başı Eşit Paylaşım)</td>
                  </tr>
                  <tr className="bg-indigo-50">
                    <td className="p-1 px-2 text-indigo-700 font-bold">Ortak Başına Düşen Dönem Hakediş Payı:</td>
                    <td className="p-1 px-2 text-right font-bold text-indigo-600">£{(calc.activeShare).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. Individual withdrawals & balances Table */}
            <div className="space-y-2 pt-2">
              <h3 className="text-[10px] font-extrabold text-slate-800 tracking-wider border-b border-indigo-500 w-fit pb-0.5 uppercase">II. Ortaklar Cari Dağılım ve Bakiye Tablosu</h3>
              <table className="w-full text-left text-[10px] font-mono border border-slate-205 text-slate-800">
                <thead>
                  <tr className="bg-slate-50 font-bold border-b border-slate-250 text-[9px]">
                    <th className="p-1 px-2">Ortak Adı</th>
                    <th className="p-1 px-2">Dönem Payı (50%)</th>
                    <th className="p-1 px-2">Gerçekleşen Çekim (-)</th>
                    <th className="p-1 px-2">Geçmiş Dönem Devri (+/-)</th>
                    <th className="p-1 px-2 text-right">Nihai Cari Bakiye (Net Alacak/Borç)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-150">
                    <td className="p-1 px-2 font-bold font-sans">Hasan</td>
                    <td className="p-1 px-2">£{(calc.activeShare).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                    <td className="p-1 px-2">£{calc.activeHasanWithdrawals.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                    <td className="p-1 px-2">{calc.prevHasanBalance >= 0 ? "+" : ""} £{calc.prevHasanBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                    <td className="p-1 px-2 text-right font-bold text-slate-900">£{calc.hasanBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td className="p-1 px-2 font-bold font-sans">Mustafa</td>
                    <td className="p-1 px-2">£{(calc.activeShare).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                    <td className="p-1 px-2">£{calc.activeMustafaWithdrawals.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                    <td className="p-1 px-2">{calc.prevMustafaBalance >= 0 ? "+" : ""} £{calc.prevMustafaBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                    <td className="p-1 px-2 text-right font-bold text-slate-900">£{calc.mustafaBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-[8px] text-slate-400 italic font-medium leading-tight pl-1">
                * Formül: Nihai Cari Bakiye = Brüt Pay - Dönem Şahsi Çekimi + Önceki Dönem Devri. 
                Pozitif bakiye ortağın ortaklıktan alacaklı olduğunu, negatif bakiye ise ortaklığa borçlu olduğunu beyan eder.
              </p>
            </div>

            {/* 3. Debt tracking box (Core highlight!) */}
            <div className="p-3.5 bg-amber-500/5 border border-amber-500/25 rounded-lg space-y-2 pt-2">
              <h4 className="text-[9px] font-extrabold text-amber-800 uppercase tracking-widest leading-none font-sans">III. Mutabık Kalınan Nakit Ödeme ve Eşitleme Kararı</h4>
              <p className="text-[10px] font-sans leading-relaxed text-slate-700">
                Ortaklar arası cari bakiyeleri sıfırlayarak defteri dengelemek üzere; 
                <strong> {calc.debtMessage}</strong> Ortaklar bu tutar doğrultusunda elden mutabık kalmış ve karşılıklı mahsuplaşmayı gayrikabili rücu kabul etmişlerdir.
              </p>
            </div>

            {/* Signatures section */}
            <div className="pt-6">
              <p className="text-[9px] text-slate-500 leading-relaxed text-center mb-6">
                Ortaklar, yukarıda belirtilen cari dökümler, ödenek payları ve borç-alacak tablolarının doğruluğu konusunda bütünüyle mutabık kalmış ve ıslak imzalarıyla onaylamışlardır.
              </p>
              <div className="grid grid-cols-2 gap-12 text-slate-700 text-center font-bold text-[9px] uppercase tracking-wide font-sans">
                <div className="flex flex-col items-center justify-between gap-4">
                  <span>Hasan Şahiner</span>
                  <div className="h-8 w-24 border-b border-dashed border-slate-350"></div>
                  <span className="text-[8px] text-slate-400 font-normal">Kurucu Ortak (İmza / Tarih)</span>
                </div>
                <div className="flex flex-col items-center justify-between gap-4">
                  <span>Mustafa Akpınar</span>
                  <div className="h-8 w-24 border-b border-dashed border-slate-350"></div>
                  <span className="text-[8px] text-slate-400 font-normal">Kurucu Ortak (İmza / Tarih)</span>
                </div>
              </div>
            </div>

            {/* PDF standard metadata */}
            <div className="pt-8 border-t border-slate-200 text-center text-[8px] text-slate-400 space-y-0.5">
              <p>Bu evrak ortaklar arası mutabakat doğrultusunda hazırlanmış resmi karar ekidir.</p>
              <p>MUSTAFA MİMARLIK OFİSİ © 2026 - YAŞAM & OPERASYONEL DEFTER SİSTEMİ</p>
            </div>
          </div>
        );
      })()}

      {/* 🚀 Subtle clean watermark footer */}
      <footer className="py-6 text-center text-[10px] text-slate-400 font-semibold tracking-wide border-t border-slate-100 bg-white" id="footer-section">
        <span>© 2026. Operasyonel Takip Paneli - Tüm Hakları Saklıdır.</span>
      </footer>
    </div>
  );
}
