// Ekinoks Mimarlık Personnel Mobile Entry JavaScript Application
// Offline-First via LocalStorage, Service Worker & Auto-Sync Sync Queue
document.addEventListener("DOMContentLoaded", () => {
  // UI Selector Elements
  const personnelSelect = document.getElementById("personnel-select");
  const statusPanel = document.getElementById("status-panel");
  const statusText = document.getElementById("status-text");
  const btnCheckIn = document.getElementById("btn-checkin");
  const btnCheckOut = document.getElementById("btn-checkout");
  const connectionStatusCard = document.getElementById("connection-status-card");
  const connectionStatusText = document.getElementById("connection-status-text");
  const statusPulse = document.getElementById("status-pulse");
  const statusDot = document.getElementById("status-dot");
  const syncBadgeContainer = document.getElementById("sync-badge-container");
  const btnForceSync = document.getElementById("btn-force-sync");

  // Application State cached in LocalStorage
  let personnelList = JSON.parse(localStorage.getItem("personnel_list") || "[]");
  let recordsList = JSON.parse(localStorage.getItem("records_list") || "[]");
  let isServerOnline = false;
  let isSyncing = false;

  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/static/service-worker.js')
        .then((reg) => {
          console.log("[PWA] Service Worker registered successfully! Scope:", reg.scope);
        })
        .catch((err) => {
          console.error("[PWA] Service Worker registration failed:", err);
        });
    });
  }

  // Get Queue from LocalStorage
  function getOfflineQueue() {
    return JSON.parse(localStorage.getItem("offline_queue") || "[]");
  }

  // Save Queue to LocalStorage
  function saveOfflineQueue(queue) {
    localStorage.setItem("offline_queue", JSON.stringify(queue));
    renderSyncStatus();
  }

  // Render network status visual badges
  function updateConnectionUI(online) {
    isServerOnline = online;
    if (online) {
      statusPulse.className = "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75";
      statusDot.className = "relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500";
      connectionStatusText.textContent = "🟢 Sunucuya Bağlantı Var";
      connectionStatusText.className = "text-xs font-bold text-emerald-800";
      connectionStatusCard.className = "mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between transition-all";
    } else {
      statusPulse.className = "hidden";
      statusDot.className = "relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500";
      connectionStatusText.textContent = "🔴 Çevrimdışı Çalışma Modu";
      connectionStatusText.className = "text-xs font-bold text-rose-800";
      connectionStatusCard.className = "mb-4 p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-between transition-all";
    }
  }

  // Render pending synchronization indicator
  function renderSyncStatus() {
    const queue = getOfflineQueue();
    if (queue.length > 0) {
      syncBadgeContainer.classList.remove("hidden");
      const isSyncingLabel = isSyncing ? "Eşitleniyor..." : `Eşitlenmeyen Kayıt: ${queue.length} adet`;
      document.getElementById("sync-pending-badge").innerHTML = `⏳ ${isSyncingLabel}`;
      btnForceSync.classList.remove("hidden");
    } else {
      syncBadgeContainer.classList.add("hidden");
      btnForceSync.classList.add("hidden");
    }
  }

  // Check backend server availability
  async function pingServer() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

      const response = await fetch("/api/personnel", {
        headers: { "authtoken": "test-admin-token-2026" },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        updateConnectionUI(true);
        return true;
      }
    } catch (err) {
      // Server down or network offline
    }
    updateConnectionUI(false);
    return false;
  }

  // Return merged records representation for accurate active state reporting
  function getLogicalRecordsList() {
    let merged = JSON.parse(JSON.stringify(recordsList));
    const queue = getOfflineQueue();

    queue.forEach(item => {
      if (item.type === "checkin") {
        const alreadyExists = merged.some(r => r.personnelId === item.payload.personnelId && r.checkIn === item.payload.checkIn);
        if (!alreadyExists) {
          merged.push({
            id: item.tempId,
            personnelId: item.payload.personnelId,
            firmId: item.payload.firmId || "ofis",
            checkIn: item.payload.checkIn,
            checkOut: null,
            note: item.payload.note,
            isTemp: true
          });
        }
      } else if (item.type === "checkout") {
        const targetId = item.recordId || item.parentTempId;
        const record = merged.find(r => r.id === targetId);
        if (record) {
          record.checkOut = item.payload.checkOut;
          record.note = item.payload.note;
        }
      }
    });

    return merged;
  }

  // Populate Personnel dropdown
  function renderPersonnelDropdown() {
    if (personnelList.length === 0) {
      personnelSelect.innerHTML = '<option value="">-- Personel Listesi Yok (Çevrimdışı) --</option>';
      return;
    }

    let optionsHtml = '<option value="">-- Lütfen İsminizi Seçin --</option>';
    personnelList.forEach(p => {
      optionsHtml += `<option value="${p.id}">${p.fullName} (${p.role})</option>`;
    });
    personnelSelect.innerHTML = optionsHtml;
  }

  // Evaluate buttons enabled/disabled states based on merged local/server shifts
  function evaluateButtonStates() {
    const selectedId = personnelSelect.value;
    
    if (!selectedId) {
      btnCheckIn.disabled = true;
      btnCheckOut.disabled = true;
      statusPanel.classList.add("hidden");
      return;
    }

    const logicalRecords = getLogicalRecordsList();
    const activeSession = logicalRecords.find(r => r.personnelId === selectedId && r.checkOut === null);

    if (activeSession) {
      statusPanel.classList.remove("hidden");
      const dateStr = new Date(activeSession.checkIn).toLocaleString("tr-TR");
      const badgeHtml = activeSession.isTemp ? " (Senkronize Ediliyor)" : "";
      statusText.innerHTML = `Mesaîniz Açık<span class="text-amber-600 font-semibold">${badgeHtml}</span><br/><span class="text-xs text-slate-500 font-normal">Giriş: ${dateStr}</span>`;

      btnCheckIn.disabled = true;
      btnCheckOut.disabled = false; // Always enabled for offline check-outs
    } else {
      statusPanel.classList.remove("hidden");
      statusText.innerHTML = `<span class="text-emerald-600 font-bold">Mesaî Dışı (Giriş Yapmaya Hazır)</span>`;

      btnCheckIn.disabled = false; // Always enabled for offline check-ins
      btnCheckOut.disabled = true;
    }
  }

  // Load backend data if online, else fall back gracefully
  async function loadData() {
    const serverActive = await pingServer();

    // Render current local states immediately
    renderPersonnelDropdown();
    evaluateButtonStates();
    renderSyncStatus();

    if (serverActive) {
      try {
        const responsePers = await fetch("/api/personnel", {
          headers: { "authtoken": "test-admin-token-2026" }
        });
        if (responsePers.ok) {
          personnelList = await responsePers.json();
          localStorage.setItem("personnel_list", JSON.stringify(personnelList));
          renderPersonnelDropdown();
        }

        const responseRecs = await fetch("/api/records", {
          headers: { "authtoken": "test-admin-token-2026" }
        });
        if (responseRecs.ok) {
          recordsList = await responseRecs.json();
          localStorage.setItem("records_list", JSON.stringify(recordsList));
        }

        evaluateButtonStates();
        
        // Auto trigger queue synchronization if there are outstanding activities
        syncOfflineQueue();
      } catch (err) {
        console.warn("Otomatik veri çekme esnasında ağ hatası oluştu:", err);
      }
    }
  }

  // Core Sync Engine: process local storage queue sequentially
  async function syncOfflineQueue() {
    if (isSyncing) return;
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    // Check availability
    const online = await pingServer();
    if (!online) return;

    isSyncing = true;
    renderSyncStatus();

    let tempIdMap = {};
    let indicesToRemove = [];

    try {
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];

        if (item.type === "checkin") {
          try {
            const response = await fetch("/api/records", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "authtoken": "test-admin-token-2026"
              },
              body: JSON.stringify({
                personnelId: item.payload.personnelId,
                firmId: item.payload.firmId,
                checkIn: item.payload.checkIn,
                note: item.payload.note
              })
            });

            if (response.ok || response.status === 400) {
              // A 400 error implies redundant data (e.g., active shift exists on server already)
              indicesToRemove.push(i);
              if (response.ok) {
                const newRecord = await response.json();
                tempIdMap[item.tempId] = newRecord.id;
              }
            } else {
              // Wait for subsequent retries on 500 or temporary failures
              break;
            }
          } catch (netErr) {
            console.error("Giriş kaydı eşitlenirken hata oluştu:", netErr);
            break;
          }
        } 
        else if (item.type === "checkout") {
          let targetId = item.recordId;
          if (!targetId && item.parentTempId) {
            targetId = tempIdMap[item.parentTempId];
          }

          if (!targetId) {
            // Self-repair: If we don't have a linked ID because of offline state reset, 
            // query active server sessions for this personnel and map it.
            try {
              const queryRes = await fetch("/api/records", {
                headers: { "authtoken": "test-admin-token-2026" }
              });
              if (queryRes.ok) {
                const liveRecords = await queryRes.json();
                const matchedSession = liveRecords.find(r => r.personnelId === item.targetPersonnelId && r.checkOut === null);
                if (matchedSession) {
                  targetId = matchedSession.id;
                }
              }
            } catch (err) {}
          }

          if (!targetId) {
            // If we still can't resolve target session, discard to avoid infinite locks
            indicesToRemove.push(i);
            continue;
          }

          try {
            const response = await fetch(`/api/records/${targetId}/checkout`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "authtoken": "test-admin-token-2026"
              },
              body: JSON.stringify({
                checkOut: item.payload.checkOut,
                note: item.payload.note
              })
            });

            if (response.ok || response.status === 400 || response.status === 404) {
              indicesToRemove.push(i);
            } else {
              break;
            }
          } catch (netErr) {
            console.error("Çıkış kaydı eşitlenirken hata oluştu:", netErr);
            break;
          }
        }
      }

      // Re-read queue and remove processed indices
      let currentQueue = getOfflineQueue();
      // Remove backwards to protect indices sequence
      indicesToRemove.sort((a,b) => b - a).forEach(idx => {
        currentQueue.splice(idx, 1);
      });
      saveOfflineQueue(currentQueue);

      // Reload fresh data from server
      const responseRecs = await fetch("/api/records", {
        headers: { "authtoken": "test-admin-token-2026" }
      });
      if (responseRecs.ok) {
        recordsList = await responseRecs.json();
        localStorage.setItem("records_list", JSON.stringify(recordsList));
      }

    } catch (gErr) {
      console.error("Genel senkronizasyon hatası:", gErr);
    } finally {
      isSyncing = false;
      renderSyncStatus();
      evaluateButtonStates();
    }
  }

  // Handle personnel selection change
  personnelSelect.addEventListener("change", evaluateButtonStates);

  // Submit Shift Check-In
  btnCheckIn.addEventListener("click", async () => {
    const selectedId = personnelSelect.value;
    if (!selectedId) return;

    btnCheckIn.disabled = true;
    const nowLocalStr = getLocalISOString();
    const tempId = "temp-rec-" + Date.now();

    // 1. Create offline-first temporary check-in
    const dummyRecord = {
      id: tempId,
      personnelId: selectedId,
      firmId: "ofis",
      checkIn: nowLocalStr,
      checkOut: null,
      note: "Mobil cihazından çevrimdışı giriş yaptı.",
      isTemp: true
    };

    // Save locally
    recordsList.push(dummyRecord);
    localStorage.setItem("records_list", JSON.stringify(recordsList));

    // 2. Queue the item
    let queue = getOfflineQueue();
    queue.push({
      type: "checkin",
      tempId: tempId,
      payload: {
        personnelId: selectedId,
        firmId: "ofis",
        checkIn: nowLocalStr,
        note: "Mobil cihazından çevrimdışı giriş yaptı."
      }
    });
    saveOfflineQueue(queue);

    // Apply immediate UI response (Zero latency feedback)
    evaluateButtonStates();

    // 3. Attempt background synchronization instantly
    syncOfflineQueue();
  });

  // Submit Shift Check-Out
  btnCheckOut.addEventListener("click", async () => {
    const selectedId = personnelSelect.value;
    if (!selectedId) return;

    // Find the logically active session
    const logicalRecords = getLogicalRecordsList();
    const activeSession = logicalRecords.find(r => r.personnelId === selectedId && r.checkOut === null);
    if (!activeSession) return;

    btnCheckOut.disabled = true;
    const nowLocalStr = getLocalISOString();

    // 1. Update checkout locally
    const savedActiveSession = recordsList.find(r => r.id === activeSession.id);
    if (savedActiveSession) {
      savedActiveSession.checkOut = nowLocalStr;
      savedActiveSession.note = "Mobil cihazından çevrimdışı çıkış yaptı.";
    } else {
      // If was temporary record
      activeSession.checkOut = nowLocalStr;
      activeSession.note = "Mobil cihazından çevrimdışı çıkış yaptı.";
      recordsList.push(activeSession);
    }
    localStorage.setItem("records_list", JSON.stringify(recordsList));

    // 2. Queue the item
    let queue = getOfflineQueue();
    const queueItem = {
      type: "checkout",
      targetPersonnelId: selectedId,
      payload: {
        checkOut: nowLocalStr,
        note: "Mobil cihazından çevrimdışı çıkış yaptı."
      }
    };

    if (activeSession.id.startsWith("temp-")) {
      queueItem.parentTempId = activeSession.id;
    } else {
      queueItem.recordId = activeSession.id;
    }

    queue.push(queueItem);
    saveOfflineQueue(queue);

    // Dynamic state update
    evaluateButtonStates();

    // 3. Attempt background synchronization
    syncOfflineQueue();
  });

  // Force sync click
  btnForceSync.addEventListener("click", () => {
    syncOfflineQueue();
  });

  // Utility to obtain Local ISO date representation
  function getLocalISOString() {
    const now = new Date();
    const tzoffset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now.getTime() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  }

  // Event Listeners for Reactive Browser Online restoration
  window.addEventListener("online", () => {
    pingServer().then(online => {
      if (online) syncOfflineQueue();
    });
  });

  window.addEventListener("offline", () => {
    updateConnectionUI(false);
  });

  // Boot Application
  loadData();

  // Schedule background routines
  setInterval(pingServer, 10000); // Check server health every 10s
  setInterval(syncOfflineQueue, 15000); // Check and attempt sync every 15s
});
