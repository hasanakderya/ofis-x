/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { Firm, Personnel, WorkRecord, DatabaseSchema, Transaction, Proposal } from "./src/types";

// Setup path helpers with fallback for ESM and CommonJS
let safeFilename = "";
let safeDirname = "";

try {
  if (typeof import.meta !== "undefined" && import.meta.url) {
    safeFilename = fileURLToPath(import.meta.url);
    safeDirname = path.dirname(safeFilename);
  }
} catch {
  // Safe generic fallback
}

const customFilename = safeFilename;
const customDirname = safeDirname;

// Database path
const DB_FILE = path.join(process.cwd(), "db.json");

// Default seed database
const DEFAULT_DATABASE: DatabaseSchema = {
  firms: [
    {
      id: "firm-1",
      name: "Esas Mimarlık Ofisi",
      sector: "Mimarlık & Tasarım",
      manager: "Kamil Sönmez",
      phone: "0532 111 22 33",
      address: "Maslak Mahallesi, Sanayi Caddesi No:4, Şişli, İstanbul",
      createdAt: "2026-05-15T10:00:00Z"
    },
    {
      id: "firm-2",
      name: "Artı Maket Tasarım Atölyesi",
      sector: "Fiziksel Maket & Model Yapımı",
      manager: "Aylin Kahraman",
      phone: "0505 555 44 22",
      address: "Liman Caddesi, Merkez, İstanbul",
      createdAt: "2026-05-16T11:30:00Z"
    },
    {
      id: "firm-3",
      name: "Piksel Tasarım Stüdyosu",
      sector: "3D Görselleştirme & Animasyon",
      manager: "Hakan Güneş",
      phone: "0543 999 88 11",
      address: "Teknopark İzmir, A3 Blok No:12, Urla, İzmir",
      createdAt: "2026-05-17T09:15:00Z"
    }
  ],
  personnel: [
    {
      id: "pers-1",
      idCardNo: "12345678901",
      fullName: "Ahmet Erdem",
      role: "Model Maker (Maket Uzmanı)",
      phone: "0555 444 33 22",
      startDate: "2024-03-10",
      aylik_maas_try: 50000,
      mesai_saat_ucreti_try: 500,
      createdAt: "2026-05-15T10:15:00Z"
    },
    {
      id: "pers-2",
      idCardNo: "98765432109",
      fullName: "Selin Uzun",
      role: "CAD Tasarımcısı",
      phone: "0531 666 77 88",
      startDate: "2025-05-01",
      aylik_maas_try: 65000,
      mesai_saat_ucreti_try: 600,
      createdAt: "2026-05-17T09:30:00Z"
    },
    {
      id: "pers-3",
      idCardNo: "45678912344",
      fullName: "Ömer Faruk Sarı",
      role: "3D Render Uzmanı",
      phone: "0544 333 22 11",
      startDate: "2025-11-20",
      aylik_maas_try: 42000,
      mesai_saat_ucreti_try: 450,
      createdAt: "2026-05-16T11:45:00Z"
    }
  ],
  records: [
    {
      id: "rec-1",
      personnelId: "pers-1",
      firmId: "firm-1",
      checkIn: "2026-05-20T08:00",
      checkOut: "2026-05-21T18:00",
      note: "Mimari maket lamine montajı ve 3D render incelemesi tamamlandı.",
      createdAt: "2026-05-21T18:05:00Z"
    },
    {
      id: "rec-2",
      personnelId: "pers-3",
      firmId: "firm-2",
      checkIn: "2026-05-22T04:30",
      checkOut: null,
      note: "Peyzaj maketi malzeme seçimi ve lazer kesimi yapıldı.",
      createdAt: "2026-05-22T04:32:00Z"
    },
    {
      id: "rec-3",
      personnelId: "pers-2",
      firmId: "firm-3",
      checkIn: "2026-05-22T09:00",
      checkOut: "2026-05-22T17:30",
      note: "CAD planlarının ölçeklendirilmesi ve lazer kesim şablonlarının hazırlanması tamamlandı.",
      createdAt: "2026-05-22T17:30:00Z"
    }
  ],
  transactions: [
    {
      id: "tx-1",
      date: "2026-05-18",
      type: "INCOME",
      amount: 4500,
      currency: "GBP",
      description: "Esas Mimarlık Ofisi - Mayıs 1. Dönem Proje Hakediş Ödemesi",
      category: "Hakediş",
      createdAt: "2026-05-18T10:00:00Z"
    },
    {
      id: "tx-2",
      date: "2026-05-19",
      type: "EXPENSE",
      amount: 1200,
      currency: "GBP",
      description: "Maket Atölyesi Akrilik Levha ve Pleksiglas Alımı",
      category: "Maket Malzemesi",
      createdAt: "2026-05-19T14:30:00Z"
    },
    {
      id: "tx-3",
      date: "2026-05-20",
      type: "INCOME",
      amount: 3200,
      currency: "GBP",
      description: "Piksel Tasarım 3D Render Modelleme Entegrasyon Bedeli Tahsilatı",
      category: "3D Tasarım Hizmeti",
      createdAt: "2026-05-20T11:15:00Z"
    },
    {
      id: "tx-4",
      date: "2026-05-21",
      type: "EXPENSE",
      amount: 850,
      currency: "GBP",
      description: "Ahmet Erdem (Model Maker) Avans Ödemesi",
      category: "Personel Avansı",
      createdAt: "2026-05-21T09:00:00Z"
    }
  ]
};

