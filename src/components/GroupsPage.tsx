import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Tag,
  Monitor,
  Users,
  ChevronRight,
  Sparkles,
  ArrowRight,
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
      await loadData();
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
    }
  };

  const handleDelete = async (id: string) => {
    if (await api.deleteDeviceGroup(id)) {
      await loadData();
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
        <div className="h-8 w-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Suggested Group Templates - always visible */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Suggested Groups</h3>
            <span className="text-xs text-gray-400 dark:text-gray-500">Quick-start templates</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {SUGGESTED_GROUP_TEMPLATES.map((template) => {
            const matchedBrands = brands.filter((b) => template.brandKeys.includes(b.key));
            return (
              <Card
                key={template.id}
                className="border border-gray-200 dark:border-gray-700 hover:border-brand dark:hover:border-brand/50 hover:shadow-md transition-all duration-200 cursor-pointer group"
                onClick={() => handleCreateFromTemplate(template)}
              >
                <CardContent className="p-3.5">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">{template.name}</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mb-2.5">{template.description}</p>
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {matchedBrands.slice(0, 4).map((b) => (
                      <BrandAvatar key={b.id} brand={b} size="sm" />
                    ))}
                    {matchedBrands.length > 4 && (
                      <div className="h-7 w-7 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-[10px] font-medium text-gray-500">
                        +{matchedBrands.length - 4}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-[11px] font-medium text-brand flex items-center gap-0.5 group-hover:gap-1 transition-all">
                      Create group <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700" />

      {/* Existing Groups */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Your Groups</h3>
            <Badge variant="secondary" className="text-xs">{groups.length}</Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCreateForm(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Custom Group
          </Button>
        </div>

        {showCreateForm && (
          <Card className="border-2 border-brand/30 dark:border-brand/20 mb-4">
            <CardContent className="p-5">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">New Custom Group</h4>
              <div className="space-y-3">
                <Input
                  placeholder="Group name (e.g. Exhibition Kitchen)"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
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
                    variant="ghost"
                    onClick={() => { setShowCreateForm(false); setNewGroupName(''); setNewGroupDesc(''); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={!newGroupName.trim()}
                    className="bg-brand hover:bg-brand-dark text-white"
                  >
                    Create
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {groups.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 mb-3">
              <Users className="h-6 w-6 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No groups yet. Pick a template above or create a custom group.
            </p>
          </div>
        ) : (
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
  const groupBrands = (group.brands || [])
    .map((gb) => gb.brand || brands.find((b) => b.id === gb.brandId))
    .filter(Boolean) as Brand[];

  return (
    <Card
      className="border border-gray-200 dark:border-gray-700 hover:border-brand dark:hover:border-brand/50 hover:shadow-md transition-all duration-200 cursor-pointer group overflow-hidden"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Top section */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{group.name}</h3>
              {group.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{group.description}</p>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 flex-shrink-0 ml-2 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
          </div>

          {/* Brand avatars */}
          {groupBrands.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {groupBrands.slice(0, 5).map((brand) => (
                <BrandAvatar key={brand.id} brand={brand} size="sm" />
              ))}
              {groupBrands.length > 5 && (
                <div className="h-7 w-7 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-[10px] font-medium text-gray-500">
                  +{groupBrands.length - 5}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 italic">
              <Tag className="h-3.5 w-3.5" /> No brands assigned
            </div>
          )}
        </div>

        {/* Footer stats bar - matches device card style */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Monitor className="h-3.5 w-3.5" />
            <span className="font-medium">{deviceCount}</span>
            <span>{deviceCount === 1 ? 'device' : 'devices'}</span>
          </div>
          <div className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Tag className="h-3.5 w-3.5" />
            <span className="font-medium">{groupBrands.length}</span>
            <span>{groupBrands.length === 1 ? 'brand' : 'brands'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
