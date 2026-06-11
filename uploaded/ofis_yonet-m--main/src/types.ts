/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Firm {
  id: string;
  name: string;
  sector: string;
  manager: string;
  phone: string;
  address: string;
  createdAt: string;
}

export interface Personnel {
  id: string;
  idCardNo: string;
  fullName: string;
  role: string;
  phone: string;
  startDate: string;
  aylik_maas_try: number;
  mesai_saat_ucreti_try: number;
  createdAt: string;
}

export interface WorkRecord {
  id: string;
  personnelId: string;
  firmId: string;
  checkIn: string; // ISO DateTime string or YYYY-MM-DDTHH:mm
  checkOut: string | null; // ISO DateTime string or YYYY-MM-DDTHH:mm or null
  note?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: "INCOME" | "EXPENSE"; // Gelir / Gider
  amount: number;
  currency: string; // "TRY" | "GBP" | "USD" | "EUR"
  description: string;
  category: string;
  partnerId?: string; // Optional links for Partnership calculations
  personnelId?: string; // Optional link for Personnel expenses (Maaş/Avans)
  firmId?: string; // Associated firm for statement (Cari Hesap)
  exchangeRate?: number; // For TRY currency conversions
  gbpEquivalent?: number; // Equivalent GBP amount if TRY
  paymentMethod?: "Havale" | "Nakit"; // For tahsilat
  proposalId?: string; // For auto-created transactions from proposal
  txGiderId?: string; // Optional link for linked personnel advance/expense
  createdAt: string;
}

export interface Proposal {
  id: string;
  firmId: string;
  title: string;
  amount: number;
  currency: string; // "TRY" | "GBP" | "USD" | "EUR"
  status: 'Beklemede' | 'Kabul Edildi' | 'Reddedildi';
  date: string; // YYYY-MM-DD
  createdAt: string;
  notes?: string;
}

export interface PersonnelGideri {
  id: string;
  personnelId: string;
  miktar_try: number;
  tarih: string;
  aciklama: string;
  createdAt: string;
  toplam_taksit?: number;
  kalan_taksit?: number;
  aylik_taksit_tutari_try?: number;
  toplam_avans_try?: number;
  completed?: boolean;
  txId?: string; // Optional linked transaction ID
}

export interface DatabaseSchema {
  firms: Firm[];
  personnel: Personnel[];
  records: WorkRecord[];
  transactions: Transaction[];
  proposals?: Proposal[]; // Add support for proposals in database storage
  personel_giderleri?: PersonnelGideri[];
}
