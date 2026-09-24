import { useState } from 'react';
import {
  X,
  Trash2,
  Tag,
  Monitor,
  ImageOff,
  Users,
  Plus,
  MapPin,
  Check,
  Pencil,
} from 'lucide-react';
import { Brand, DeviceGroup, Device } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AddDevicesModal, AddBrandsModal } from './GroupPickers';

interface GroupDetailPageProps {
  group: DeviceGroup;
  brands: Brand[];
  devices: Device[];
  stationPatterns: Record<number, string[]>;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (updates: { name?: string; description?: string }) => void;
  onAddDevices: (deviceIds: string[]) => void;
  onRemoveDevice: (deviceId: string) => void;
  onAddBrands: (brandIds: number[]) => void;
  onRemoveBrand: (brandId: number) => void;
}

export function GroupDetailPage({
  group,
  brands,
  devices,
  stationPatterns,
  onClose,
  onDelete,
  onUpdate,
  onAddDevices,
  onRemoveDevice,
  onAddBrands,
  onRemoveBrand,
}: GroupDetailPageProps) {
  const [failedLogos, setFailedLogos] = useState<Set<number>>(new Set());
  const [showAddDevices, setShowAddDevices] = useState(false);
  const [showAddBrands, setShowAddBrands] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editDesc, setEditDesc] = useState(group.description || '');

  const memberDeviceIds = new Set(group.members?.map((m) => m.deviceId) || []);
  const memberBrandIds = new Set(group.brands?.map((b) => b.brandId) || []);
  const memberDevices = devices.filter((d) => memberDeviceIds.has(d.id));
  const memberBrands = brands.filter((b) => memberBrandIds.has(b.id));

  const getLogoUrl = (brand: Brand) => {
    if (!brand.logoFilename || failedLogos.has(brand.id)) return null;
    return `${brand.logoBaseUrl}${brand.logoFilename}`;
  };

  const handleSaveEdit = () => {
    if (editName.trim()) {
      onUpdate({ name: editName.trim(), description: editDesc.trim() || undefined });
    }
    setEditing(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gray-50 dark:bg-gray-950 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="flex-shrink-0 -ml-2 h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Users className="h-4 w-4 text-[rgb(0,173,240)] flex-shrink-0" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
              {group.name}
            </h2>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex-shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          {/* Group Info */}
          <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
            <CardContent className="p-5">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Name</label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-sm"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Description</label>
                    <Textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="text-sm min-h-[60px]"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditName(group.name); setEditDesc(group.description || ''); }}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} className="bg-[rgb(0,173,240)] hover:bg-[rgb(0,153,220)] text-white">
                      <Check className="h-3.5 w-3.5 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{group.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        <Monitor className="h-3 w-3 mr-1" /> {memberDevices.length} {memberDevices.length === 1 ? 'device' : 'devices'}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" /> {memberBrands.length} {memberBrands.length === 1 ? 'brand' : 'brands'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(true)}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Brands Section */}
          <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Tag className="h-4 w-4 text-[rgb(0,173,240)]" /> Brands
                  <Badge variant="secondary" className="text-xs">{memberBrands.length}</Badge>
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddBrands(true)}
                  className="text-xs gap-1"
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>

              {memberBrands.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                  No brands assigned yet. Add brands to define which menu stations appear on group devices.
                </p>
              ) : (
                <div className="space-y-2">
                  {memberBrands.map((b) => {
                    const logoUrl = getLogoUrl(b);
                    const patterns = stationPatterns[b.id] || [];
                    return (
                      <div
                        key={b.id}
                        className="flex items-start gap-3 px-3 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 group/brand"
                      >
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt=""
                            className="h-8 w-8 object-contain flex-shrink-0 mt-0.5"
                            onError={() => setFailedLogos((p) => new Set(p).add(b.id))}
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <ImageOff className="h-3.5 w-3.5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{b.displayName}</span>
                            <button
                              onClick={() => onRemoveBrand(b.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover/brand:opacity-100 flex-shrink-0 ml-2"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {patterns.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {patterns.map((p, i) => (
                                <span
                                  key={i}
                                  className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Devices Section */}
          <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-[rgb(0,173,240)]" /> Devices
                  <Badge variant="secondary" className="text-xs">{memberDevices.length}</Badge>
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddDevices(true)}
                  className="text-xs gap-1"
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>

              {memberDevices.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                  No devices in this group yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {memberDevices.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 group/device"
                    >
                      <div className="h-9 w-9 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                        <Monitor className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{d.name}</span>
                          <Badge variant="secondary" className="text-[10px]">{d.labelSize}</Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <p className="text-xs text-gray-400 truncate">{d.location}</p>
                        </div>
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

      {/* Modals */}
      <AddBrandsModal
        isOpen={showAddBrands}
        onClose={() => setShowAddBrands(false)}
        brands={brands}
        selectedIds={memberBrandIds}
        onConfirm={onAddBrands}
      />
      <AddDevicesModal
        isOpen={showAddDevices}
        onClose={() => setShowAddDevices(false)}
        devices={devices}
        selectedIds={memberDeviceIds}
        onConfirm={onAddDevices}
      />
    </div>
  );
}
