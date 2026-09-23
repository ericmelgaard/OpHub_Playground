import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Tag,
  Monitor,
  X,
  Search,
  ImageOff,
  Users,
  ChevronRight,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { Brand, DeviceGroup, Device } from '../types';
import { api } from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface GroupsPageProps {
  devices: Device[];
}

export function GroupsPage({ devices }: GroupsPageProps) {
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [g, b] = await Promise.all([api.getDeviceGroups(), api.getBrands()]);
    setGroups(g);
    setBrands(b);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || null;

  const handleCreate = async () => {
    if (!newGroupName.trim()) return;
    const g = await api.createDeviceGroup(newGroupName.trim(), newGroupDesc.trim() || undefined);
    if (g) {
      setGroups((prev) => [...prev, g]);
      setSelectedGroupId(g.id);
      setShowCreateForm(false);
      setNewGroupName('');
      setNewGroupDesc('');
    }
  };

  const handleDelete = async (id: string) => {
    if (await api.deleteDeviceGroup(id)) {
      setGroups((prev) => prev.filter((g) => g.id !== id));
      if (selectedGroupId === id) setSelectedGroupId(null);
    }
  };

  const handleAddDevice = async (deviceId: string) => {
    if (!selectedGroup) return;
    if (await api.addDeviceToGroup(selectedGroup.id, deviceId)) {
      await loadData();
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!selectedGroup) return;
    if (await api.removeDeviceFromGroup(selectedGroup.id, deviceId)) {
      await loadData();
    }
  };

  const handleAddBrand = async (brandId: number) => {
    if (!selectedGroup) return;
    if (await api.addBrandToGroup(selectedGroup.id, brandId)) {
      await loadData();
    }
  };

  const handleRemoveBrand = async (brandId: number) => {
    if (!selectedGroup) return;
    if (await api.removeBrandFromGroup(selectedGroup.id, brandId)) {
      await loadData();
    }
  };

  const handleBulkAddDevices = async (deviceIds: string[]) => {
    if (!selectedGroup) return;
    for (const id of deviceIds) {
      await api.addDeviceToGroup(selectedGroup.id, id);
    }
    await loadData();
  };

  const handleBulkRemoveDevices = async (deviceIds: string[]) => {
    if (!selectedGroup) return;
    for (const id of deviceIds) {
      await api.removeDeviceFromGroup(selectedGroup.id, id);
    }
    await loadData();
  };

  if (selectedGroup) {
    const memberDeviceIds = new Set(selectedGroup.members?.map((m) => m.deviceId) || []);
    const memberBrandIds = new Set(selectedGroup.brands?.map((b) => b.brandId) || []);
    return (
      <GroupDetail
        group={selectedGroup}
        brands={brands}
        devices={devices}
        memberDeviceIds={memberDeviceIds}
        memberBrandIds={memberBrandIds}
        onAddDevice={handleAddDevice}
        onRemoveDevice={handleRemoveDevice}
        onAddBrand={handleAddBrand}
        onRemoveBrand={handleRemoveBrand}
        onBulkAddDevices={handleBulkAddDevices}
        onBulkRemoveDevices={handleBulkRemoveDevices}
        onDelete={() => handleDelete(selectedGroup.id)}
        onBack={() => setSelectedGroupId(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-[rgb(0,173,240)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Create new group form */}
      {showCreateForm && (
        <Card className="mb-6 border-2 border-[rgb(0,173,240)]/30 dark:border-[rgb(0,173,240)]/20">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Create New Group</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="text-sm flex-1"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Input
                placeholder="Description (optional)"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                className="text-sm flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={!newGroupName.trim()}
                  className="bg-[rgb(0,173,240)] hover:bg-[rgb(0,153,220)] text-white px-5"
                >
                  Create
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowCreateForm(false); setNewGroupName(''); setNewGroupDesc(''); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {groups.length === 0 && !showCreateForm ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4">
            <Users className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">No groups yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-sm mx-auto">
            Create a group to organize devices by brand and control which menu stations appear.
          </p>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-[rgb(0,173,240)] hover:bg-[rgb(0,153,220)] text-white gap-1.5"
          >
            <Plus className="h-4 w-4" /> Create First Group
          </Button>
        </div>
      ) : (
        <>
          {!showCreateForm && (
            <div className="flex justify-end mb-4">
              <Button
                size="sm"
                onClick={() => setShowCreateForm(true)}
                className="bg-[rgb(0,173,240)] hover:bg-[rgb(0,153,220)] text-white gap-1.5"
              >
                <Plus className="h-4 w-4" /> New Group
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                brands={brands}
                deviceCount={group.members?.length || 0}
                onClick={() => setSelectedGroupId(group.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// --- Group Card ---

function GroupCard({
  group,
  brands,
  deviceCount,
  onClick,
}: {
  group: DeviceGroup;
  brands: Brand[];
  deviceCount: number;
  onClick: () => void;
}) {
  const [failedLogos, setFailedLogos] = useState<Set<number>>(new Set());
  const groupBrands = (group.brands || [])
    .map((gb) => gb.brand || brands.find((b) => b.id === gb.brandId))
    .filter(Boolean) as Brand[];

  return (
    <Card
      className="border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{group.name}</h3>
            {group.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{group.description}</p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Brand logos */}
        {groupBrands.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {groupBrands.slice(0, 6).map((brand) => {
              const logoUrl = brand.logoFilename && !failedLogos.has(brand.id)
                ? `${brand.logoBaseUrl}${brand.logoFilename}`
                : null;
              return (
                <div
                  key={brand.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                  title={brand.displayName}
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt=""
                      className="h-4 w-4 object-contain"
                      onError={() => setFailedLogos((p) => new Set(p).add(brand.id))}
                    />
                  ) : (
                    <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                      <ImageOff className="h-2.5 w-2.5 text-gray-400" />
                    </div>
                  )}
                  <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 max-w-[80px] truncate">
                    {brand.displayName}
                  </span>
                </div>
              );
            })}
            {groupBrands.length > 6 && (
              <div className="flex items-center px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <span className="text-[11px] text-gray-500">+{groupBrands.length - 6}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mb-4 text-xs text-gray-400 dark:text-gray-500 italic">
            <Tag className="h-3.5 w-3.5" /> No brands assigned
          </div>
        )}

        {/* Footer stats */}
        <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Monitor className="h-3.5 w-3.5" />
            <span>{deviceCount} {deviceCount === 1 ? 'device' : 'devices'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Tag className="h-3.5 w-3.5" />
            <span>{groupBrands.length} {groupBrands.length === 1 ? 'brand' : 'brands'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Group Detail (inline, replaces the card grid) ---

function GroupDetail({
  group,
  brands,
  devices,
  memberDeviceIds,
  memberBrandIds,
  onAddDevice,
  onRemoveDevice,
  onAddBrand,
  onRemoveBrand,
  onBulkAddDevices,
  onBulkRemoveDevices,
  onDelete,
  onBack,
}: {
  group: DeviceGroup;
  brands: Brand[];
  devices: Device[];
  memberDeviceIds: Set<string>;
  memberBrandIds: Set<number>;
  onAddDevice: (id: string) => void;
  onRemoveDevice: (id: string) => void;
  onAddBrand: (id: number) => void;
  onRemoveBrand: (id: number) => void;
  onBulkAddDevices: (ids: string[]) => void;
  onBulkRemoveDevices: (ids: string[]) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const [failedLogos, setFailedLogos] = useState<Set<number>>(new Set());
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');

  const memberDevices = devices.filter((d) => memberDeviceIds.has(d.id));
  const memberBrands = brands.filter((b) => memberBrandIds.has(b.id));
  const availableBrands = brands
    .filter((b) => !memberBrandIds.has(b.id))
    .filter((b) => !brandSearch || b.displayName.toLowerCase().includes(brandSearch.toLowerCase()));

  const getBrandLogoUrl = (brand: Brand) => {
    if (!brand.logoFilename || failedLogos.has(brand.id)) return null;
    return `${brand.logoBaseUrl}${brand.logoFilename}`;
  };

  return (
    <div className="max-w-4xl">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Groups
        </button>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">{group.name}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{group.name}</h2>
          {group.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{group.description}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <Trash2 className="h-4 w-4 mr-1.5" /> Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brands section */}
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Tag className="h-4 w-4 text-[rgb(0,173,240)]" /> Brands
                <Badge variant="secondary" className="text-xs ml-1">{memberBrands.length}</Badge>
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowBrandPicker(!showBrandPicker)}
                className="text-xs gap-1"
              >
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>

            {showBrandPicker && (
              <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="Search brands..."
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {availableBrands.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3">No matching brands</p>
                  ) : (
                    availableBrands.map((b) => {
                      const logoUrl = getBrandLogoUrl(b);
                      return (
                        <button
                          key={b.id}
                          onClick={() => onAddBrand(b.id)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left hover:bg-white dark:hover:bg-gray-700 transition-colors"
                        >
                          {logoUrl ? (
                            <img src={logoUrl} alt="" className="h-5 w-5 object-contain flex-shrink-0" onError={() => setFailedLogos((p) => new Set(p).add(b.id))} />
                          ) : (
                            <div className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                              <ImageOff className="h-3 w-3 text-gray-400" />
                            </div>
                          )}
                          <span className="text-xs text-gray-700 dark:text-gray-300">{b.displayName}</span>
                        </button>
                      );
                    })
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowBrandPicker(false); setBrandSearch(''); }}
                  className="w-full mt-2 text-xs"
                >
                  Done
                </Button>
              </div>
            )}

            {memberBrands.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
                No brands assigned yet. Add brands to define which menu stations appear.
              </p>
            ) : (
              <div className="space-y-1.5">
                {memberBrands.map((b) => {
                  const logoUrl = getBrandLogoUrl(b);
                  return (
                    <div
                      key={b.id}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 group/brand"
                    >
                      {logoUrl ? (
                        <img src={logoUrl} alt="" className="h-5 w-5 object-contain flex-shrink-0" onError={() => setFailedLogos((p) => new Set(p).add(b.id))} />
                      ) : (
                        <div className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                          <ImageOff className="h-3 w-3 text-gray-400" />
                        </div>
                      )}
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex-1">{b.displayName}</span>
                      <button
                        onClick={() => onRemoveBrand(b.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover/brand:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Devices section */}
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Monitor className="h-4 w-4 text-[rgb(0,173,240)]" /> Devices
                <Badge variant="secondary" className="text-xs ml-1">{memberDevices.length}</Badge>
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDeviceSelector(!showDeviceSelector)}
                className="text-xs gap-1"
              >
                {showDeviceSelector ? 'Done' : <><Plus className="h-3 w-3" /> Add / Remove</>}
              </Button>
            </div>

            {showDeviceSelector ? (
              <DeviceMultiSelect
                devices={devices}
                selectedIds={memberDeviceIds}
                onAdd={onAddDevice}
                onRemove={onRemoveDevice}
                onBulkAdd={onBulkAddDevices}
                onBulkRemove={onBulkRemoveDevices}
              />
            ) : memberDevices.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
                No devices in this group yet.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {memberDevices.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 group/device"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-900 dark:text-white">{d.name}</span>
                        <Badge variant="secondary" className="text-[10px]">{d.labelSize}</Badge>
                      </div>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{d.location}</p>
                    </div>
                    <button
                      onClick={() => onRemoveDevice(d.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover/device:opacity-100 flex-shrink-0 ml-2"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Multi-select device picker (search + checkboxes) ---

function DeviceMultiSelect({
  devices,
  selectedIds,
  onAdd,
  onRemove,
  onBulkAdd,
  onBulkRemove,
}: {
  devices: Device[];
  selectedIds: Set<string>;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onBulkAdd: (ids: string[]) => void;
  onBulkRemove: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = devices.filter(
    (d) =>
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.location.toLowerCase().includes(search.toLowerCase())
  );

  const allFilteredSelected = filtered.length > 0 && filtered.every((d) => selectedIds.has(d.id));
  const someFilteredSelected = filtered.some((d) => selectedIds.has(d.id));

  const handleToggleAll = () => {
    if (allFilteredSelected) {
      const ids = filtered.filter((d) => selectedIds.has(d.id)).map((d) => d.id);
      onBulkRemove(ids);
    } else {
      const ids = filtered.filter((d) => !selectedIds.has(d.id)).map((d) => d.id);
      onBulkAdd(ids);
    }
  };

  return (
    <div>
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <Input
          placeholder="Search devices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-xs"
          autoFocus
        />
      </div>

      {/* Select all toggle */}
      <button
        onClick={handleToggleAll}
        className="w-full flex items-center gap-2.5 px-3 py-2 mb-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
      >
        <div
          className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
            allFilteredSelected
              ? 'bg-[rgb(0,173,240)] border-[rgb(0,173,240)]'
              : someFilteredSelected
              ? 'border-[rgb(0,173,240)] bg-[rgb(0,173,240)]/20'
              : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          {(allFilteredSelected || someFilteredSelected) && (
            <Check className="h-3 w-3 text-white" />
          )}
        </div>
        {allFilteredSelected ? 'Deselect all' : 'Select all'} ({filtered.length})
      </button>

      <div className="max-h-[340px] overflow-y-auto space-y-0.5 border-t border-gray-100 dark:border-gray-800 pt-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No devices match your search</p>
        ) : (
          filtered.map((d) => {
            const isSelected = selectedIds.has(d.id);
            return (
              <button
                key={d.id}
                onClick={() => (isSelected ? onRemove(d.id) : onAdd(d.id))}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-colors ${
                  isSelected
                    ? 'bg-sky-50 dark:bg-sky-900/15 hover:bg-sky-100 dark:hover:bg-sky-900/25'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div
                  className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-[rgb(0,173,240)] border-[rgb(0,173,240)]'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{d.name}</span>
                    <span className="text-[10px] text-gray-400">{d.labelSize}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 truncate">{d.location}</p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
