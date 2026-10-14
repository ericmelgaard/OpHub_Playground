import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Tag,
  Search,
  Map as MapIcon,
  List,
  Camera,
  Sparkles,
  X,
  Image as ImageIcon,
  MapPin,
  ArrowRight,
  ScanLine,
} from 'lucide-react';
import { Brand, DeviceGroup, Device } from '../types';
import { api } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SUGGESTED_GROUP_TEMPLATES, GroupTemplate } from '../lib/groupTemplates';
import { levelIconColor } from '@/lib/levelColors';
import { LabelSyncState, useLabelSyncStates } from '../lib/labelSync';
import {
  PLAN_W,
  PLAN_H,
  SEATING_AREA,
  SiteLayout,
  SiteRect,
  loadSiteLayout,
  saveSiteLayout,
  placeGroups,
} from '../lib/siteLayout';
import { GroupDetailPage } from './GroupDetailPage';

interface GroupsPageProps {
  devices: Device[];
}

function getBrandInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function getBrandColor(key: string): string {
  const colors = [
    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  ];
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

export function BrandAvatar({ brand, size = 'sm' }: { brand: Brand; size?: 'sm' | 'md' | 'lg' }) {
  const [failed, setFailed] = useState(false);
  const logoUrl = brand.logoFilename && !failed
    ? `${brand.logoBaseUrl}${brand.logoFilename}`
    : null;

  const sizeClasses = {
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-12 w-12 text-sm',
  };

  if (logoUrl) {
    return (
      <div className={`${sizeClasses[size]} rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex-shrink-0`}>
        <img
          src={logoUrl}
          alt={brand.displayName}
          className="h-full w-full object-contain p-0.5"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-lg flex items-center justify-center font-bold flex-shrink-0 ${getBrandColor(brand.key)}`}>
      {getBrandInitials(brand.displayName)}
    </div>
  );
}

// --- Sync status helpers ---

const SYNC_DOT: Record<LabelSyncState | 'none', string> = {
  synced: 'bg-emerald-500',
  pending: 'bg-amber-500',
  syncing: 'bg-sky-500',
  failed: 'bg-red-500',
  none: 'bg-gray-300 dark:bg-gray-600',
};

interface GroupStatus {
  label: string;
  dot: string;
  text: string;
}

function summarize(states: (LabelSyncState | undefined)[]): GroupStatus {
  if (states.length === 0) {
    return { label: 'No devices', dot: SYNC_DOT.none, text: 'text-gray-500 dark:text-gray-400' };
  }
  const failed = states.filter(s => s === 'failed').length;
  if (failed > 0) {
    return { label: `${failed} failed`, dot: SYNC_DOT.failed, text: 'text-red-700 dark:text-red-300' };
  }
  const waiting = states.filter(s => s === 'pending' || s === 'syncing').length;
  if (waiting > 0) {
    return { label: `${waiting} pending`, dot: SYNC_DOT.pending, text: 'text-amber-700 dark:text-amber-300' };
  }
  return { label: 'Synced', dot: SYNC_DOT.synced, text: 'text-emerald-700 dark:text-emerald-300' };
}

function memberIds(group: DeviceGroup): string[] {
  return (group.members || []).map(m => m.deviceId);
}

function groupBrandsOf(group: DeviceGroup, brands: Brand[]): Brand[] {
  return (group.brands || [])
    .map(gb => gb.brand || brands.find(b => b.id === gb.brandId))
    .filter(Boolean) as Brand[];
}

// --- Page ---

export function GroupsPage({ devices }: GroupsPageProps) {
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [stationPatterns, setStationPatterns] = useState<Record<number, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [detailGroupId, setDetailGroupId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [search, setSearch] = useState('');
  const [layout, setLayout] = useState<SiteLayout>(loadSiteLayout);
  const [showAdd, setShowAdd] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [g, b, sp] = await Promise.all([
      api.getDeviceGroups(),
      api.getBrands(),
      api.getBrandStationPatterns(),
    ]);
    setGroups(g);
    setBrands(b);
    setStationPatterns(sp);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Every group gets a spot on the map; new ones take the next free slot
  useEffect(() => {
    if (groups.length === 0) return;
    setLayout(prev => {
      const next = placeGroups(prev, groups.map(g => g.id));
      if (next !== prev) saveSiteLayout(next);
      return next;
    });
  }, [groups]);

  const detailGroup = groups.find(g => g.id === detailGroupId) || null;
  const selectedGroup = groups.find(g => g.id === selectedId) || null;

  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? groups.filter(g => g.name.toLowerCase().includes(q)) : groups;
  }, [groups, search]);

  const totalDevices = groups.reduce((n, g) => n + (g.members?.length || 0), 0);

  const handleCreate = async (name: string, description: string) => {
    const g = await api.createDeviceGroup(name, description || undefined);
    if (g) {
      await loadData();
      setSelectedId(g.id);
      setShowAdd(false);
    }
  };

  const handleCreateFromTemplate = async (template: GroupTemplate) => {
    const g = await api.createDeviceGroup(template.name, template.description);
    if (g) {
      const matchedBrands = brands.filter((b) => template.brandKeys.includes(b.key));
      for (const b of matchedBrands) {
        await api.addBrandToGroup(g.id, b.id);
      }
      await loadData();
      setSelectedId(g.id);
      setShowAdd(false);
    }
  };

  const handleGenerateLayout = () => {
    const next = placeGroups({ placements: {}, generatedAt: new Date().toISOString() }, groups.map(g => g.id));
    saveSiteLayout(next);
    setLayout(next);
    setShowSurvey(false);
  };

  const handleDelete = async (id: string) => {
    if (await api.deleteDeviceGroup(id)) {
      await loadData();
      if (detailGroupId === id) setDetailGroupId(null);
      if (selectedId === id) setSelectedId(null);
    }
  };

  const handleUpdate = async (updates: { name?: string; description?: string }) => {
    if (!detailGroup) return;
    if (await api.updateDeviceGroup(detailGroup.id, updates)) {
      await loadData();
    }
  };

  const handleAddDevices = async (deviceIds: string[]) => {
    if (!detailGroup) return;
    for (const id of deviceIds) {
      await api.addDeviceToGroup(detailGroup.id, id);
    }
    await loadData();
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!detailGroup) return;
    if (await api.removeDeviceFromGroup(detailGroup.id, deviceId)) {
      await loadData();
    }
  };

  const handleAddBrands = async (brandIds: number[]) => {
    if (!detailGroup) return;
    for (const id of brandIds) {
      await api.addBrandToGroup(detailGroup.id, id);
    }
    await loadData();
  };

  const handleRemoveBrand = async (brandId: number) => {
    if (!detailGroup) return;
    if (await api.removeBrandFromGroup(detailGroup.id, brandId)) {
      await loadData();
    }
  };

  if (detailGroup) {
    return (
      <GroupDetailPage
        group={detailGroup}
        brands={brands}
        devices={devices}
        stationPatterns={stationPatterns}
        onClose={() => setDetailGroupId(null)}
        onDelete={() => handleDelete(detailGroup.id)}
        onUpdate={handleUpdate}
        onAddDevices={handleAddDevices}
        onRemoveDevice={handleRemoveDevice}
        onAddBrands={handleAddBrands}
        onRemoveBrand={handleRemoveBrand}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400 mr-auto">
          {groups.length} {groups.length === 1 ? 'group' : 'groups'} · {totalDevices} {totalDevices === 1 ? 'device' : 'devices'}
        </p>
        <div role="group" aria-label="View" className="flex p-1 rounded-lg bg-gray-100 dark:bg-gray-800">
          {([['map', 'Map', MapIcon], ['list', 'List', List]] as const).map(([value, label, Icon]) => (
            <button
              key={value}
              onClick={() => setView(value)}
              aria-pressed={view === value}
              className={`flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-colors ${
                view === value
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={() => setShowSurvey(true)} className="h-11 gap-2">
          <Camera className="h-5 w-5" />
          Survey with camera
        </Button>
        <Button onClick={() => setShowAdd(true)} className="h-11 gap-2">
          <Plus className="h-5 w-5" />
          Add group
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:h-[calc(100vh-280px)] md:min-h-[520px]">
        {/* Groups sidebar */}
        <aside className="md:w-80 flex-shrink-0 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-80 md:max-h-none">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                aria-label="Search groups"
                placeholder="Search groups"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 pl-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {visibleGroups.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8 px-4">
                {groups.length === 0 ? 'No groups yet. Add one to place it on the map.' : 'No groups match your search.'}
              </p>
            ) : (
              visibleGroups.map(group => (
                <GroupRow
                  key={group.id}
                  group={group}
                  selected={group.id === selectedId}
                  onSelect={() => setSelectedId(group.id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* Map or list */}
        {view === 'map' ? (
          <div className="relative flex-1 min-w-0 min-h-[420px] rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 overflow-hidden">
            <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
              {layout.generatedAt ? (
                <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  <Sparkles className="h-3.5 w-3.5" />
                  Layout generated · {new Date(layout.generatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              ) : (
                <span className="inline-flex items-center h-7 px-2.5 rounded-full text-xs font-medium bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  Starter layout · groups placed automatically
                </span>
              )}
            </div>

            <div className="absolute inset-0 flex items-center justify-center p-4 pt-14">
              <SitePlan
                groups={groups}
                layout={layout}
                selectedId={selectedId}
                dimmed={search.trim() ? new Set(groups.filter(g => !visibleGroups.includes(g)).map(g => g.id)) : null}
                onSelect={setSelectedId}
              />
            </div>

            <div className="absolute left-4 bottom-4 z-10 hidden sm:flex items-center gap-4 px-3 py-2 rounded-lg text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <LegendDot className={SYNC_DOT.synced} label="Synced" />
              <LegendDot className={SYNC_DOT.pending} label="Pending" />
              <LegendDot className={SYNC_DOT.failed} label="Failed" />
            </div>

            {selectedGroup && (
              <GroupPanel
                group={selectedGroup}
                devices={devices}
                brands={brands}
                onClose={() => setSelectedId(null)}
                onOpen={() => setDetailGroupId(selectedGroup.id)}
              />
            )}
          </div>
        ) : (
          <GroupsTable
            groups={visibleGroups}
            brands={brands}
            selectedId={selectedId}
            onSelect={(id) => { setSelectedId(id); setView('map'); }}
          />
        )}
      </div>

      {showAdd && createPortal(
        <AddGroupSheet
          brands={brands}
          onClose={() => setShowAdd(false)}
          onCreate={handleCreate}
          onCreateFromTemplate={handleCreateFromTemplate}
        />,
        document.body,
      )}

      {showSurvey && createPortal(
        <SurveySheet
          groupCount={groups.length}
          onClose={() => setShowSurvey(false)}
          onGenerate={handleGenerateLayout}
        />,
        document.body,
      )}
    </div>
  );
}

// --- Sidebar row ---

function GroupRow({ group, selected, onSelect }: { group: DeviceGroup; selected: boolean; onSelect: () => void }) {
  const ids = memberIds(group);
  const status = summarize(useLabelSyncStates(ids));

  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full min-h-[56px] flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${
        selected
          ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800'
          : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`}
    >
      <MapPin className={`h-5 w-5 flex-shrink-0 ${levelIconColor('placement')}`} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{group.name}</span>
        <span className="block text-xs text-gray-500 dark:text-gray-400">
          {ids.length} {ids.length === 1 ? 'device' : 'devices'}
        </span>
      </span>
      <span className={`flex items-center gap-1.5 text-xs flex-shrink-0 ${status.text}`}>
        <span className={`h-2 w-2 rounded-full ${status.dot}`} />
        {status.label}
      </span>
    </button>
  );
}

// --- Map ---

function pct(rect: SiteRect) {
  return {
    left: `${(rect.x / PLAN_W) * 100}%`,
    top: `${(rect.y / PLAN_H) * 100}%`,
    width: `${(rect.w / PLAN_W) * 100}%`,
    height: `${(rect.h / PLAN_H) * 100}%`,
  };
}

function SitePlan({
  groups,
  layout,
  selectedId,
  dimmed,
  onSelect,
}: {
  groups: DeviceGroup[];
  layout: SiteLayout;
  selectedId: string | null;
  dimmed: Set<string> | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="relative w-full max-h-full bg-white dark:bg-gray-800 border-[3px] border-gray-400 dark:border-gray-500 rounded-xl"
      style={{ aspectRatio: `${PLAN_W} / ${PLAN_H}` }}
    >
      <div
        className="absolute flex items-end justify-end p-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl"
        style={pct(SEATING_AREA)}
      >
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Seating</span>
      </div>
      <span className="absolute left-1/2 -translate-x-1/2 -bottom-[3px] w-24 h-[3px] bg-white dark:bg-gray-800" />
      <span className="absolute left-1/2 -translate-x-1/2 bottom-1.5 text-xs font-medium text-gray-400 dark:text-gray-500">
        Entrance
      </span>

      {groups.map(group => {
        const rect = layout.placements[group.id];
        if (!rect) return null;
        return (
          <StationBlock
            key={group.id}
            group={group}
            rect={rect}
            selected={group.id === selectedId}
            dimmed={dimmed?.has(group.id) ?? false}
            onSelect={() => onSelect(group.id)}
          />
        );
      })}
    </div>
  );
}

function StationBlock({
  group,
  rect,
  selected,
  dimmed,
  onSelect,
}: {
  group: DeviceGroup;
  rect: SiteRect;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
}) {
  const states = useLabelSyncStates(memberIds(group));

  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={group.name}
      style={pct(rect)}
      className={`absolute flex flex-col justify-between items-start gap-1 p-2 rounded-lg border-2 text-left transition-all ${
        selected
          ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-500 ring-4 ring-sky-500/20 z-10'
          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
      } ${dimmed ? 'opacity-40' : ''}`}
    >
      <span className="flex items-start gap-1.5 min-w-0 w-full">
        <MapPin className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${levelIconColor('placement')}`} />
        <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white leading-tight line-clamp-2">
          {group.name}
        </span>
      </span>
      {states.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {states.slice(0, 12).map((s, i) => (
            <span key={i} className={`h-2 w-2 rounded-sm ${SYNC_DOT[s ?? 'none']}`} />
          ))}
        </span>
      )}
    </button>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

// --- Group panel (over the map) ---

function GroupPanel({
  group,
  devices,
  brands,
  onClose,
  onOpen,
}: {
  group: DeviceGroup;
  devices: Device[];
  brands: Brand[];
  onClose: () => void;
  onOpen: () => void;
}) {
  const ids = memberIds(group);
  const members = ids.map(id => devices.find(d => d.id === id)).filter(Boolean) as Device[];
  const states = useLabelSyncStates(ids);
  const status = summarize(states);
  const groupBrands = groupBrandsOf(group, brands);

  return (
    <div className="absolute z-20 inset-x-2 bottom-2 max-h-[70%] sm:inset-x-auto sm:right-4 sm:top-4 sm:bottom-4 sm:max-h-none sm:w-80 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
      <div className="relative h-32 flex-shrink-0 flex flex-col items-center justify-center gap-1.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
        <ImageIcon className="h-6 w-6" />
        <span className="text-xs">No photo yet</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close group panel"
          className="absolute right-2 top-2 h-9 w-9 rounded-full bg-white/90 dark:bg-gray-800/90"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-2">
          <MapPin className={`h-5 w-5 mt-0.5 flex-shrink-0 ${levelIconColor('placement')}`} />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{group.name}</h3>
            {group.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{group.description}</p>
            )}
          </div>
          <span className={`flex items-center gap-1.5 text-xs flex-shrink-0 mt-1 ${status.text}`}>
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>
        {groupBrands.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {groupBrands.slice(0, 6).map(b => <BrandAvatar key={b.id} brand={b} size="sm" />)}
          </div>
        )}
        <Button onClick={onOpen} className="w-full h-11 gap-2">
          Open details <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Devices · {members.length}
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {members.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 px-2 py-3">No devices in this group yet.</p>
        ) : (
          members.map(d => (
            <div key={d.id} className="flex items-center gap-3 px-2 py-2 rounded-lg">
              <span className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                <Tag className="h-4 w-4" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{d.name}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{d.labelSize} · {d.location}</span>
              </span>
              <span className={`h-2 w-2 rounded-sm flex-shrink-0 ${SYNC_DOT[states[ids.indexOf(d.id)] ?? 'none']}`} aria-label={states[ids.indexOf(d.id)] ?? 'unknown'} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// --- List view (data first) ---

function GroupsTable({
  groups,
  brands,
  selectedId,
  onSelect,
}: {
  groups: DeviceGroup[];
  brands: Brand[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex-1 min-w-0 overflow-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <tr>
            <th className="text-left px-4 py-3">Group</th>
            <th className="text-left px-4 py-3">Devices</th>
            <th className="text-left px-4 py-3">Brands</th>
            <th className="text-left px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(group => (
            <GroupsTableRow
              key={group.id}
              group={group}
              brandCount={groupBrandsOf(group, brands).length}
              selected={group.id === selectedId}
              onSelect={() => onSelect(group.id)}
            />
          ))}
        </tbody>
      </table>
      {groups.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No groups to show.</p>
      )}
    </div>
  );
}

function GroupsTableRow({
  group,
  brandCount,
  selected,
  onSelect,
}: {
  group: DeviceGroup;
  brandCount: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const ids = memberIds(group);
  const status = summarize(useLabelSyncStates(ids));

  return (
    <tr
      onClick={onSelect}
      className={`h-14 border-t border-gray-100 dark:border-gray-700 cursor-pointer transition-colors ${
        selected ? 'bg-sky-50 dark:bg-sky-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`}
    >
      <td className="px-4">
        <button onClick={onSelect} className="flex items-center gap-2 font-medium text-gray-900 dark:text-white text-left">
          <MapPin className={`h-4 w-4 flex-shrink-0 ${levelIconColor('placement')}`} />
          {group.name}
        </button>
      </td>
      <td className="px-4 text-gray-700 dark:text-gray-300">{ids.length}</td>
      <td className="px-4 text-gray-700 dark:text-gray-300">{brandCount}</td>
      <td className="px-4">
        <span className={`flex items-center gap-1.5 text-xs ${status.text}`}>
          <span className={`h-2 w-2 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </td>
    </tr>
  );
}

// --- Add group sheet ---

function AddGroupSheet({
  brands,
  onClose,
  onCreate,
  onCreateFromTemplate,
}: {
  brands: Brand[];
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
  onCreateFromTemplate: (template: GroupTemplate) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 modal-container" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Add group"
        className="w-full max-w-md h-full flex flex-col bg-white dark:bg-gray-800 shadow-xl modal-content safe-area-top safe-area-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 modal-header">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add group</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 modal-body">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Start from a template</h3>
            <div className="space-y-2">
              {SUGGESTED_GROUP_TEMPLATES.map(template => {
                const matched = brands.filter(b => template.brandKeys.includes(b.key));
                return (
                  <button
                    key={template.id}
                    onClick={() => onCreateFromTemplate(template)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-brand dark:hover:border-brand/50 text-left transition-colors"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-900 dark:text-white">{template.name}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{template.description}</span>
                    </span>
                    <span className="flex gap-1 flex-shrink-0">
                      {matched.slice(0, 3).map(b => <BrandAvatar key={b.id} brand={b} size="sm" />)}
                    </span>
                    <Plus className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Or create a custom group</h3>
            <Input
              placeholder="Group name (e.g. Exhibition kitchen)"
              aria-label="Group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && onCreate(name.trim(), description.trim())}
              className="h-11"
            />
            <Textarea
              placeholder="Description (optional)"
              aria-label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[72px]"
            />
            <button
              disabled
              className="w-full h-28 flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 disabled:cursor-not-allowed"
            >
              <Camera className="h-6 w-6" />
              <span className="text-sm font-medium">Take a photo of this spot</span>
              <span className="text-xs">Camera coming soon</span>
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400">New groups are placed on the map in the next open spot.</p>
          </section>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose} className="flex-1 h-11">Cancel</Button>
          <Button
            onClick={() => onCreate(name.trim(), description.trim())}
            disabled={!name.trim()}
            className="flex-1 h-11"
          >
            Create group
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Camera survey (placeholder) ---

function SurveySheet({
  groupCount,
  onClose,
  onGenerate,
}: {
  groupCount: number;
  onClose: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 modal-container" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Site survey"
        className="w-full max-w-2xl mx-4 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 modal-header">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Site survey</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Walk the room with the camera to map each station</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="modal-body">
          <div className="relative h-64 flex flex-col items-center justify-center gap-2 bg-gray-900 text-gray-400">
            <ScanLine className="h-10 w-10" />
            <span className="text-sm">Camera survey coming soon</span>
            <span className="absolute left-6 top-6 h-10 w-10 border-l-2 border-t-2 border-teal-400 rounded-tl-lg" />
            <span className="absolute right-6 top-6 h-10 w-10 border-r-2 border-t-2 border-teal-400 rounded-tr-lg" />
            <span className="absolute left-6 bottom-6 h-10 w-10 border-l-2 border-b-2 border-teal-400 rounded-bl-lg" />
            <span className="absolute right-6 bottom-6 h-10 w-10 border-r-2 border-b-2 border-teal-400 rounded-br-lg" />
          </div>
          <div className="p-5 space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <p>The survey will find serving stations and the labels on them, then draw a bird's-eye layout you can review before saving.</p>
            <p>For now, generate a starter layout from your {groupCount} {groupCount === 1 ? 'group' : 'groups'}. This replaces the current map.</p>
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose} className="flex-1 h-11">Cancel</Button>
          <Button onClick={onGenerate} className="flex-1 h-11 gap-2">
            <Sparkles className="h-4 w-4" />
            Generate layout
          </Button>
        </div>
      </div>
    </div>
  );
}