// Initialize Database file if not exists
function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATABASE, null, 2), "utf-8");
      return DEFAULT_DATABASE;
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    const db: DatabaseSchema = JSON.parse(data);
    
    if (!db.personel_giderleri) {
      db.personel_giderleri = [];
    }
    if (!db.personnel) {
      db.personnel = [];
    }
    db.personnel = db.personnel.map(p => ({
      ...p,
      aylik_maas_try: p.aylik_maas_try !== undefined ? Number(p.aylik_maas_try) : 50000,
      mesai_saat_ucreti_try: (p as any).mesai_saat_ucreti_try !== undefined ? Number((p as any).mesai_saat_ucreti_try) : 500
    }));

    return db;
  } catch (err) {
    console.error("Database read error, using memory fallback", err);
    return DEFAULT_DATABASE;
  }
}

function writeDb(data: DatabaseSchema): boolean {
  try {
    const tempFile = DB_FILE + ".tmp";
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
    return true;
  } catch (err) {
    console.error("Database write error", err);
    return false;
  }
}

// KAPANIŞ SİNYALLERİNİ YAKALA (GRACEFUL SHUTDOWN)
const siralikapanis = () => {
  console.log("Kapanış sinyali alındı. Veriler db.json dosyasına son kez güvenle kaydediliyor...");
  try {
    const db = readDb();
    writeDb(db);
    console.log("Veriler son kez başarıyla kaydedildi.");
  } catch (e) {
    console.error("Graceful shutdown esnasında veri kaydetme başarısız oldu:", e);
  }
  process.exit(0);
};

process.on("SIGINT", siralikapanis);  // CTRL+C ile kapatma
process.on("SIGTERM", siralikapanis); // Sistem kapatma sinyali
process.on("SIGHUP", siralikapanis);  // Terminal kapanması

