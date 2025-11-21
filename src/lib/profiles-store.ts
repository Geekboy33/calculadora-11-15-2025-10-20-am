/**
 * Profiles Store
 * Gestión avanzada de perfiles redundantes con cifrado, compresión,
 * versionado, exportación/importación y snapshots automáticos.
 */

import CryptoJS from 'crypto-js';
import LZString from 'lz-string';
import { StorageManager } from './storage-manager';
import { transactionEventStore } from './transaction-event-store';
import { processingStore } from './processing-store';
import { ledgerPersistenceStore } from './ledger-persistence-store';

interface SnapshotSectionMeta {
  id: string;
  label: string;
  keys: string[];
  size: number;
  percentage: number;
}

interface ProfileSnapshot {
  version: number;
  createdAt: string;
  encrypted: boolean;
  compressed: boolean;
  checksum: string;
  iv: string;
  payload: string;
  sections: SnapshotSectionMeta[];
}

interface ProfileHistoryEntry {
  snapshot: ProfileSnapshot | Record<string, string>;
  createdAt: string;
  checksum: string;
}

interface AutoSnapshotConfig {
  enabled: boolean;
  intervalMinutes: number;
  lastRun?: string;
  nextRun?: string;
  maxAutoProfiles?: number;
}

interface SnapshotDiffEntry {
  key: string;
  previous?: {
    hash: string;
    size: number;
  };
  current?: {
    hash: string;
    size: number;
  };
}

export interface SnapshotDiff {
  added: string[];
  removed: string[];
  changed: SnapshotDiffEntry[];
  summary: {
    totalKeysBefore: number;
    totalKeysAfter: number;
    bytesBefore: number;
    bytesAfter: number;
  };
}

export interface ProfileStats {
  keysCount: number;
  storageBytes: number;
  storageHuman: string;
  custodyAccounts: number;
  custodyTotal: number;
  pledgesCount: number;
  pledgesTotal: number;
  porReports: number;
  eventsCount: number;
  checksum?: string;
  sections?: SnapshotSectionMeta[];
  ledger?: {
    fileName?: string;
    progress?: number;
    status?: string;
    lastUpdateTime?: string;
    bytesProcessed?: number;
    fileSize?: number;
  };
}

export interface ProfileRecord {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  lastAppliedAt?: string;
  snapshot: ProfileSnapshot | Record<string, string>;
  stats: ProfileStats;
  history?: ProfileHistoryEntry[];
}

interface ProfilesState {
  profiles: ProfileRecord[];
  activeProfileId: string | null;
  lastUpdated: string | null;
  autoSnapshotConfig: AutoSnapshotConfig;
}

interface ProfilesStoragePayload extends ProfilesState {
  schemaVersion: number;
}

class ProfilesStore {
  private readonly STORAGE_KEY = 'Digital Commercial Bank Ltd_profiles_registry';
  private readonly SCHEMA_VERSION = 2;
  private readonly EXCLUDED_KEYS = new Set<string>([this.STORAGE_KEY]);
  private readonly ENCRYPTION_KEY = 'DAES_COREBANKING_PROFILES_V1';
  private readonly MAX_HISTORY_ENTRIES = 5;
  private autoSnapshotTimer: number | null = null;

  private state: ProfilesState = {
    profiles: [],
    activeProfileId: null,
    lastUpdated: null,
    autoSnapshotConfig: {
      enabled: false,
      intervalMinutes: 60,
      maxAutoProfiles: 5
    }
  };

