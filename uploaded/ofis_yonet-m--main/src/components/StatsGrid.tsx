/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Firm, Personnel, WorkRecord } from "../types";
import { Building2, Users2, Play, CheckCircle2, Clock } from "lucide-react";

interface StatsGridProps {
  firms: Firm[];
  personnel: Personnel[];
  records: WorkRecord[];
}

export default function StatsGrid({ firms, personnel, records }: StatsGridProps) {
  const totalFirms = firms.length;
  const totalPersonnel = personnel.length;
  const activeSessions = records.filter(r => r.checkOut === null).length;
  const completedSessions = records.filter(r => r.checkOut !== null).length;

  // Let's also calculate approximate total days/hours worked for the completed ones
  let totalMinutesWorked = 0;
  records.forEach(r => {
    if (r.checkOut) {
      const start = new Date(r.checkIn).getTime();
      const end = new Date(r.checkOut).getTime();
      if (end > start) {
        totalMinutesWorked += Math.floor((end - start) / (1000 * 60));
      }
    }
  });

  const totalHours = Math.floor(totalMinutesWorked / 60);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4" id="stats-grid">
      {/* Total Firms Card */}
      <div 
        id="stat-card-firms"
        className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 transition-all hover:shadow-md hover:border-slate-200"
      >
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 capitalize tracking-wide">Firma Sayısı</p>
          <h3 className="text-2xl font-bold text-slate-800 font-sans tracking-tight mt-0.5">{totalFirms}</h3>
        </div>
      </div>

      {/* Total Personnel Card */}
      <div 
        id="stat-card-personnel"
        className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 transition-all hover:shadow-md hover:border-slate-200"
      >
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
          <Users2 className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 capitalize tracking-wide">Kayıtlı Personel</p>
          <h3 className="text-2xl font-bold text-slate-800 font-sans tracking-tight mt-0.5">{totalPersonnel}</h3>
        </div>
      </div>

      {/* Active Work Session Card */}
      <div 
        id="stat-card-active"
        className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 transition-all hover:shadow-md hover:border-slate-200"
      >
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
          <div className="relative">
            <Play className="w-6 h-6 fill-emerald-100" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 capitalize tracking-wide">Aktif Çalışanlar</p>
          <h3 className="text-2xl font-bold text-slate-800 font-sans tracking-tight mt-0.5">{activeSessions}</h3>
        </div>
      </div>

      {/* Completed Works Card */}
      <div 
        id="stat-card-completed"
        className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 transition-all hover:shadow-md hover:border-slate-200"
      >
        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 capitalize tracking-wide">Biten Çalışmalar</p>
          <h3 className="text-2xl font-bold text-slate-800 font-sans tracking-tight mt-0.5">{completedSessions}</h3>
        </div>
      </div>

      {/* Total Hours Custom Card */}
      <div 
        id="stat-card-hours"
        className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 transition-all hover:shadow-md hover:border-slate-200"
      >
        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 capitalize tracking-wide">Toplam Mesai</p>
          <h3 className="text-2xl font-bold text-slate-800 font-sans tracking-tight mt-0.5">{totalHours} <span className="text-sm font-normal text-slate-400">Saat</span></h3>
        </div>
      </div>
    </div>
  );
}