async function startServer() {
  const app = express();
  const PORT = 3000;

  // ============================================================
  // ⚡ RADİKAL CORS + LAN ERİŞİM AYARLARI (Mobil cihaz garantisi)
  // ============================================================
  // Tüm köken/metot/header'lara izin ver. iPhone Safari + Chrome
  // mobil tarayıcılarda yerel IP üzerinden gelen istekleri kapsar.
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, authtoken"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    // PWA / iframe / yerel ağ uyumu
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "no-cache");
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    next();
  });

  app.use(express.json());

  // 🔁 Tarayıcı kaybolmasın: kök ve "/static" (slash'sız) → /static/
  // Personel telefonlarında "192.168.137.1:3000" yazmak yeterli olacak.
  app.get("/", (_req, res) => res.redirect(302, "/static/"));
  app.get("/static", (_req, res) => res.redirect(301, "/static/"));

  // Static serving for standalone personnel mobile panel
  app.use(
    "/static",
    express.static(path.join(process.cwd(), "static"), {
      index: "index.html",
      etag: false,
      lastModified: false,
      setHeaders: (res) => {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      },
    })
  );

  // Security barrier state - can be enabled/disabled via endpoints
  let isTokenRequired = false;

  // Custom log middleware for cleanly identifying endpoints called
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });

  // Auth checking middleware
  const checkAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!isTokenRequired) {
      return next();
    }

    const authHeader = req.headers.authorization;
    const authTokenHeader = req.headers.authtoken; // lowercased by Express

    let providedToken = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      providedToken = authHeader.split(" ")[1];
    } else if (typeof authTokenHeader === "string") {
      providedToken = authTokenHeader;
    }

    if (providedToken === "test-admin-token-2026") {
      return next();
    }

    // Always clean JSON error response
    return res.status(401).json({ 
      error: "Sistemde Token Koruması Aktiftir! Lütfen geçerli bir yönetici oturum token'ı sağlayın.",
      reason: "TOKEN_REQUIRED",
      tips: "Entegrasyon testleri için 'Yönetici Token Korumasını Kapat' butonu ile bu doğrulamayı esnetebilirsiniz."
    });
  };

  // Auth/Token Control APIs
  app.get("/api/auth/status", (req, res) => {
    res.json({ isTokenRequired });
  });

  app.post("/api/auth/toggle", (req, res) => {
    isTokenRequired = !isTokenRequired;
    res.json({ success: true, isTokenRequired });
  });

  // Database Clear/Reset Endpoint
  app.post("/api/admin/clear-db", checkAuth, (req, res) => {
    console.log("[ADMIN] Database clearing requested.");
    const db = readDb();
    db.firms = [];
    db.personnel = [];
    db.records = [];
    db.transactions = [];
    db.proposals = [];
    db.personel_giderleri = [];
    
    if (writeDb(db)) {
      console.log("[ADMIN] Database reset successfully completed.");
      res.json({ success: true, message: "Tüm örnek veriler temizlendi ve veri tabanı sıfırlandı." });
    } else {
      console.error("[ADMIN] Database reset failed during draft write.");
      res.status(500).json({ error: "Veri tabanı sıfırlanırken bir hata oluştu." });
    }
  });

  // FIRMS API
  app.get("/api/firms", checkAuth, (req, res) => {
    const db = readDb();
    res.json(db.firms);
  });

  app.post("/api/firms", checkAuth, (req, res) => {
    const { name, sector, manager, phone, address } = req.body;
    
    if (!name || !sector || !manager || !phone) {
      return res.status(400).json({ error: "Firma adı, sektör, yetkili kişi ve telefon alanları zorunludur." });
    }

    const db = readDb();
    const newFirm: Firm = {
      id: "firm-" + Date.now(),
      name,
      sector,
      manager,
      phone,
      address: address || "",
      createdAt: new Date().toISOString()
    };

    db.firms.push(newFirm);
    if (writeDb(db)) {
      res.status(201).json(newFirm);
    } else {
      res.status(500).json({ error: "Firma kaydedilirken veri tabanı hatası oluştu." });
    }
  });

  app.delete("/api/firms/:id", checkAuth, (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const index = db.firms.findIndex(f => f.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Silinmek istenen firma bulunamadı." });
    }

    // Check if there are active work records for this firm
    const linkedRecords = db.records.filter(r => r.firmId === id);
    if (linkedRecords.length > 0) {
      return res.status(400).json({ 
        error: "Bu firmaya ait mesai kayıtları bulunmaktadır. Önce ilgili mesai kayıtlarını silmelisiniz." 
      });
    }

    db.firms.splice(index, 1);
    writeDb(db);
    res.json({ success: true, message: "Firma başarıyla silindi." });
  });


  // PERSONNEL API
  app.get("/api/personnel", checkAuth, (req, res) => {
    const db = readDb();
    res.json(db.personnel);
  });

  app.post("/api/personnel", checkAuth, (req, res) => {
    const { idCardNo, fullName, role, phone, startDate, aylik_maas_try, mesai_saat_ucreti_try } = req.body;

    if (!idCardNo || !fullName || !role || !phone || !startDate || !aylik_maas_try || !mesai_saat_ucreti_try) {
      return res.status(400).json({ error: "TC Kimlik No, Ad Soyad, Görev, Telefon, İşe Başlama Tarihi, Aylık Net Maaş ve Mesai Saat Ücreti alanlarının tamamı zorunludur." });
    }

    const db = readDb();
    // Validate card no duplication conceptually
    if (db.personnel.some(p => p.idCardNo === idCardNo)) {
      return res.status(400).json({ error: "Bu TC Kimlik / Personel No ile kayıtlı başka bir personel zaten mevcut." });
    }

    const newPers: Personnel = {
      id: "pers-" + Date.now(),
      idCardNo,
      fullName,
      role,
      phone,
      startDate,
      aylik_maas_try: Number(aylik_maas_try),
      mesai_saat_ucreti_try: Number(mesai_saat_ucreti_try),
      createdAt: new Date().toISOString()
    };

    db.personnel.push(newPers);
    if (writeDb(db)) {
      res.status(201).json(newPers);
    } else {
      res.status(500).json({ error: "Personel kaydedilirken veri tabanı hatası oluştu." });
    }
  });

  app.delete("/api/personnel/:id", checkAuth, (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const index = db.personnel.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Silinmek istenen personel bulunamadı." });
    }

    // Check if there are active work records
    const linkedRecords = db.records.filter(r => r.personnelId === id);
    if (linkedRecords.length > 0) {
      return res.status(400).json({ 
        error: "Bu personele ait çalışma/mesai kayıtları bulunmaktadır. Önce ilgili mesai kayıtlarını silmelisiniz." 
      });
    }

    db.personnel.splice(index, 1);
    writeDb(db);
    res.json({ success: true, message: "Personel kartı başarıyla silindi." });
  });


  // RECORDS (CHECK-IN / CHECK-OUT) API
  app.get("/api/records", checkAuth, (req, res) => {
    const db = readDb();
    res.json(db.records);
  });

  app.post("/api/records", checkAuth, (req, res) => {
    const { personnelId, firmId, checkIn, note } = req.body;

    if (!personnelId || !checkIn) {
      return res.status(400).json({ error: "Giriş işlemi için Personel ve Giriş Tarih/Saati bilgileri zorunludur." });
    }

    const db = readDb();
    
    // Check if personnel already has an active session (checkOut is null)
    const activeSession = db.records.find(r => r.personnelId === personnelId && r.checkOut === null);
    if (activeSession) {
      return res.status(400).json({ 
        error: "Seçilen personelin kapatılmamış aktif bir mesaisi zaten bulunuyor. Yeni giriş açmadan önce mevcut mesaiyi tamamlamalısınız." 
      });
    }

    const newRecord: WorkRecord = {
      id: "rec-" + Date.now(),
      personnelId,
      firmId: firmId || "ofis",
      checkIn,
      checkOut: req.body.checkOut || null,
      note: note || "",
      createdAt: new Date().toISOString()
    };

    db.records.push(newRecord);
    if (writeDb(db)) {
      res.status(201).json(newRecord);
    } else {
      res.status(500).json({ error: "Giriş kaydı oluşturulurken veri tabanı hatası oluştu." });
    }
  });

  // End work session (Check-out update)
  app.put("/api/records/:id/checkout", checkAuth, (req, res) => {
    const { id } = req.params;
    const { checkOut, note } = req.body;

    if (!checkOut) {
      return res.status(400).json({ error: "Çıkış işlemi için Çıkış Tarih/Saati bilgisi zorunludur." });
    }

    const db = readDb();
    const record = db.records.find(r => r.id === id);
    if (!record) {
      return res.status(404).json({ error: "Çalışma kaydı bulunamadı." });
    }

    // Validate that checkOut is not before checkIn
    if (new Date(checkOut) < new Date(record.checkIn)) {
      return res.status(400).json({ error: "Mesai çıkış zamanı, giriş zamanından daha eski bir tarih/saat olamaz." });
    }

    record.checkOut = checkOut;
    if (note !== undefined) {
      record.note = note;
    }

    if (writeDb(db)) {
      res.json(record);
    } else {
      res.status(500).json({ error: "Çıkış işlemi kaydedilirken hata oluştu." });
    }
  });

  app.delete("/api/records/:id", checkAuth, (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const index = db.records.findIndex(r => r.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Silinmek istenen mesai kaydı bulunamadı." });
    }

    db.records.splice(index, 1);
    writeDb(db);
    res.json({ success: true, message: "Mesai kaydı başarıyla silindi." });
  });

  // TRANSACTIONS (KASA) API
  app.get("/api/transactions", checkAuth, (req, res) => {
    const db = readDb();
    // Safety fallback
    const txs = db.transactions || [];
    res.json(txs);
  });

  app.post("/api/transactions", checkAuth, (req, res) => {
    const { 
      date, 
      type, 
      amount, 
      currency, 
      description, 
      category, 
      partnerId,
      personnelId,
      firmId,
      exchangeRate,
      gbpEquivalent,
      paymentMethod,
      proposalId
    } = req.body;

    if (!date || !type || !amount || !currency || !description || !category) {
      return res.status(400).json({ 
        error: "İşlem tarihi, tür (GELİR/GİDER), tutar, para birimi, açıklama ve kategori alanları zorunludur." 
      });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: "İşlem tutarı sıfırdan büyük geçerli bir sayı olmalıdır." });
    }

    const db = readDb();
    if (!db.transactions) {
      db.transactions = [];
    }

    const newTx: Transaction = {
      id: "tx-" + Date.now(),
      date,
      type,
      amount: numAmount,
      currency,
      description,
      category,
      partnerId,
      personnelId,
      firmId,
      exchangeRate: exchangeRate ? Number(exchangeRate) : undefined,
      gbpEquivalent: gbpEquivalent ? Number(gbpEquivalent) : undefined,
      paymentMethod,
      proposalId,
      createdAt: new Date().toISOString()
    };

    db.transactions.push(newTx);
    if (writeDb(db)) {
      res.status(201).json(newTx);
    } else {
      res.status(500).json({ error: "Defter işlemi kaydedilirken veri tabanı hatası oluştu." });
    }
  });

  app.delete("/api/transactions/:id", checkAuth, (req, res) => {
    const { id } = req.params;
    const db = readDb();
    if (!db.transactions) db.transactions = [];

    const index = db.transactions.findIndex(tx => tx.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Silinmek istenen defter kaydı bulunamadı." });
    }

    db.transactions.splice(index, 1);
    writeDb(db);
    res.json({ success: true, message: "Defter kaydı başarıyla silindi." });
  });

  app.put("/api/transactions/:id", checkAuth, (req, res) => {
    const { id } = req.params;
    const { date, type, amount, currency, description, category, paymentMethod, exchangeRate, gbpEquivalent, partnerId, personnelId } = req.body;
    const db = readDb();
    if (!db.transactions) db.transactions = [];

    const index = db.transactions.findIndex(tx => tx.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Güncellenmek istenen işlem kaydı bulunamadı." });
    }

    const tx = db.transactions[index];
    if (date !== undefined) tx.date = date;
    if (type !== undefined) tx.type = type;
    if (amount !== undefined) tx.amount = Number(amount);
    if (currency !== undefined) tx.currency = currency;
    if (description !== undefined) tx.description = description;
    if (category !== undefined) tx.category = category;
    if (paymentMethod !== undefined) tx.paymentMethod = paymentMethod;
    if (exchangeRate !== undefined) tx.exchangeRate = exchangeRate !== null ? Number(exchangeRate) : undefined;
    if (gbpEquivalent !== undefined) tx.gbpEquivalent = gbpEquivalent !== null ? Number(gbpEquivalent) : undefined;
    if (partnerId !== undefined) tx.partnerId = partnerId !== null ? partnerId : undefined;
    if (personnelId !== undefined) tx.personnelId = personnelId !== null ? personnelId : undefined;

    writeDb(db);
    res.json(tx);
  });

  // CONSOLIDATED CASH REPORTS API
  app.get("/api/reports/consolidate-cash", checkAuth, (req, res) => {
    const db = readDb();
    const transactions = db.transactions || [];
    
    const getGbpValue = (t: any) => {
      if (t.currency === "GBP") return t.amount;
      if (t.currency === "TRY") {
        const rate = Number(t.exchangeRate) || 43.15;
        return Math.round((t.amount / rate) * 100) / 100;
      }
      return t.amount;
    };

    let totalIncomeGbp = 0;
    let totalExpenseGbp = 0;
    const categoryBreakdown: Record<string, { type: string; amountGbp: number }> = {};
    const monthlyConsolidation: Record<string, { incomeGbp: number; expenseGbp: number; netGbp: number }> = {};

    transactions.forEach(t => {
      const gbpVal = getGbpValue(t);
      const yearMonth = t.date ? t.date.slice(0, 7) : "Unknown";

      if (!monthlyConsolidation[yearMonth]) {
        monthlyConsolidation[yearMonth] = { incomeGbp: 0, expenseGbp: 0, netGbp: 0 };
      }

      if (t.type === "INCOME") {
        totalIncomeGbp += gbpVal;
        monthlyConsolidation[yearMonth].incomeGbp += gbpVal;
        monthlyConsolidation[yearMonth].netGbp += gbpVal;
      } else {
        totalExpenseGbp += gbpVal;
        monthlyConsolidation[yearMonth].expenseGbp += gbpVal;
        monthlyConsolidation[yearMonth].netGbp -= gbpVal;
      }

      const catKey = t.category || "Diğer";
      if (!categoryBreakdown[catKey]) {
        categoryBreakdown[catKey] = { type: t.type, amountGbp: 0 };
      }
      categoryBreakdown[catKey].amountGbp += gbpVal;
    });

    totalIncomeGbp = Math.round(totalIncomeGbp * 100) / 100;
    totalExpenseGbp = Math.round(totalExpenseGbp * 100) / 100;
    const balanceGbp = Math.round((totalIncomeGbp - totalExpenseGbp) * 100) / 100;

    const monthlyList = Object.keys(monthlyConsolidation).map(month => ({
      month,
      incomeGbp: Math.round(monthlyConsolidation[month].incomeGbp * 100) / 100,
      expenseGbp: Math.round(monthlyConsolidation[month].expenseGbp * 100) / 100,
      netGbp: Math.round(monthlyConsolidation[month].netGbp * 100) / 100,
    })).sort((a, b) => b.month.localeCompare(a.month));

    const categoriesList = Object.keys(categoryBreakdown).map(catName => ({
      category: catName,
      type: categoryBreakdown[catName].type,
      amountGbp: Math.round(categoryBreakdown[catName].amountGbp * 100) / 100
    }));

    res.json({
      success: true,
      summary: {
        totalIncomeGbp,
        totalExpenseGbp,
        balanceGbp,
        currency: "GBP"
      },
      monthlyConsolidation: monthlyList,
      categoryBreakdown: categoriesList,
      transactionsCount: transactions.length
    });
  });

  // PROPOSALS (TEKLIF) API
  app.get("/api/proposals", checkAuth, (req, res) => {
    const db = readDb();
    const proposals = db.proposals || [];
    res.json(proposals);
  });

  app.post("/api/proposals", checkAuth, (req, res) => {
    const { firmId, title, amount, currency, date, notes } = req.body;

    if (!firmId || !title || !amount || !currency || !date) {
      return res.status(400).json({ error: "Firma seçimi, teklif başlığı, tutar, döviz birimi ve teklif tarihi alanları zorunludur." });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: "Teklif tutarı sıfırdan büyük geçerli bir sayı olmalıdır." });
    }

    const db = readDb();
    if (!db.proposals) db.proposals = [];

    const newProposal: Proposal = {
      id: "prop-" + Date.now(),
      firmId,
      title,
      amount: numAmount,
      currency,
      status: 'Beklemede',
      date,
      createdAt: new Date().toISOString(),
      notes: notes || ""
    };

    db.proposals.push(newProposal);
    if (writeDb(db)) {
      res.status(201).json(newProposal);
    } else {
      res.status(500).json({ error: "Teklif kaydedilirken veri tabanı hatası oluştu." });
    }
  });

  app.put("/api/proposals/:id", checkAuth, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Beklemede', 'Kabul Edildi', 'Reddedildi'].includes(status)) {
      return res.status(400).json({ error: "Geçersiz teklif durumu sağlanmıştır." });
    }

    const db = readDb();
    if (!db.proposals) db.proposals = [];
    if (!db.transactions) db.transactions = [];

    const proposalIndex = db.proposals.findIndex(p => p.id === id);
    if (proposalIndex === -1) {
      return res.status(404).json({ error: "Güncellenmek istenen teklif kaydı bulunamadı." });
    }

    const oldStatus = db.proposals[proposalIndex].status;
    db.proposals[proposalIndex].status = status;

    // Trigger cari borç (transaction of type INCOME and category Teklif Kabulü) when changing to 'Kabul Edildi'
    if (status === 'Kabul Edildi' && oldStatus !== 'Kabul Edildi') {
      const proposal = db.proposals[proposalIndex];
      // Check if transaction already exists for this proposal to prevent duplicates
      const exists = db.transactions.some(tx => tx.proposalId === id && tx.category === "Teklif Kabulü");
      if (!exists) {
        const firm = db.firms.find(f => f.id === proposal.firmId);
        const firmName = firm ? firm.name : "Bilinmeyen Firma";
        
        const newTx: Transaction = {
          id: "tx-auto-" + Date.now(),
          date: proposal.date,
          type: "INCOME", // Billed income for us (recorded as Borç / charge in statement)
          amount: proposal.amount,
          currency: proposal.currency,
          description: `${firmName} - ${proposal.title} Teklif Kabulü`,
          category: "Teklif Kabulü",
          firmId: proposal.firmId,
          proposalId: proposal.id,
          createdAt: new Date().toISOString()
        };
        db.transactions.push(newTx);
      }
    } 
    // If status changed away from 'Kabul Edildi', clean up related auto-created transactions
    else if (status !== 'Kabul Edildi' && oldStatus === 'Kabul Edildi') {
      db.transactions = db.transactions.filter(tx => tx.proposalId !== id);
    }

    if (writeDb(db)) {
      res.json(db.proposals[proposalIndex]);
    } else {
      res.status(500).json({ error: "Teklif durumu güncellenirken veri tabanı hatası oluştu." });
    }
  });

  app.delete("/api/proposals/:id", checkAuth, (req, res) => {
    const { id } = req.params;
    const db = readDb();
    if (!db.proposals) db.proposals = [];
    if (!db.transactions) db.transactions = [];

    const index = db.proposals.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Silinmek istenen teklif bulunamadı." });
    }

    db.proposals.splice(index, 1);
    
    // Also clear associated automated transaction
    db.transactions = db.transactions.filter(tx => tx.proposalId !== id);

    writeDb(db);
    res.json({ success: true, message: "Teklif ve ilişkili cari borç kaydı başarıyla silindi." });
  });

  // REST API Config & Status Enquiries (Ensures no config errors)
  app.get("/api/config", (req, res) => {
    res.json({
      id: "operasyonel-takip-paneli",
      name: "Operasyonel Takip Paneli",
      status: "active",
      version: "2.1.0",
      exchangeRateApi: "https://open.er-api.com/v6/latest/GBP",
      backupSystem: "enabled",
      tokenRequired: isTokenRequired
    });
  });

  app.get("/config.json", (req, res) => {
    res.json({
      id: "operasyonel-takip-paneli",
      name: "Operasyonel Takip Paneli",
      status: "active",
      version: "2.1.0",
      exchangeRateApi: "https://open.er-api.com/v6/latest/GBP",
      backupSystem: "enabled",
      tokenRequired: isTokenRequired
    });
  });

  // Real-time currency rates router with fallback integration
  app.get("/api/rates", async (req, res) => {
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/GBP");
      if (response.ok) {
        const data = await response.json();
        const tryRate = data.rates?.TRY || 43.15;
        return res.json({ success: true, base: "GBP", rates: { TRY: tryRate } });
      }
    } catch (err) {
      console.warn("Could not fetch rates from public API, using default:", err);
    }
    res.json({ success: true, base: "GBP", rates: { TRY: 43.15 } });
  });

  // Database Backup Restoration Endpoint
  app.post("/api/backup/restore", checkAuth, (req, res) => {
    const { firms, personnel, records, transactions, proposals } = req.body;
    
    if (!Array.isArray(firms) || !Array.isArray(personnel) || !Array.isArray(records) || !Array.isArray(transactions)) {
      return res.status(400).json({ error: "Geçersiz yedek dosyası şeması. Gerekli veriler bulunamadı." });
    }

    const db = readDb();
    db.firms = firms;
    db.personnel = personnel;
    db.records = records;
    db.transactions = transactions;
    if (Array.isArray(proposals)) {
      db.proposals = proposals;
    }
    
    if (writeDb(db)) {
      res.json({ success: true, message: "Veri tabanı yedeği başarıyla geri yüklendi." });
    } else {
      res.status(500).json({ error: "Yedek geri yüklenirken veri tabanı yazma hatası oluştu." });
    }
  });

  // PERSONEL AVANS VE MAAS HESAPLAMA API'LERI
  app.get("/api/personnel-giderleri", checkAuth, (req, res) => {
    const db = readDb();
    res.json(db.personel_giderleri || []);
  });

  app.post("/api/personnel-giderleri", checkAuth, (req, res) => {
    const { personnelId, miktar_try, tarih, aciklama, exchangeRate, taksitSayisi } = req.body;

    if (!personnelId || !miktar_try || !tarih || !aciklama) {
      return res.status(400).json({ error: "Personel seçimi, miktar (TRY), tarih ve açıklama alanları zorunludur." });
    }

    const db = readDb();
    const personnel = db.personnel.find(p => p.id === personnelId);
    if (!personnel) {
      return res.status(404).json({ error: "İlgili personel bulunamadı." });
    }

    const valueTry = Number(miktar_try);
    if (isNaN(valueTry) || valueTry <= 0) {
      return res.status(400).json({ error: "Miktar sıfırdan büyük geçerli bir sayı olmalıdır." });
    }

    const installmentCount = Number(taksitSayisi) || 1;
    const monthlyAmount = Math.round((valueTry / installmentCount) * 100) / 100;

    const id = "gider-" + Date.now();
    const txId = "tx-" + Date.now() + "-avans";

    const newGider = {
      id,
      personnelId,
      miktar_try: valueTry,
      tarih,
      aciklama,
      toplam_taksit: installmentCount,
      kalan_taksit: installmentCount,
      aylik_taksit_tutari_try: monthlyAmount,
      toplam_avans_try: valueTry,
      completed: false,
      txId,
      createdAt: new Date().toISOString()
    };

    if (!db.personel_giderleri) db.personel_giderleri = [];
    db.personel_giderleri.push(newGider);

    // Kasa Entegrasyonu: Kasadan GBP olarak düşülmeli
    const rate = Number(exchangeRate) || 43.15;
    const gbpAmount = Math.round((valueTry / rate) * 100) / 100;

    const installmentText = installmentCount > 1 ? ` (${installmentCount} Taksit - Aylık: ₺${monthlyAmount.toLocaleString("tr-TR")} TRY)` : "";
    const newTx = {
      id: txId,
      txGiderId: id,
      date: tarih,
      type: "EXPENSE" as const,
      amount: gbpAmount,
      currency: "GBP",
      description: `[Personel Avansı - ${personnel.fullName}] ${aciklama}${installmentText} (₺${valueTry.toLocaleString("tr-TR")} TRY karşılığı - Kur: ${rate})`,
      category: "Personel Avansı",
      personnelId,
      exchangeRate: rate,
      gbpEquivalent: gbpAmount,
      createdAt: new Date().toISOString()
    };

    if (!db.transactions) db.transactions = [];
    db.transactions.push(newTx);

    if (writeDb(db)) {
      res.status(201).json({ success: true, newGider, newTx });
    } else {
      res.status(500).json({ error: "Veri kaydedilirken hata oluştu." });
    }
  });

  // DELETE PERSONNEL ADVANCE
  app.delete("/api/personnel/avans-sil/:id", checkAuth, (req, res) => {
    const { id } = req.params;
    const db = readDb();
    
    if (!db.personel_giderleri) db.personel_giderleri = [];
    const index = db.personel_giderleri.findIndex(g => g.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Avans kaydı bulunamadı." });
    }
    
    const coderGider = db.personel_giderleri[index];
    
    // Find linked transaction to delete
    if (db.transactions) {
      const txIndex = db.transactions.findIndex(t => {
        if (t.txGiderId === id) return true;
        if (t.id === coderGider.txId) return true;
        if (t.category === "Personel Avansı" && t.personnelId === coderGider.personnelId) {
          return t.description.includes(coderGider.aciklama) || t.description.includes(String(coderGider.miktar_try));
        }
        return false;
      });
      if (txIndex !== -1) {
        db.transactions.splice(txIndex, 1);
      }
    }
    
    db.personel_giderleri.splice(index, 1);
    
    if (writeDb(db)) {
      res.json({ success: true, message: "Avans kaydı ve ilişkili kasa hareketi başarıyla silindi." });
    } else {
      res.status(500).json({ error: "Avans kaydı silinirken hata oluştu." });
    }
  });

  // EDIT PERSONNEL ADVANCE
  app.put("/api/personnel/avans-duzenle/:id", checkAuth, (req, res) => {
    const { id } = req.params;
    const { miktar_try, aciklama, taksitSayisi, exchangeRate, tarih } = req.body;
    
    if (!miktar_try || !tarih || !aciklama) {
      return res.status(400).json({ error: "Miktar, tarih ve açıklama alanları zorunludur." });
    }
    
    const db = readDb();
    if (!db.personel_giderleri) db.personel_giderleri = [];
    const gider = db.personel_giderleri.find(g => g.id === id);
    if (!gider) {
      return res.status(404).json({ error: "Avans kaydı bulunamadı." });
    }
    
    const personnel = db.personnel.find(p => p.id === gider.personnelId);
    if (!personnel) {
      return res.status(404).json({ error: "Avans kaydının personeli sistemde bulunamadı." });
    }
    
    const valueTry = Number(miktar_try);
    if (isNaN(valueTry) || valueTry <= 0) {
      return res.status(400).json({ error: "Miktar sıfırdan büyük geçerli bir sayı olmalıdır." });
    }
    
    const installmentCount = Number(taksitSayisi) || 1;
    const monthlyAmount = Math.round((valueTry / installmentCount) * 100) / 100;
    
    // Update installment math
    const completedCount = Math.max(0, (gider.toplam_taksit || 1) - (gider.kalan_taksit ?? 1));
    const newKalanTaksit = Math.max(0, installmentCount - completedCount);
    
    // Update advance record
    gider.miktar_try = valueTry;
    gider.tarih = tarih;
    gider.aciklama = aciklama;
    gider.toplam_taksit = installmentCount;
    gider.kalan_taksit = newKalanTaksit;
    gider.aylik_taksit_tutari_try = monthlyAmount;
    gider.toplam_avans_try = valueTry;
    gider.completed = newKalanTaksit <= 0;
    
    // Find and update linked transaction
    const rate = Number(exchangeRate) || 43.15;
    const gbpAmount = Math.round((valueTry / rate) * 100) / 100;
    const installmentText = installmentCount > 1 ? ` (${installmentCount} Taksit - Aylık: ₺${monthlyAmount.toLocaleString("tr-TR")} TRY)` : "";
    
    if (db.transactions) {
      const tx = db.transactions.find(t => {
        if (t.txGiderId === id) return true;
        if (t.id === gider.txId) return true;
        if (t.category === "Personel Avansı" && t.personnelId === gider.personnelId) {
          return t.description.includes(gider.aciklama) || t.description.includes(String(gider.miktar_try));
        }
        return false;
      });
      
      if (tx) {
        tx.date = tarih;
        tx.amount = gbpAmount;
        tx.description = `[Personel Avansı - ${personnel.fullName}] ${aciklama}${installmentText} (₺${valueTry.toLocaleString("tr-TR")} TRY karşılığı - Kur: ${rate})`;
        tx.exchangeRate = rate;
        tx.gbpEquivalent = gbpAmount;
      } else {
        // Recreate if not found
        const txId = "tx-" + Date.now() + "-avans";
        gider.txId = txId;
        const newTx = {
          id: txId,
          txGiderId: id,
          date: tarih,
          type: "EXPENSE" as const,
          amount: gbpAmount,
          currency: "GBP",
          description: `[Personel Avansı - ${personnel.fullName}] ${aciklama}${installmentText} (₺${valueTry.toLocaleString("tr-TR")} TRY karşılığı - Kur: ${rate})`,
          category: "Personel Avansı",
          personnelId: gider.personnelId,
          exchangeRate: rate,
          gbpEquivalent: gbpAmount,
          createdAt: new Date().toISOString()
        };
        db.transactions.push(newTx);
      }
    }
    
    if (writeDb(db)) {
      res.json({ success: true, updatedGider: gider, message: "Avans kaydı ve ilişkili kasa hareketi başarıyla güncellendi." });
    } else {
      res.status(500).json({ error: "Avans kaydı güncellenirken hata oluştu." });
    }
  });

  // PERSONEL HAKEDIS HESAPLAMA VE KASADAN ODEME ENDPOINT
  app.post("/api/personnel/calculate-and-pay", checkAuth, (req, res) => {
    const { personnelId, calisilanGun, toplamMesaiSaati, ay, exchangeRate } = req.body;

    if (!personnelId || calisilanGun === undefined || toplamMesaiSaati === undefined || !ay) {
      return res.status(400).json({ error: "Eksik parametreler sağlandı." });
    }

    const db = readDb();
    const personnel = db.personnel.find(p => p.id === personnelId);
    if (!personnel) {
      return res.status(404).json({ error: "Personel bulunamadı." });
    }

    const aylikMaas = personnel.aylik_maas_try || 50000;
    const mesaiSaatUcreti = personnel.mesai_saat_ucreti_try || 500;
    const rate = Number(exchangeRate) || 43.15;

    // Matematiksel Hesap Motoru (26 is gunlu)
    const gunlukUcret = aylikMaas / 26;
    const hakEdilenTabanMaas = Number(calisilanGun) * gunlukUcret;
    const toplamMesaiUcreti = Number(toplamMesaiSaati) * mesaiSaatUcreti;

    // Otomatik Maaş Kesinti Filtresi:
    // Sadece o aya isabet eden aktif avans taksitlerinin toplamı (aylik_taksit_tutari_try) kesilmelidir.
    // Geriye dönük veya yeni taksitli avansları desteklemek için kalan_taksit > 0 veya completed !== true olmalı,
    // ve avans tarihi o aya eşit ya da o aydan eski olmalıdır (yani taksit vadesi gelmiş olmalıdır).
    const activeAdvances = (db.personel_giderleri || []).filter(g => {
      if (g.personnelId !== personnelId) return false;
      if (g.completed) return false;
      
      const kalanTaksit = g.kalan_taksit !== undefined ? g.kalan_taksit : 1;
      if (kalanTaksit <= 0) return false;

      const advanceMonth = g.tarih.substring(0, 7);
      return advanceMonth <= ay;
    });

    const totalAvansTry = activeAdvances.reduce((sum, g) => {
      const monthlyAmount = g.aylik_taksit_tutari_try !== undefined ? g.aylik_taksit_tutari_try : g.miktar_try;
      return sum + monthlyAmount;
    }, 0);

    const kalanOdenecekNet = (hakEdilenTabanMaas + toplamMesaiUcreti) - totalAvansTry;

    if (kalanOdenecekNet <= 0) {
      return res.status(400).json({ error: "Kalan ödenecek net tutar 0 veya daha az olduğu için kasa ödeme kaydı oluşturulmadı." });
    }

    // Kasa ledger gider kaydı oluştur (Sterling)
    const gbpAmount = Math.round((kalanOdenecekNet / rate) * 100) / 100;

    // Taksit azalmalarını işleyelim ve veritabanına kaydedelim.
    (db.personel_giderleri || []).forEach(g => {
      if (g.personnelId === personnelId && !g.completed) {
        const kalanTaksitBefore = g.kalan_taksit !== undefined ? g.kalan_taksit : 1;
        const advanceMonth = g.tarih.substring(0, 7);
        if (advanceMonth <= ay && kalanTaksitBefore > 0) {
          const yeniKalan = kalanTaksitBefore - 1;
          g.kalan_taksit = yeniKalan;
          if (yeniKalan === 0) {
            g.completed = true;
          }
          if (g.toplam_taksit === undefined) g.toplam_taksit = 1;
          if (g.aylik_taksit_tutari_try === undefined) g.aylik_taksit_tutari_try = g.miktar_try;
          if (g.toplam_avans_try === undefined) g.toplam_avans_try = g.miktar_try;
        }
      }
    });

    const newTx = {
      id: "tx-" + Date.now() + "-maas",
      date: new Date().toISOString().slice(0, 10),
      type: "EXPENSE" as const,
      amount: gbpAmount,
      currency: "GBP",
      description: `Personel Maaş Ödemesi - ${personnel.fullName} (${ay} Dönemi | Gün: ${calisilanGun}, Mesai: ${toplamMesaiSaati}s, Hakediş: ₺${Math.round(hakEdilenTabanMaas + toplamMesaiUcreti).toLocaleString("tr-TR")} TRY, Kesilen Avans: -₺${totalAvansTry.toLocaleString("tr-TR")} TRY)`,
      category: "Personel Maaşı",
      personnelId,
      exchangeRate: rate,
      gbpEquivalent: gbpAmount,
      createdAt: new Date().toISOString()
    };

    if (!db.transactions) db.transactions = [];
    db.transactions.push(newTx);

    if (writeDb(db)) {
      res.json({
        success: true,
        summary: {
          personnelName: personnel.fullName,
          ay,
          gunlukUcret,
          hakEdilenTabanMaas,
          toplamMesaiUcreti,
          totalAvansTry,
          kalanOdenecekNet,
          gbpAmount,
          rate
        },
        newTx
      });
    } else {
      res.status(500).json({ error: "Maaş ödemesi Kasa defterine yazılırken sunucu hatası oluştu." });
    }
  });

  // Global static config router for clean JSON error logging to ensure no HTML pages leak for 404s under API prefix
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "İstenen API uç noktası bulunamadı." });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // ============================================================
  // 📡 LAN IP TARAYICI – Tüm aktif arayüzleri listele
  // ============================================================
  function getAllLanIPv4(): { name: string; address: string }[] {
    const result: { name: string; address: string }[] = [];
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
      const list = ifaces[name];
      if (!list) continue;
      for (const info of list) {
        // IPv4 ve internal olmayan (localhost değil)
        if (info.family === "IPv4" && !info.internal) {
          result.push({ name, address: info.address });
        }
      }
    }
    return result;
  }

  app.listen(PORT, "0.0.0.0", () => {
    const lan = getAllLanIPv4();
    const line = "═".repeat(72);
    console.log("\n" + line);
    console.log("✅  EKİNOKS OFİS YÖNETİM SUNUCUSU AYAĞA KALKTI");
    console.log(line);
    console.log(`   🖥️   Yerel (sadece bu bilgisayar): http://localhost:${PORT}/static/`);
    console.log("");
    console.log("👉  TELEFONDAN ERİŞMEK İÇİN BU ADRESLERİ DENEYİN:");
    console.log("    (Adres çubuğuna mutlaka 'http://' ön ekiyle yazın!)");
    console.log("");
    if (lan.length === 0) {
      console.log("   ⚠️   Hiç aktif LAN arayüzü bulunamadı. Hotspot'u açın.");
    } else {
      for (const ip of lan) {
        // Mobil Hotspot adaptörünü vurgula (Windows: 192.168.137.x)
        const isHotspot = ip.address.startsWith("192.168.137.");
        const tag = isHotspot ? "  ⭐ [HOTSPOT - PERSONEL BUNU KULLANSIN]" : "";
        console.log(`   📱  http://${ip.address}:${PORT}/static/    (${ip.name})${tag}`);
      }
    }
    console.log("");
    console.log("   ℹ️   API testi:  http://<ip>:" + PORT + "/api/personnel");
    console.log(line);
    console.log("⏰  Başlangıç:", new Date().toLocaleString("tr-TR"));
    console.log(line + "\n");
  });
}

startServer().catch(err => {
  console.error("Failed to start server", err);
});