  private listeners: Set<(state: ProfilesState) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  // ==========================================
  // Inicialización y persistencia
  // ==========================================

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed: ProfilesStoragePayload = JSON.parse(saved);
        this.state = {
          profiles: parsed.profiles || [],
          activeProfileId: parsed.activeProfileId || null,
          lastUpdated: parsed.lastUpdated || null,
          autoSnapshotConfig: parsed.autoSnapshotConfig || {
            enabled: false,
            intervalMinutes: 60,
            maxAutoProfiles: 5
          }
        };
        if (!this.state.autoSnapshotConfig.maxAutoProfiles) {
          this.state.autoSnapshotConfig.maxAutoProfiles = 5;
        }
        console.log('[ProfilesStore] ✅ Perfiles cargados:', this.state.profiles.length);
      }
    } catch (error) {
      console.error('[ProfilesStore] ❌ Error cargando perfiles:', error);
    } finally {
      this.setupAutoSnapshotTimer();
      this.notifyListeners();
    }
  }

  private persist(): void {
    const payload: ProfilesStoragePayload = {
      ...this.state,
      schemaVersion: this.SCHEMA_VERSION
    };

    const success = StorageManager.safeSetItem(this.STORAGE_KEY, JSON.stringify(payload));
    if (!success) {
      throw new Error('No se pudo guardar el registro de perfiles. Libera espacio en almacenamiento.');
    }

    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.state });
      } catch (error) {
        console.error('[ProfilesStore] Error en listener:', error);
      }
    });
  }

  subscribe(listener: (state: ProfilesState) => void) {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  getState(): ProfilesState {
    return { ...this.state };
  }

  getProfiles(): ProfileRecord[] {
    return [...this.state.profiles];
  }

  getActiveProfileId(): string | null {
    return this.state.activeProfileId;
  }

  getActiveProfile(): ProfileRecord | undefined {
    return this.state.profiles.find(p => p.id === this.state.activeProfileId);
  }

  getAutoSnapshotConfig(): AutoSnapshotConfig {
    return { ...this.state.autoSnapshotConfig };
  }

  configureAutoSnapshots(config: Partial<AutoSnapshotConfig>): AutoSnapshotConfig {
    this.state.autoSnapshotConfig = {
      ...this.state.autoSnapshotConfig,
      ...config,
      maxAutoProfiles:
        config.maxAutoProfiles ?? this.state.autoSnapshotConfig.maxAutoProfiles ?? 5
    };

    if (this.state.autoSnapshotConfig.enabled) {
      this.state.autoSnapshotConfig.nextRun = new Date(
        Date.now() + this.state.autoSnapshotConfig.intervalMinutes * 60_000
      ).toISOString();
    } else {
      this.state.autoSnapshotConfig.nextRun = undefined;
    }

    this.persist();
    this.setupAutoSnapshotTimer();
    return this.getAutoSnapshotConfig();
  }

  // ==========================================
  // Operaciones principales
  // ==========================================

  createProfile(name: string, description?: string): ProfileRecord {
    // Verificar que Ledger1 esté completamente cargado antes de permitir guardar
    const processingState = processingStore.getState();
    
    if (processingState && processingState.status === 'processing' && processingState.progress < 100) {
      throw new Error(
        `No se puede guardar perfil mientras Ledger1 está cargando.\n\n` +
        `Progreso actual: ${processingState.progress.toFixed(2)}%\n` +
        `Espera a que complete al 100% antes de guardar.`
      );
    }
    
    const profileName = name.trim() || `Perfil ${this.state.profiles.length + 1}`;
    const rawSnapshot = this.captureSnapshotData();
    const encryptedSnapshot = this.encryptSnapshot(rawSnapshot);
    const stats = this.calculateStats(rawSnapshot, encryptedSnapshot);
    const now = new Date().toISOString();

    const profile: ProfileRecord = {
      id: `profile_${Date.now()}`,
      name: profileName,
      description: description?.trim(),
      createdAt: now,
      updatedAt: now,
      snapshot: encryptedSnapshot,
      stats,
      history: []
    };

    this.state.profiles.unshift(profile);
    this.state.activeProfileId = profile.id;
    this.state.lastUpdated = now;

    this.persist();

    transactionEventStore.recordProfileCreated(
      profileName,
      this.toMB(stats.storageBytes),
      stats.keysCount
    );

    console.log('[ProfilesStore] 🆕 Perfil creado:', profileName);
    console.log('[ProfilesStore] 📊 Ledger1 incluido:', stats.ledger?.fileName, stats.ledger?.progress?.toFixed(2) + '%');
    return profile;
  }

  updateProfileSnapshot(profileId: string, description?: string): ProfileRecord {
    const profile = this.state.profiles.find(p => p.id === profileId);
    if (!profile) {
      throw new Error('Perfil no encontrado');
    }

    const previousSnapshot = profile.snapshot;
    const rawSnapshot = this.captureSnapshotData();
    const encryptedSnapshot = this.encryptSnapshot(rawSnapshot);
    const stats = this.calculateStats(rawSnapshot, encryptedSnapshot);
    const now = new Date().toISOString();

    if (previousSnapshot) {
      profile.history = [
        {
          snapshot: previousSnapshot,
          createdAt: profile.updatedAt,
          checksum: this.extractChecksum(previousSnapshot)
        },
        ...(profile.history || [])
      ].slice(0, this.MAX_HISTORY_ENTRIES);
    }

    profile.snapshot = encryptedSnapshot;
    profile.stats = stats;
    profile.updatedAt = now;
    if (description !== undefined) {
      profile.description = description.trim();
    }

    this.state.lastUpdated = now;
    this.persist();

    transactionEventStore.recordProfileUpdated(
      profile.name,
      this.toMB(stats.storageBytes),
      stats.keysCount
    );

    console.log('[ProfilesStore] ♻️ Snapshot actualizado para', profile.name);
    return profile;
  }

  deleteProfile(profileId: string): void {
    const profile = this.state.profiles.find(p => p.id === profileId);
    if (!profile) return;

    this.state.profiles = this.state.profiles.filter(p => p.id !== profileId);
    if (this.state.activeProfileId === profileId) {
      this.state.activeProfileId = this.state.profiles[0]?.id || null;
    }
    this.state.lastUpdated = new Date().toISOString();

    this.persist();
    transactionEventStore.recordProfileDeleted(profile.name);

    console.log('[ProfilesStore] 🗑️ Perfil eliminado:', profile.name);
  }

  async activateProfile(profileId: string, options?: { skipReload?: boolean; backgroundLedgerLoad?: boolean }): Promise<ProfileRecord> {
    const profile = this.state.profiles.find(p => p.id === profileId);
    if (!profile) {
      throw new Error('Perfil no encontrado');
    }

    console.log('[ProfilesStore] 🔄 Aplicando perfil:', profile.name);
    this.applySnapshot(profile.snapshot);

    const now = new Date().toISOString();
    profile.lastAppliedAt = now;
    this.state.activeProfileId = profile.id;
    this.state.lastUpdated = now;

    this.persist();
    transactionEventStore.recordProfileActivated(profile.name);

    try {
      await processingStore.loadState();
      ledgerPersistenceStore.refreshFromProfiles();
      
      // Si hay un archivo Ledger1 asociado, programar carga en segundo plano
      if (options?.backgroundLedgerLoad && profile.stats.ledger?.fileName) {
        console.log('[ProfilesStore] 🔄 Programando carga de Ledger1 en segundo plano');
        this.scheduleLedgerBackgroundLoad(profile);
      }
    } catch (error) {
      console.warn('[ProfilesStore] ⚠️ No se pudo refrescar ledger automáticamente:', error);
    }

    if (!options?.skipReload) {
      setTimeout(() => window.location.reload(), 1200);
    }

    return profile;
  }

  private scheduleLedgerBackgroundLoad(profile: ProfileRecord): void {
    // Disparar evento personalizado para que LargeFileDTC1BAnalyzer lo capture
    const event = new CustomEvent('profiles:trigger-ledger-load', {
      detail: {
        profileId: profile.id,
        profileName: profile.name,
        ledgerInfo: profile.stats.ledger,
        mode: 'background'
      }
    });
    window.dispatchEvent(event);
    console.log('[ProfilesStore] 📡 Evento de carga de Ledger1 disparado');
  }

  refreshLedgerFromActiveProfile(backgroundLoad: boolean = false): void {
    console.log('[ProfilesStore] 🔁 Solicitando refresco manual de ledger');
    processingStore.loadState().catch(err => {
      console.error('[ProfilesStore] Error recargando ProcessingStore:', err);
    });
    ledgerPersistenceStore.refreshFromProfiles();
    
    // Si se solicita carga en segundo plano, disparar evento
    if (backgroundLoad) {
      const activeProfile = this.getActiveProfile();
      if (activeProfile && activeProfile.stats.ledger?.fileName) {
        this.scheduleLedgerBackgroundLoad(activeProfile);
      }
    }
  }

  // Método público para solicitar carga en segundo plano
  requestBackgroundLedgerLoad(profileId: string): void {
    const profile = this.state.profiles.find(p => p.id === profileId);
    if (!profile || !profile.stats.ledger?.fileName) {
      console.warn('[ProfilesStore] No hay archivo Ledger1 asociado al perfil');
      return;
    }
    
    this.scheduleLedgerBackgroundLoad(profile);
  }

  exportProfile(profileId: string): string {
    const profile = this.state.profiles.find(p => p.id === profileId);
    if (!profile) {
      throw new Error('Perfil no encontrado');
    }

    const payload = {
      schemaVersion: this.SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      profile
    };

    transactionEventStore.recordProfileExported(profile.name);
    return JSON.stringify(payload, null, 2);
  }

  importProfile(serializedProfile: string): ProfileRecord {
    try {
      const parsed = JSON.parse(serializedProfile);
      if (!parsed.profile) {
        throw new Error('Formato inválido de perfil');
      }

      const profile: ProfileRecord = parsed.profile;
      profile.id = `import_${Date.now()}`;
      profile.name = profile.name || `Perfil importado ${new Date().toISOString()}`;
      profile.snapshot = this.normalizeSnapshot(profile.snapshot);
      profile.history = profile.history || [];

      if (!profile.stats) {
        const raw = this.resolveSnapshotData(profile.snapshot);
        profile.stats = this.calculateStats(
          raw,
          this.isEncryptedSnapshot(profile.snapshot)
            ? profile.snapshot
            : this.encryptSnapshot(raw)
        );
      }

      this.state.profiles.unshift(profile);
      this.state.lastUpdated = new Date().toISOString();
      this.persist();
      transactionEventStore.recordProfileImported(profile.name);
      return profile;
    } catch (error) {
      console.error('[ProfilesStore] Error importando perfil:', error);
      throw new Error('No se pudo importar el perfil. Verifica el archivo.');
    }
  }

  getProfileDiff(profileId: string, historyIndex: number = 0): SnapshotDiff | null {
    const profile = this.state.profiles.find(p => p.id === profileId);
    if (!profile) return null;
    const historyEntry = profile.history?.[historyIndex];
    if (!historyEntry) return null;

    const currentData = this.resolveSnapshotData(profile.snapshot);
    const previousData = this.resolveSnapshotData(historyEntry.snapshot);

    return this.calculateDiff(previousData, currentData);
  }

  triggerAutoSnapshot(reason: 'auto' | 'manual' = 'manual'): ProfileRecord | null {
    const config = this.state.autoSnapshotConfig;
    if (reason === 'auto' && !config.enabled) return null;

    const profileName =
      reason === 'auto'
        ? `Auto Snapshot ${new Date().toLocaleString()}`
        : `Snapshot ${new Date().toLocaleString()}`;
    const description =
      reason === 'auto'
        ? 'Snapshot automático programado'
        : 'Snapshot generado manualmente';

    const profile = this.createProfile(profileName, description);
    if (reason === 'auto') {
      transactionEventStore.recordProfileAutoSnapshot(profile.name, config.intervalMinutes);
      config.lastRun = new Date().toISOString();
      config.nextRun = new Date(
        Date.now() + config.intervalMinutes * 60_000
      ).toISOString();
      this.state.autoSnapshotConfig = { ...config };
      this.pruneAutoSnapshots();
      this.persist();
    }

    return profile;
  }

  // ==========================================
  // Utilidades internas
  // ==========================================

  private captureSnapshotData(): Record<string, string> {
    const snapshot: Record<string, string> = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || this.EXCLUDED_KEYS.has(key)) continue;
      const value = localStorage.getItem(key);
      if (value !== null) {
        snapshot[key] = value;
      }
    }

    return snapshot;
  }

  private applySnapshot(snapshot: ProfileSnapshot | Record<string, string>) {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || this.EXCLUDED_KEYS.has(key)) continue;
      keysToRemove.push(key);
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    const snapshotData = this.resolveSnapshotData(snapshot);
    Object.entries(snapshotData).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  }

  private calculateStats(
    snapshot: Record<string, string>,
    encryptedSnapshot: ProfileSnapshot
  ): ProfileStats {
    const snapshotSize = new Blob([JSON.stringify(snapshot)]).size;

    const summary: ProfileStats = {
      keysCount: Object.keys(snapshot).length,
      storageBytes: snapshotSize,
      storageHuman: this.formatBytes(snapshotSize),
      custodyAccounts: 0,
      custodyTotal: 0,
      pledgesCount: 0,
      pledgesTotal: 0,
      porReports: 0,
      eventsCount: 0,
      checksum: encryptedSnapshot.checksum,
      sections: encryptedSnapshot.sections
    };

    // Custody
    const custody = snapshot['Digital Commercial Bank Ltd_custody_accounts'];
    if (custody) {
      try {
        const parsed = JSON.parse(custody);
        const accounts = parsed.accounts || [];
        summary.custodyAccounts = accounts.length;
        summary.custodyTotal = accounts.reduce(
          (sum: number, acc: any) => sum + (acc?.totalBalance || 0),
          0
        );
      } catch (error) {
        console.warn('[ProfilesStore] Error leyendo cuentas custody en snapshot:', error);
      }
    }

    // Pledges
    const pledgesRaw = snapshot['unified_pledges'];
    if (pledgesRaw) {
      try {
        const pledges = JSON.parse(pledgesRaw);
        if (Array.isArray(pledges)) {
          summary.pledgesCount = pledges.length;
          summary.pledgesTotal = pledges.reduce(
            (sum: number, pledge: any) => sum + (pledge?.amount || 0),
            0
          );
        }
      } catch (error) {
        console.warn('[ProfilesStore] Error leyendo pledges en snapshot:', error);
      }
    }

    // PoR Reports
    const porRaw = snapshot['vusd_por_reports'];
    if (porRaw) {
      try {
        const reports = JSON.parse(porRaw);
        summary.porReports = Array.isArray(reports) ? reports.length : 0;
      } catch (error) {
        console.warn('[ProfilesStore] Error leyendo PoR en snapshot:', error);
      }
    }

    // Events
    const eventsRaw = snapshot['daes_transactions_events'];
    if (eventsRaw) {
      try {
        const events = JSON.parse(eventsRaw);
        summary.eventsCount = Array.isArray(events) ? events.length : 0;
      } catch (error) {
        console.warn('[ProfilesStore] Error leyendo eventos en snapshot:', error);
      }
    }

    // Ledger / Processing
    const processingRaw = snapshot['Digital Commercial Bank Ltd_processing_state'];
    if (processingRaw) {
      try {
        const processingState = JSON.parse(processingRaw);
        summary.ledger = {
          fileName: processingState.fileName,
          progress: processingState.progress,
          status: processingState.status,
          lastUpdateTime: processingState.lastUpdateTime,
          bytesProcessed: processingState.bytesProcessed,
          fileSize: processingState.fileSize
        };
      } catch (error) {
        console.warn('[ProfilesStore] Error leyendo processing_state en snapshot:', error);
      }
    }

    return summary;
  }

  private encryptSnapshot(snapshot: Record<string, string>): ProfileSnapshot {
    try {
      const sections = this.buildSections(snapshot);
      const json = JSON.stringify(snapshot);
      const compressed = LZString.compressToBase64(json) || '';
      const ivWordArray = CryptoJS.lib.WordArray.random(16);
      const encrypted = CryptoJS.AES.encrypt(
        compressed,
        this.getEncryptionKey(),
        {
          iv: ivWordArray,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        }
      );

      return {
        version: this.SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        encrypted: true,
        compressed: true,
        checksum: this.calculateChecksum(compressed),
        iv: CryptoJS.enc.Hex.stringify(ivWordArray),
        payload: encrypted.toString(),
        sections
      };
    } catch (error) {
      console.error('[ProfilesStore] Error encriptando snapshot:', error);
      throw new Error('No se pudo encriptar el snapshot');
    }
  }

  private decryptSnapshot(snapshot: ProfileSnapshot): Record<string, string> {
    try {
      const decrypted = CryptoJS.AES.decrypt(
        snapshot.payload,
        this.getEncryptionKey(),
        {
          iv: CryptoJS.enc.Hex.parse(snapshot.iv),
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        }
      );
      const compressed = decrypted.toString(CryptoJS.enc.Utf8);
      const json = LZString.decompressFromBase64(compressed);
      if (!json) {
        throw new Error('No se pudo descomprimir snapshot');
      }
      return JSON.parse(json);
    } catch (error) {
      console.error('[ProfilesStore] Error desencriptando snapshot:', error);
      throw new Error('Snapshot inválido o corrupto');
    }
  }

  private resolveSnapshotData(snapshot: ProfileSnapshot | Record<string, string>): Record<string, string> {
    if (this.isEncryptedSnapshot(snapshot)) {
      return this.decryptSnapshot(snapshot);
    }
    return snapshot;
  }

  private isEncryptedSnapshot(
    snapshot: ProfileSnapshot | Record<string, string>
  ): snapshot is ProfileSnapshot {
    return (
      typeof snapshot === 'object' &&
      snapshot !== null &&
      'encrypted' in snapshot &&
      'payload' in snapshot
    );
  }

  private getEncryptionKey() {
    return CryptoJS.SHA256(this.ENCRYPTION_KEY);
  }

  private calculateChecksum(payload: string): string {
    return CryptoJS.SHA256(payload).toString(CryptoJS.enc.Hex);
  }

  private extractChecksum(snapshot: ProfileSnapshot | Record<string, string>): string {
    if (this.isEncryptedSnapshot(snapshot)) {
      return snapshot.checksum;
    }
    return this.calculateChecksum(JSON.stringify(snapshot));
  }

  private buildSections(snapshot: Record<string, string>): SnapshotSectionMeta[] {
    const sectionDefinitions: Array<{ id: string; label: string; matcher: (key: string) => boolean }> = [
      { id: 'custody', label: 'Custody', matcher: key => key.toLowerCase().includes('custody') },
      { id: 'pledges', label: 'Pledges', matcher: key => key.toLowerCase().includes('pledge') },
      { id: 'por', label: 'Proof of Reserves', matcher: key => key.toLowerCase().includes('por') },
      { id: 'events', label: 'Eventos', matcher: key => key.toLowerCase().includes('transactions') },
      { id: 'processing', label: 'Ledger / Processing', matcher: key => key.toLowerCase().includes('processing_state') },
    ];

    const totalSize = Object.values(snapshot).reduce((sum, value) => sum + value.length, 0) || 1;

    const sections: SnapshotSectionMeta[] = sectionDefinitions.map(section => {
      const keys = Object.keys(snapshot).filter(key => section.matcher(key));
      const size = keys.reduce((sum, key) => sum + snapshot[key].length, 0);
      return {
        id: section.id,
        label: section.label,
        keys,
        size,
        percentage: parseFloat(((size / totalSize) * 100).toFixed(2))
      };
    });

    const assignedKeys = new Set(sections.flatMap(section => section.keys));
    const otherKeys = Object.keys(snapshot).filter(key => !assignedKeys.has(key));
    if (otherKeys.length) {
      const size = otherKeys.reduce((sum, key) => sum + snapshot[key].length, 0);
      sections.push({
        id: 'other',
        label: 'Otros',
        keys: otherKeys,
        size,
        percentage: parseFloat(((size / totalSize) * 100).toFixed(2))
      });
    }

    return sections;
  }

  private calculateDiff(
    previousData: Record<string, string>,
    currentData: Record<string, string>
  ): SnapshotDiff {
    const previousKeys = new Set(Object.keys(previousData));
    const currentKeys = new Set(Object.keys(currentData));
    const added: string[] = [];
    const removed: string[] = [];
    const changed: SnapshotDiffEntry[] = [];

    currentKeys.forEach(key => {
      if (!previousKeys.has(key)) {
        added.push(key);
      } else if (previousData[key] !== currentData[key]) {
        changed.push({
          key,
          previous: {
            hash: this.calculateChecksum(previousData[key]),
            size: previousData[key].length
          },
          current: {
            hash: this.calculateChecksum(currentData[key]),
            size: currentData[key].length
          }
        });
      }
    });

    previousKeys.forEach(key => {
      if (!currentKeys.has(key)) {
        removed.push(key);
      }
    });

    const bytesBefore = Object.values(previousData).reduce((sum, value) => sum + value.length, 0);
    const bytesAfter = Object.values(currentData).reduce((sum, value) => sum + value.length, 0);

    return {
      added,
      removed,
      changed,
      summary: {
        totalKeysBefore: previousKeys.size,
        totalKeysAfter: currentKeys.size,
        bytesBefore,
        bytesAfter
      }
    };
  }

  private normalizeSnapshot(
    snapshot: ProfileSnapshot | Record<string, string>
  ): ProfileSnapshot | Record<string, string> {
    if (this.isEncryptedSnapshot(snapshot)) {
      return snapshot;
    }
    try {
      const raw = snapshot as Record<string, string>;
      return this.encryptSnapshot(raw);
    } catch (error) {
      console.warn('[ProfilesStore] Snapshot legacy, guardando sin encriptar');
      return snapshot;
    }
  }

  private setupAutoSnapshotTimer() {
    if (typeof window === 'undefined') return;
    if (this.autoSnapshotTimer) {
      window.clearInterval(this.autoSnapshotTimer);
      this.autoSnapshotTimer = null;
    }

    if (!this.state.autoSnapshotConfig.enabled) return;

    this.autoSnapshotTimer = window.setInterval(() => {
      this.handleAutoSnapshotTick();
    }, 60_000);
  }

  private handleAutoSnapshotTick() {
    const config = this.state.autoSnapshotConfig;
    if (!config.enabled) return;

    if (!config.lastRun) {
      this.triggerAutoSnapshot('auto');
      return;
    }

    const elapsedMinutes =
      (Date.now() - new Date(config.lastRun).getTime()) / 60_000;

    if (elapsedMinutes >= config.intervalMinutes) {
      this.triggerAutoSnapshot('auto');
    }
  }

  private pruneAutoSnapshots() {
    const maxAuto = this.state.autoSnapshotConfig.maxAutoProfiles || 5;
    const autoProfiles = this.state.profiles.filter(profile =>
      profile.name.startsWith('Auto Snapshot')
    );

    if (autoProfiles.length > maxAuto) {
      const toRemove = autoProfiles
        .slice(maxAuto)
        .map(profile => profile.id);
      this.state.profiles = this.state.profiles.filter(
        profile => !toRemove.includes(profile.id)
      );
    }
  }

  private toMB(bytes: number): number {
    return parseFloat((bytes / 1024 / 1024).toFixed(2));
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(2)} ${units[index]}`;
  }
}

export const profilesStore = new ProfilesStore();
