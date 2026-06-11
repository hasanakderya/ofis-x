/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Formats a given checkIn and checkOut string to a readable Turkish "X Gün, Y Saat" format
 * as requested under the smart duration calculator requirement.
 */
export function calculateAndFormatDuration(checkInStr: string, checkOutStr: string | null): string {
  if (!checkOutStr) {
    return "Devam Ediyor (Aktif)";
  }

  try {
    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return "Tarih Hatası";
    }

    const diffMs = checkOut.getTime() - checkIn.getTime();
    if (diffMs < 0) {
      return "Geriye Dönük Hatalı Tarih";
    }

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    if (totalMinutes === 0) {
      return "1 Dakikadan Az";
    }

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;

    const parts: string[] = [];
    if (days > 0) {
      parts.push(`${days} Gün`);
    }
    if (remainingHours > 0) {
      parts.push(`${remainingHours} Saat`);
    }
    // Show minutes if it is less than 1 day or has no hours
    if (remainingMinutes > 0 && days === 0) {
      parts.push(`${remainingMinutes} Dakika`);
    }

    if (parts.length === 0) {
      return "0 Dakika";
    }

    return parts.join(", ");
  } catch (error) {
    console.error("Duration calculation error", error);
    return "Hesaplanamadı";
  }
}

/**
 * Formats a date string into a nice human-readable Turkish date format
 * e.g., "22 Mayıs 2026 12:30"
 */
export function formatTurkishDateTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const months = [
      "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
      "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${day} ${month} ${year} - ${hours}:${minutes}`;
  } catch (err) {
    return dateStr;
  }
}

/**
 * Helper to get modern default local ISO string suited for datetime inputs
 * format: YYYY-MM-DDTHH:mm
 */
export function getLocalISOStringForInput(date = new Date()): string {
  const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
  const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
  return localISOTime;
}
