import { useEffect, useMemo, useState, ReactNode, useRef } from 'react';
import {
  Layers,
  Save,
  RefreshCw,
  Trash2,
  ShieldCheck,
  HardDrive,
  Database,
  Activity,
  FileText,
  Server,
  BookmarkCheck,
  UploadCloud,
  Gauge,
  PlayCircle,
  Download,
  Upload,
  History,
  GitCompare,
  AlertTriangle,
  Clock4
} from 'lucide-react';
import { profilesStore, ProfileRecord } from '../lib/profiles-store';
import { useLanguage } from '../lib/i18n';
import { useToast } from './ui/Toast';
import { StorageManager } from '../lib/storage-manager';

export function ProfilesModule() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';
  const { addToast } = useToast();

  const [profiles, setProfiles] = useState<ProfileRecord[]>(profilesStore.getProfiles());
  const [activeProfileId, setActiveProfileId] = useState<string | null>(profilesStore.getActiveProfileId());
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    profilesStore.getActiveProfileId() || profiles[0]?.id || null
  );
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [loadingProfileId, setLoadingProfileId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewProfile, setPreviewProfile] = useState<ProfileRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = profilesStore.subscribe(state => {
      setProfiles(state.profiles);
      setActiveProfileId(state.activeProfileId);

      if (state.profiles.length === 0) {
        setSelectedProfileId(null);
      } else if (
        !selectedProfileId ||
        !state.profiles.some(profile => profile.id === selectedProfileId)
      ) {
        setSelectedProfileId(state.activeProfileId || state.profiles[0].id);
      }
    });

    return unsubscribe;
  }, [selectedProfileId]);

  const storageStats = useMemo(() => StorageManager.getStats(), [profiles]);
  const selectedProfile = profiles.find(p => p.id === selectedProfileId) || profiles[0];

  const formatCurrency = (value: number) =>
    value.toLocaleString(isSpanish ? 'es-ES' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleString(isSpanish ? 'es-ES' : 'en-US') : '—';

  const handleCreateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    try {
      const profile = profilesStore.createProfile(form.name, form.description);
      addToast({
        type: 'success',
        title: isSpanish ? 'Perfil guardado' : 'Profile saved',
        description: isSpanish
          ? 'El estado completo del banco se respaldó en este perfil.'
          : 'Full banking state snapshot stored in the profile.'
      });
      setForm({ name: '', description: '' });
      setSelectedProfileId(profile.id);
    } catch (error: any) {
      addToast({
        type: 'error',
        title: isSpanish ? 'Error creando perfil' : 'Profile creation failed',
        description: error?.message || 'Unexpected error'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleActivateProfile = async (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    
    setLoadingProfileId(profileId);
    try {
      // Aplicar perfil con opción de carga en segundo plano si tiene Ledger1
      const hasLedger = profile.stats.ledger?.fileName;
      
      await profilesStore.activateProfile(profileId, { backgroundLedgerLoad: hasLedger || false });
      
      addToast({
        type: 'info',
        title: isSpanish ? 'Aplicando perfil' : 'Applying profile',
        description: isSpanish
          ? `Balances restaurados. ${hasLedger ? 'Ledger1 se cargará en segundo plano.' : 'Plataforma se recargará.'}`
          : `Balances restored. ${hasLedger ? 'Ledger1 will load in background.' : 'Platform will reload.'}`
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: isSpanish ? 'No se pudo activar' : 'Activation failed',
        description: error?.message || 'Unexpected error'
      });
    } finally {
      setLoadingProfileId(null);
    }
  };

  const handleUpdateSnapshot = async (profileId: string) => {
    setUpdatingId(profileId);
    try {
      profilesStore.updateProfileSnapshot(profileId);
      addToast({
        type: 'success',
        title: isSpanish ? 'Perfil actualizado' : 'Profile updated',
        description: isSpanish
          ? 'Snapshot sincronizado con el estado actual.'
          : 'Snapshot synced with current state.'
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: isSpanish ? 'No se pudo actualizar' : 'Update failed',
        description: error?.message || 'Unexpected error'
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteProfile = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;

    const confirmMessage = isSpanish
      ? `¿Eliminar el perfil "${profile.name}"? Se perderá el snapshot guardado.`
      : `Delete profile "${profile.name}"? Snapshot will be lost.`;

    if (!window.confirm(confirmMessage)) return;

    profilesStore.deleteProfile(profileId);
    addToast({
      type: 'warning',
      title: isSpanish ? 'Perfil eliminado' : 'Profile removed',
      description: isSpanish
        ? 'El respaldo fue descartado de manera segura.'
        : 'Snapshot removed safely.'
    });
  };

  const handleRefreshLedger = () => {
    profilesStore.refreshLedgerFromActiveProfile(false);
    addToast({
      type: 'info',
      title: isSpanish ? 'Ledger sincronizado' : 'Ledger refreshed',
      description: isSpanish
        ? 'Releyendo progreso almacenado para Ledger1.'
        : 'Reloading stored Ledger1 progress.'
    });
  };

  const handleBackgroundLedgerLoad = () => {
    if (!selectedProfile) return;
    profilesStore.requestBackgroundLedgerLoad(selectedProfile.id);
    addToast({
      type: 'info',
      title: isSpanish ? 'Carga programada' : 'Load scheduled',
      description: isSpanish
        ? 'Ledger1 se cargará en segundo plano. Ve a Large File Analyzer para ver progreso.'
        : 'Ledger1 will load in background. Go to Large File Analyzer to see progress.'
    });
  };

  const handleExportProfile = () => {
    if (!selectedProfile) return;
    try {
      const data = profilesStore.exportProfile(selectedProfile.id);
      const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedProfile.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.daes-profile.json`;
      link.click();
      URL.revokeObjectURL(url);
      addToast({
        type: 'success',
        title: isSpanish ? 'Perfil exportado' : 'Profile exported',
        description: isSpanish ? 'Archivo .daes-profile.json generado' : 'File .daes-profile.json generated'
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: isSpanish ? 'Error exportando' : 'Export failed',
        description: error?.message || 'Unexpected error'
      });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportProfile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const profile = profilesStore.importProfile(text);
      setSelectedProfileId(profile.id);
      addToast({
        type: 'success',
        title: isSpanish ? 'Perfil importado' : 'Profile imported',
        description: isSpanish
          ? `${profile.name} - ${profile.stats.storageHuman}`
          : `${profile.name} - ${profile.stats.storageHuman}`
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: isSpanish ? 'Importación fallida' : 'Import failed',
        description: error?.message || 'Unexpected error'
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleShowPreview = (profile: ProfileRecord) => {
    setPreviewProfile(profile);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewProfile(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030712] via-[#050b1c] to-[#000] text-white p-6">
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-[#00ff88]" />
          <h1 className="text-2xl font-bold tracking-tight">
            {isSpanish ? 'Perfiles Redundantes del CoreBanking' : 'CoreBanking Redundant Profiles'}
          </h1>
        </div>
        <p className="text-white/70 max-w-4xl">
          {isSpanish
            ? 'Cada perfil guarda todo el estado del banco (balances, cuentas custody, pledges, PoR, eventos y progreso de Ledger1). Puedes restaurar la operación exacta incluso si se reinicia el navegador.'
            : 'Each profile keeps the full bank state (balances, custody accounts, pledges, PoR, events and Ledger1 progress). Restore the exact operation even after closing the browser.'}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <form
            onSubmit={handleCreateProfile}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <label className="text-xs uppercase tracking-widest text-white/50 block mb-2">
                  {isSpanish ? 'Nombre de Perfil' : 'Profile Name'}
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={isSpanish ? 'Ej: Tesorería Principal' : 'Ex: Treasury Master'}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00ff88]/40"
                  required
                />
              </div>

              <div className="flex-1 min-w-[220px]">
                <label className="text-xs uppercase tracking-widest text-white/50 block mb-2">
                  {isSpanish ? 'Descripción' : 'Description'}
                </label>
                <input
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={isSpanish ? 'Notas internas' : 'Internal notes'}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00ff88]/40"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-2 bg-[#00ff88]/20 border border-[#00ff88]/40 text-[#00ff88] font-semibold px-5 py-3 rounded-xl hover:bg-[#00ff88]/30 transition disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {creating
                  ? isSpanish ? 'Guardando...' : 'Saving...'
                  : isSpanish ? 'Guardar perfil' : 'Save profile'}
              </button>
            </div>
          </form>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <BookmarkCheck className="w-5 h-5 text-purple-300" />
                  {isSpanish ? 'Perfiles disponibles' : 'Available profiles'}
                </h2>
                <p className="text-white/60 text-sm">
                  {isSpanish
                    ? `${profiles.length} perfiles guardados · ${storageStats.totalSizeMB} MB en uso`
                    : `${profiles.length} profiles stored · ${storageStats.totalSizeMB} MB used`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-white/50">
                  <Gauge className="w-4 h-4 text-white/40" />
                  {isSpanish ? 'Uso de almacenamiento:' : 'Storage usage:'}{' '}
                  <span className={`${Number(storageStats.percentUsed) >= 80 ? 'text-red-400' : 'text-white'}`}>
                    {storageStats.percentUsed}%
                  </span>
                  {Number(storageStats.percentUsed) >= 80 && (
                    <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleImportClick}
                    disabled={importing}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-semibold hover:bg-blue-500/20 transition"
                  >
                    <Upload className="w-3 h-3" />
                    {importing ? '...' : isSpanish ? 'Importar' : 'Import'}
                  </button>
                  <button
                    onClick={handleExportProfile}
                    disabled={!selectedProfile}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-400/30 text-green-300 text-xs font-semibold hover:bg-green-500/20 transition disabled:opacity-40"
                  >
                    <Download className="w-3 h-3" />
                    {isSpanish ? 'Exportar' : 'Export'}
                  </button>
                </div>
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.daes-profile.json"
              onChange={handleImportProfile}
              className="hidden"
            />

            {profiles.length === 0 ? (
              <div className="border border-dashed border-white/20 rounded-2xl p-10 text-center text-white/60">
                {isSpanish
                  ? 'No hay perfiles guardados. Crea uno para conservar toda la memoria del banco.'
                  : 'No profiles saved yet. Create one to preserve the full bank memory.'}
              </div>
            ) : (
              <div className="space-y-4 max-h-[calc(100vh-330px)] overflow-y-auto pr-2">
                {profiles.map(profile => (
                  <div
                    key={profile.id}
                    onClick={() => setSelectedProfileId(profile.id)}
                    className={`rounded-2xl border p-5 transition shadow-lg cursor-pointer ${
                      profile.id === selectedProfileId
                        ? 'border-[#00ff88]/70 bg-[#00ff88]/5'
                        : 'border-white/10 bg-black/40 hover:border-white/30'
                    }`}
                  >
                    <div className="flex flex-wrap gap-4 justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-semibold">{profile.name}</h3>
                          {profile.id === activeProfileId && (
                            <span className="text-xs px-3 py-1 rounded-full bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/40">
                              {isSpanish ? 'Activo' : 'Active'}
                            </span>
                          )}
                        </div>
                        <p className="text-white/60 text-sm">
                          {isSpanish ? 'Actualizado:' : 'Updated:'} {formatDate(profile.updatedAt)}
                        </p>
                        {profile.lastAppliedAt && (
                          <p className="text-white/40 text-xs">
                            {isSpanish ? 'Última activación:' : 'Last activation:'}{' '}
                            {formatDate(profile.lastAppliedAt)}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleShowPreview(profile);
                          }}
                          title={isSpanish ? 'Ver detalles' : 'View details'}
                          className="px-3 py-2 rounded-xl border border-purple-400/30 text-purple-300 text-sm font-semibold bg-purple-500/10 hover:bg-purple-500/20 transition"
                        >
                          <GitCompare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleActivateProfile(profile.id);
                          }}
                          className="px-4 py-2 rounded-xl border border-cyan-400/40 text-cyan-300 text-sm font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 transition"
                          disabled={loadingProfileId === profile.id}
                        >
                          {loadingProfileId === profile.id
                            ? isSpanish ? 'Sincronizando...' : 'Syncing...'
                            : isSpanish ? 'Activar' : 'Activate'}
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleUpdateSnapshot(profile.id);
                          }}
                          disabled={updatingId === profile.id}
                          className="px-4 py-2 rounded-xl border border-white/20 text-white/80 text-sm font-semibold hover:border-white/40 transition"
                        >
                          {updatingId === profile.id
                            ? isSpanish ? 'Actualizando...' : 'Updating...'
                            : isSpanish ? 'Actualizar snapshot' : 'Update snapshot'}
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteProfile(profile.id);
                          }}
                          className="px-3 py-2 rounded-xl border border-red-500/40 text-red-300 text-sm hover:bg-red-500/10 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4 mt-5 text-sm">
                      <MetricCard
                        label={isSpanish ? 'Cuentas Custody' : 'Custody Accounts'}
                        value={profile.stats.custodyAccounts}
                        sub={`${isSpanish ? 'Capital' : 'Capital'} USD ${formatCurrency(profile.stats.custodyTotal)}`}
                      />
                      <MetricCard
                        label={isSpanish ? 'Pledges Totales' : 'Total Pledges'}
                        value={profile.stats.pledgesCount}
                        sub={`USD ${formatCurrency(profile.stats.pledgesTotal)}`}
                      />
                      <MetricCard
                        label={isSpanish ? 'Eventos registrados' : 'Events logged'}
                        value={profile.stats.eventsCount}
                        sub={`${profile.stats.porReports} PoR`}
                      />
                    </div>

                    {profile.stats.ledger && (
                      <div className="mt-4 p-4 rounded-xl bg-black/30 border border-white/5 flex flex-wrap gap-4 items-center">
                        <div className="flex-1">
                          <p className="text-xs uppercase tracking-widest text-white/50 mb-1">
                            Ledger1 · {profile.stats.ledger.fileName || '—'}
                          </p>
                          <div className="text-lg font-semibold flex items-center gap-2">
                            <Gauge className="w-4 h-4 text-[#00ff88]" />
                            {profile.stats.ledger.progress?.toFixed(2) || '0.00'}%
                          </div>
                          <p className="text-xs text-white/40">
                            {isSpanish ? 'Estado:' : 'Status:'} {profile.stats.ledger.status || 'N/A'}
                          </p>
                        </div>
                        <div className="min-w-[160px]">
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#00ff88] to-[#00b3ff]"
                              style={{ width: `${Math.min(profile.stats.ledger.progress || 0, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-white/50 mt-1">
                            {isSpanish ? 'Bytes procesados' : 'Bytes processed'}:{' '}
                            {profile.stats.ledger.bytesProcessed?.toLocaleString() || 0}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-[#00ff88]" />
              <h3 className="text-lg font-semibold">
                {isSpanish ? 'Perfil seleccionado' : 'Selected profile'}
              </h3>
            </div>
            {selectedProfile ? (
              <div className="space-y-4">
                <div className="bg-black/40 rounded-2xl p-4 border border-white/10">
                  <p className="text-sm text-white/60">{selectedProfile.description || '—'}</p>
                  <div className="mt-3 text-xs text-white/40 space-y-1">
                    <p>
                      {isSpanish ? 'Creado:' : 'Created:'} {formatDate(selectedProfile.createdAt)}
                    </p>
                    <p>
                      {isSpanish ? 'Última actualización:' : 'Last update:'}{' '}
                      {formatDate(selectedProfile.updatedAt)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <InfoRow
                    icon={<HardDrive className="w-4 h-4 text-purple-300" />}
                    label={isSpanish ? 'Snapshot' : 'Snapshot'}
                    value={`${selectedProfile.stats.storageHuman} · ${selectedProfile.stats.keysCount} keys`}
                  />
                  <InfoRow
                    icon={<Database className="w-4 h-4 text-cyan-300" />}
                    label={isSpanish ? 'PoR registrados' : 'PoR entries'}
                    value={`${selectedProfile.stats.porReports}`}
                  />
                  <InfoRow
                    icon={<Activity className="w-4 h-4 text-orange-300" />}
                    label={isSpanish ? 'Eventos' : 'Events'}
                    value={`${selectedProfile.stats.eventsCount}`}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleActivateProfile(selectedProfile.id)}
                    className="w-full flex items-center justify-center gap-2 bg-[#00ff88]/20 border border-[#00ff88]/60 text-[#00ff88] rounded-xl py-3 font-semibold hover:bg-[#00ff88]/30 transition"
                  >
                    <PlayCircle className="w-4 h-4" />
                    {isSpanish ? 'Aplicar este perfil' : 'Apply this profile'}
                  </button>
                  <button
                    onClick={() => handleUpdateSnapshot(selectedProfile.id)}
                    className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/15 rounded-xl py-3 font-semibold hover:border-white/40 transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {isSpanish ? 'Actualizar con estado actual' : 'Update with current state'}
                  </button>
                  <button
                    onClick={handleRefreshLedger}
                    className="w-full flex items-center justify-center gap-2 bg-black/30 border border-cyan-400/30 rounded-xl py-3 font-semibold text-cyan-200 hover:border-cyan-400/60 transition"
                  >
                    <Server className="w-4 h-4" />
                    {isSpanish ? 'Refrescar Ledger1' : 'Refresh Ledger1'}
                  </button>
                  {selectedProfile.stats.ledger?.fileName && (
                    <button
                      onClick={handleBackgroundLedgerLoad}
                      className="w-full flex items-center justify-center gap-2 bg-purple-500/10 border border-purple-400/30 rounded-xl py-3 font-semibold text-purple-200 hover:border-purple-400/60 transition"
                    >
                      <Activity className="w-4 h-4" />
                      {isSpanish ? 'Cargar Ledger1 en segundo plano' : 'Load Ledger1 in background'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-white/60 text-sm">
                {isSpanish
                  ? 'Crea un perfil para ver sus detalles.'
                  : 'Create a profile to see its details.'}
              </div>
            )}
          </div>

          <div className="bg-black/40 rounded-2xl p-5 border border-white/10 space-y-4">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-white/60" />
              <p className="text-sm text-white/60">
                {isSpanish
                  ? 'Los perfiles guardan balances, pledges, PoR, eventos y Ledger1 en redundancia.'
                  : 'Profiles keep balances, pledges, PoR, events and Ledger1 redundantly.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-white/60" />
              <p className="text-sm text-white/60">
                {isSpanish
                  ? 'Recomendado crear perfil tras cargar Ledger1 o completar conciliaciones.'
                  : 'Recommended after loading Ledger1 or finishing reconciliations.'}
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Modal de Preview */}
      {showPreview && previewProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleClosePreview}>
          <div className="bg-gradient-to-br from-[#0a0f1c] to-[#000] border border-[#00ff88]/30 rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <GitCompare className="w-6 h-6 text-[#00ff88]" />
                <h2 className="text-2xl font-bold">
                  {isSpanish ? 'Vista previa de perfil' : 'Profile preview'}
                </h2>
              </div>
              <button
                onClick={handleClosePreview}
                className="px-4 py-2 rounded-xl border border-white/20 text-white/80 hover:border-white/40 transition"
              >
                {isSpanish ? 'Cerrar' : 'Close'}
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h3 className="text-lg font-semibold mb-2">{previewProfile.name}</h3>
                <p className="text-white/60 text-sm">{previewProfile.description || '—'}</p>
                <div className="grid sm:grid-cols-2 gap-4 mt-4 text-xs">
                  <div>
                    <span className="text-white/50">{isSpanish ? 'Creado:' : 'Created:'}</span>
                    <span className="text-white ml-2">{formatDate(previewProfile.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-white/50">{isSpanish ? 'Actualizado:' : 'Updated:'}</span>
                    <span className="text-white ml-2">{formatDate(previewProfile.updatedAt)}</span>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <h4 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    {isSpanish ? 'Resumen de datos' : 'Data summary'}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">{isSpanish ? 'Cuentas Custody:' : 'Custody Accounts:'}</span>
                      <span className="text-white font-semibold">{previewProfile.stats.custodyAccounts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">{isSpanish ? 'Capital Total:' : 'Total Capital:'}</span>
                      <span className="text-white font-semibold">USD {formatCurrency(previewProfile.stats.custodyTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">{isSpanish ? 'Pledges:' : 'Pledges:'}</span>
                      <span className="text-white font-semibold">{previewProfile.stats.pledgesCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">{isSpanish ? 'Pledges USD:' : 'Pledges USD:'}</span>
                      <span className="text-white font-semibold">USD {formatCurrency(previewProfile.stats.pledgesTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">{isSpanish ? 'PoR Reports:' : 'PoR Reports:'}</span>
                      <span className="text-white font-semibold">{previewProfile.stats.porReports}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">{isSpanish ? 'Eventos:' : 'Events:'}</span>
                      <span className="text-white font-semibold">{previewProfile.stats.eventsCount}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <h4 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    {isSpanish ? 'Almacenamiento' : 'Storage'}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">{isSpanish ? 'Tamaño snapshot:' : 'Snapshot size:'}</span>
                      <span className="text-white font-semibold">{previewProfile.stats.storageHuman}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">{isSpanish ? 'Keys guardadas:' : 'Stored keys:'}</span>
                      <span className="text-white font-semibold">{previewProfile.stats.keysCount}</span>
                    </div>
                    {previewProfile.stats.checksum && (
                      <div className="flex justify-between items-center">
                        <span className="text-white/60">Checksum:</span>
                        <span className="text-green-400 font-mono text-xs">✓ {previewProfile.stats.checksum.substring(0, 12)}...</span>
                      </div>
                    )}
                    {previewProfile.stats.compressionRatio && (
                      <div className="flex justify-between">
                        <span className="text-white/60">{isSpanish ? 'Compresión:' : 'Compression:'}</span>
                        <span className="text-cyan-400 font-semibold">-{(100 - previewProfile.stats.compressionRatio * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {previewProfile.stats.ledger && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <h4 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    Ledger1 {isSpanish ? 'incluido' : 'included'}
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-white/60">{isSpanish ? 'Archivo:' : 'File:'}</span>
                      <p className="text-white font-mono text-xs mt-1">{previewProfile.stats.ledger.fileName}</p>
                    </div>
                    <div>
                      <span className="text-white/60">{isSpanish ? 'Progreso:' : 'Progress:'}</span>
                      <p className="text-[#00ff88] font-semibold mt-1">{previewProfile.stats.ledger.progress?.toFixed(2)}%</p>
                    </div>
                    <div>
                      <span className="text-white/60">{isSpanish ? 'Estado:' : 'Status:'}</span>
                      <p className="text-white mt-1">{previewProfile.stats.ledger.status}</p>
                    </div>
                    <div>
                      <span className="text-white/60">{isSpanish ? 'Bytes procesados:' : 'Bytes processed:'}</span>
                      <p className="text-white mt-1">{previewProfile.stats.ledger.bytesProcessed?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    handleClosePreview();
                    handleActivateProfile(previewProfile.id);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#00ff88]/20 border border-[#00ff88]/60 text-[#00ff88] rounded-xl py-3 font-semibold hover:bg-[#00ff88]/30 transition"
                >
                  <PlayCircle className="w-5 h-5" />
                  {isSpanish ? 'Activar ahora' : 'Activate now'}
                </button>
                <button
                  onClick={handleClosePreview}
                  className="px-6 py-3 rounded-xl border border-white/20 text-white/80 hover:border-white/40 transition"
                >
                  {isSpanish ? 'Cancelar' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="bg-black/30 border border-white/5 rounded-2xl p-4">
      <p className="text-xs uppercase tracking-widest text-white/50">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value.toLocaleString()}</p>
      <p className="text-xs text-white/60 mt-1">{sub}</p>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm border border-white/5 rounded-xl px-3 py-2">
      <div className="flex items-center gap-2 text-white/70">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-white font-semibold">{value}</span>
    </div>
  );
}

