import { useState } from 'react';
import { X, Search, Check, Monitor, Tag } from 'lucide-react';
import { Device, Brand } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrandAvatar } from './GroupsPage';

interface AddDevicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
  selectedIds: Set<string>;
  onConfirm: (deviceIds: string[]) => void;
}

export function AddDevicesModal({ isOpen, onClose, devices, selectedIds, onConfirm }: AddDevicesModalProps) {
  const [search, setSearch] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set(selectedIds));

  if (!isOpen) return null;

  const filtered = devices.filter(
    (d) =>
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.location.toLowerCase().includes(search.toLowerCase())
  );

  const allFiltered = filtered.length > 0 && filtered.every((d) => checked.has(d.id));
  const someFiltered = filtered.some((d) => checked.has(d.id));

  const toggleAll = () => {
    const next = new Set(checked);
    if (allFiltered) {
      filtered.forEach((d) => next.delete(d.id));
    } else {
      filtered.forEach((d) => next.add(d.id));
    }
    setChecked(next);
  };

  const toggle = (id: string) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
  };

  const handleConfirm = () => {
    const toAdd = [...checked].filter((id) => !selectedIds.has(id));
    const toRemove = [...selectedIds].filter((id) => !checked.has(id));
    onConfirm(toAdd);
    toRemove.forEach(() => {});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <Monitor className="h-5 w-5 text-[rgb(0,173,240)]" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Add Devices</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          <button
            onClick={toggleAll}
            className="w-full flex items-center gap-3 px-4 py-3 mb-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <div
              className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                allFiltered
                  ? 'bg-[rgb(0,173,240)] border-[rgb(0,173,240)]'
                  : someFiltered
                  ? 'border-[rgb(0,173,240)] bg-[rgb(0,173,240)]/20'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              {(allFiltered || someFiltered) && <Check className="h-3.5 w-3.5 text-white" />}
            </div>
            {allFiltered ? 'Deselect all' : 'Select all'} ({filtered.length})
          </button>

          <div className="space-y-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No devices match your search</p>
            ) : (
              filtered.map((d) => {
                const isSelected = checked.has(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => toggle(d.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-900/15'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[rgb(0,173,240)] border-[rgb(0,173,240)]'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{d.name}</span>
                        <span className="text-xs text-gray-400">{d.labelSize}</span>
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{d.location}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {checked.size} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleConfirm}
              className="bg-[rgb(0,173,240)] hover:bg-[rgb(0,153,220)] text-white"
            >
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AddBrandsModalProps {
  isOpen: boolean;
  onClose: () => void;
  brands: Brand[];
  selectedIds: Set<number>;
  onConfirm: (brandIds: number[]) => void;
}

export function AddBrandsModal({ isOpen, onClose, brands, selectedIds, onConfirm }: AddBrandsModalProps) {
  const [search, setSearch] = useState('');
  const [checked, setChecked] = useState<Set<number>>(new Set(selectedIds));

  if (!isOpen) return null;

  const filtered = brands.filter(
    (b) => !search || b.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const allFiltered = filtered.length > 0 && filtered.every((b) => checked.has(b.id));
  const someFiltered = filtered.some((b) => checked.has(b.id));

  const toggleAll = () => {
    const next = new Set(checked);
    if (allFiltered) {
      filtered.forEach((b) => next.delete(b.id));
    } else {
      filtered.forEach((b) => next.add(b.id));
    }
    setChecked(next);
  };

  const toggle = (id: number) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
  };

  const handleConfirm = () => {
    const toAdd = [...checked].filter((id) => !selectedIds.has(id));
    onConfirm(toAdd);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <Tag className="h-5 w-5 text-[rgb(0,173,240)]" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Add Brands</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search brands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          <button
            onClick={toggleAll}
            className="w-full flex items-center gap-3 px-4 py-3 mb-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <div
              className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                allFiltered
                  ? 'bg-[rgb(0,173,240)] border-[rgb(0,173,240)]'
                  : someFiltered
                  ? 'border-[rgb(0,173,240)] bg-[rgb(0,173,240)]/20'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              {(allFiltered || someFiltered) && <Check className="h-3.5 w-3.5 text-white" />}
            </div>
            {allFiltered ? 'Deselect all' : 'Select all'} ({filtered.length})
          </button>

          <div className="space-y-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No brands match your search</p>
            ) : (
              filtered.map((b) => {
                const isSelected = checked.has(b.id);
                const logoUrl = getLogoUrl(b);
                return (
                  <button
                    key={b.id}
                    onClick={() => toggle(b.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-900/15'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[rgb(0,173,240)] border-[rgb(0,173,240)]'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <BrandAvatar brand={b} size="sm" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{b.displayName}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {checked.size} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleConfirm}
              className="bg-[rgb(0,173,240)] hover:bg-[rgb(0,153,220)] text-white"
            >
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
