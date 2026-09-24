import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Tag,
  Monitor,
  ImageOff,
  Users,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Brand, DeviceGroup, Device } from '../types';
import { api } from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { SUGGESTED_GROUP_TEMPLATES, GroupTemplate } from '../lib/groupTemplates';
import { GroupDetailPage } from './GroupDetailPage';

interface GroupsPageProps {
  devices: Device[];
}

export function GroupsPage({ devices }: GroupsPageProps) {
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [stationPatterns, setStationPatterns] = useState<Record<number, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

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

  const handleCreateFromTemplate = async (template: GroupTemplate) => {
    const g = await api.createDeviceGroup(template.name, template.description);
    if (g) {
      const matchedBrands = brands.filter((b) => template.brandKeys.includes(b.key));
      for (const b of matchedBrands) {
        await api.addBrandToGroup(g.id, b.id);
      }
      await loadData();
      setSelectedGroupId(g.id);
      setShowCreateForm(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (await api.deleteDeviceGroup(id)) {
      setGroups((prev) => prev.filter((g) => g.id !== id));
      if (selectedGroupId === id) setSelectedGroupId(null);
    }
  };

  const handleUpdate = async (updates: { name?: string; description?: string }) => {
    if (!selectedGroup) return;
    if (await api.updateDeviceGroup(selectedGroup.id, updates)) {
      await loadData();
    }
  };

  const handleAddDevices = async (deviceIds: string[]) => {
    if (!selectedGroup) return;
    for (const id of deviceIds) {
      await api.addDeviceToGroup(selectedGroup.id, id);
    }
    await loadData();
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!selectedGroup) return;
    if (await api.removeDeviceFromGroup(selectedGroup.id, deviceId)) {
      await loadData();
    }
  };

  const handleAddBrands = async (brandIds: number[]) => {
    if (!selectedGroup) return;
    for (const id of brandIds) {
      await api.addBrandToGroup(selectedGroup.id, id);
    }
    await loadData();
  };

  const handleRemoveBrand = async (brandId: number) => {
    if (!selectedGroup) return;
    if (await api.removeBrandFromGroup(selectedGroup.id, brandId)) {
      await loadData();
    }
  };

  if (selectedGroup) {
    return (
      <GroupDetailPage
        group={selectedGroup}
        brands={brands}
        devices={devices}
        stationPatterns={stationPatterns}
        onClose={() => setSelectedGroupId(null)}
        onDelete={() => handleDelete(selectedGroup.id)}
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
        <div className="h-8 w-8 border-2 border-[rgb(0,173,240)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Create new group panel */}
      {showCreateForm && (
        <CreateGroupPanel
          brands={brands}
          newGroupName={newGroupName}
          setNewGroupName={setNewGroupName}
          newGroupDesc={newGroupDesc}
          setNewGroupDesc={setNewGroupDesc}
          onCreate={handleCreate}
          onCreateFromTemplate={handleCreateFromTemplate}
          onCancel={() => { setShowCreateForm(false); setNewGroupName(''); setNewGroupDesc(''); }}
        />
      )}

      {groups.length === 0 && !showCreateForm ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4">
            <Users className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">No groups yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-sm mx-auto">
            Create a group to organize devices by station type and control which brands appear.
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

// --- Create Group Panel ---

function CreateGroupPanel({
  brands,
  newGroupName,
  setNewGroupName,
  newGroupDesc,
  setNewGroupDesc,
  onCreate,
  onCreateFromTemplate,
  onCancel,
}: {
  brands: Brand[];
  newGroupName: string;
  setNewGroupName: (v: string) => void;
  newGroupDesc: string;
  setNewGroupDesc: (v: string) => void;
  onCreate: () => void;
  onCreateFromTemplate: (template: GroupTemplate) => void;
  onCancel: () => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [failedLogos, setFailedLogos] = useState<Set<number>>(new Set());

  return (
    <div className="mb-6 space-y-4">
      {/* Suggested templates */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-[rgb(0,173,240)]" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Suggested Groups</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SUGGESTED_GROUP_TEMPLATES.map((template) => {
            const matchedBrands = brands.filter((b) => template.brandKeys.includes(b.key));
            return (
              <Card
                key={template.id}
                className="border border-gray-200 dark:border-gray-700 hover:border-[rgb(0,173,240)] dark:hover:border-[rgb(0,173,240)]/50 hover:shadow-md transition-all duration-200 cursor-pointer group"
                onClick={() => onCreateFromTemplate(template)}
              >
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{template.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{template.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {matchedBrands.slice(0, 4).map((b) => {
                      const logoUrl = b.logoFilename && !failedLogos.has(b.id)
                        ? `${b.logoBaseUrl}${b.logoFilename}`
                        : null;
                      return (
                        <div key={b.id} className="h-5 w-5 rounded bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden" title={b.displayName}>
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt=""
                              className="h-4 w-4 object-contain"
                              onError={() => setFailedLogos((p) => new Set(p).add(b.id))}
                            />
                          ) : (
                            <ImageOff className="h-2.5 w-2.5 text-gray-400" />
                          )}
                        </div>
                      );
                    })}
                    {matchedBrands.length > 4 && (
                      <div className="h-5 px-1.5 rounded bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center">
                        <span className="text-[10px] text-gray-500">+{matchedBrands.length - 4}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-end mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-medium text-[rgb(0,173,240)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      Create <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Custom group toggle */}
      <div>
        {!showCustom ? (
          <button
            onClick={() => setShowCustom(true)}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <Plus className="h-4 w-4" /> Create a custom group instead
          </button>
        ) : (
          <Card className="border-2 border-[rgb(0,173,240)]/30 dark:border-[rgb(0,173,240)]/20">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Custom Group</h3>
              <div className="space-y-3">
                <Input
                  placeholder="Group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && onCreate()}
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="text-sm min-h-[60px]"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    onClick={onCreate}
                    disabled={!newGroupName.trim()}
                    className="bg-[rgb(0,173,240)] hover:bg-[rgb(0,153,220)] text-white"
                  >
                    Create
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onCancel}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
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
