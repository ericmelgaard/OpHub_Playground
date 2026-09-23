import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Users,
  Tag,
  Monitor,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  ImageOff,
} from 'lucide-react';
import { Brand, DeviceGroup, Device } from '../types';
import { api } from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface GroupsPageProps {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
}

export function GroupsPage({ isOpen, onClose, devices }: GroupsPageProps) {
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
    if (isOpen) loadData();
  }, [isOpen, loadData]);

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

  if (!isOpen) return null;

  const memberDeviceIds = new Set(selectedGroup?.members?.map((m) => m.deviceId) || []);
  const memberBrandIds = new Set(selectedGroup?.brands?.map((b) => b.brandId) || []);

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 -ml-2">
                <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </Button>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Device Groups</h1>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreateForm(true)}
              className="bg-[rgb(0,173,240)] hover:bg-[rgb(0,153,220)] text-white gap-1.5"
            >
              <Plus className="h-4 w-4" />
              New Group
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Group list */}
        <div className="w-72 sm:w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-y-auto bg-gray-50 dark:bg-gray-950">
          {showCreateForm && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <Input
                placeholder="Group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="mb-2 text-sm"
                autoFocus
              />
              <Input
                placeholder="Description (optional)"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                className="mb-2 text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreate} disabled={!newGroupName.trim()} className="bg-[rgb(0,173,240)] hover:bg-[rgb(0,153,220)] text-white flex-1">
                  Create
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowCreateForm(false); setNewGroupName(''); setNewGroupDesc(''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-6 text-center text-sm text-gray-400">Loading...</div>
          ) : groups.length === 0 ? (
            <div className="p-6 text-center">
              <Users className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No groups yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create a group to organize devices by brand</p>
            </div>
          ) : (
            groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(g.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-800 transition-colors ${
                  selectedGroupId === g.id
                    ? 'bg-white dark:bg-gray-900 border-l-2 border-l-[rgb(0,173,240)]'
                    : 'hover:bg-white dark:hover:bg-gray-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{g.name}</span>
                  {selectedGroupId === g.id ? <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" /> : null}
                </div>
                {g.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{g.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Monitor className="h-3 w-3" /> {g.members?.length || 0}
                  </span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Tag className="h-3 w-3" /> {g.brands?.length || 0}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-y-auto">
          {selectedGroup ? (
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
              onDelete={() => handleDelete(selectedGroup.id)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Select a group to manage its devices and brands</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
  onDelete,
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
  onDelete: () => void;
}) {
  const [deviceSearch, setDeviceSearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [failedLogos, setFailedLogos] = useState<Set<number>>(new Set());

  const memberDevices = devices.filter((d) => memberDeviceIds.has(d.id));
  const availableDevices = devices
    .filter((d) => !memberDeviceIds.has(d.id))
    .filter((d) => !deviceSearch || d.name.toLowerCase().includes(deviceSearch.toLowerCase()) || d.location.toLowerCase().includes(deviceSearch.toLowerCase()));

  const memberBrands = brands.filter((b) => memberBrandIds.has(b.id));
  const availableBrands = brands
    .filter((b) => !memberBrandIds.has(b.id))
    .filter((b) => !brandSearch || b.displayName.toLowerCase().includes(brandSearch.toLowerCase()));

  const getBrandLogoUrl = (brand: Brand) => {
    if (!brand.logoFilename || failedLogos.has(brand.id)) return null;
    return `${brand.logoBaseUrl}${brand.logoFilename}`;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Group header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{group.name}</h2>
          {group.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{group.description}</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
          <Trash2 className="h-4 w-4 mr-1.5" /> Delete
        </Button>
      </div>

      {/* Brands section */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Tag className="h-4 w-4 text-[rgb(0,173,240)]" /> Allowed Brands
              <Badge variant="secondary" className="text-xs ml-1">{memberBrands.length}</Badge>
            </h3>
            <Button size="sm" variant="outline" onClick={() => setShowBrandPicker(!showBrandPicker)} className="text-xs gap-1">
              <Plus className="h-3 w-3" /> Add Brand
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
              <div className="max-h-48 overflow-y-auto space-y-1">
                {availableBrands.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">No matching brands</p>
                ) : (
                  availableBrands.map((b) => {
                    const logoUrl = getBrandLogoUrl(b);
                    return (
                      <button
                        key={b.id}
                        onClick={() => onAddBrand(b.id)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left hover:bg-white dark:hover:bg-gray-700 transition-colors"
                      >
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt=""
                            className="h-5 w-5 object-contain flex-shrink-0"
                            onError={() => setFailedLogos((p) => new Set(p).add(b.id))}
                          />
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
              <Button size="sm" variant="ghost" onClick={() => { setShowBrandPicker(false); setBrandSearch(''); }} className="w-full mt-2 text-xs">
                Done
              </Button>
            </div>
          )}

          {memberBrands.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No brands assigned. Add brands to define which menu stations appear on this group's devices.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {memberBrands.map((b) => {
                const logoUrl = getBrandLogoUrl(b);
                return (
                  <div
                    key={b.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group"
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt=""
                        className="h-4 w-4 object-contain"
                        onError={() => setFailedLogos((p) => new Set(p).add(b.id))}
                      />
                    ) : null}
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{b.displayName}</span>
                    <button
                      onClick={() => onRemoveBrand(b.id)}
                      className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
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
            <Button size="sm" variant="outline" onClick={() => setShowDevicePicker(!showDevicePicker)} className="text-xs gap-1">
              <Plus className="h-3 w-3" /> Add Device
            </Button>
          </div>

          {showDevicePicker && (
            <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Search devices..."
                  value={deviceSearch}
                  onChange={(e) => setDeviceSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {availableDevices.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">No matching devices</p>
                ) : (
                  availableDevices.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => onAddDevice(d.id)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    >
                      <div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{d.name}</span>
                        <span className="text-[10px] text-gray-400 ml-2">{d.labelSize}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 truncate ml-2 max-w-[200px]">{d.location}</span>
                    </button>
                  ))
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={() => { setShowDevicePicker(false); setDeviceSearch(''); }} className="w-full mt-2 text-xs">
                Done
              </Button>
            </div>
          )}

          {memberDevices.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No devices in this group yet.</p>
          ) : (
            <div className="space-y-1.5">
              {memberDevices.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 group"
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
                    className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 ml-2"
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
  );
}
