import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  BookOpen,
  Settings,
  Plus,
  Sun,
  Moon,
  Laptop,
  Menu,
  X,
  CheckCircle,
  Package,
  Monitor,
  Tag,
  Tv,
  Receipt,
  Wand2,
  MapPin,
  ChevronDown,
  Home,
  Loader2,
  Building2,
  Building,
  Store as StoreIcon,
  SlidersHorizontal,
} from 'lucide-react';
import { Theme } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LocationSelectionModal } from './LocationSelectionModal';
import { UserGuideSheet } from './UserGuideSheet';
import { unseenUpdates, markUpdatesSeen } from '@/lib/userGuide';
import { levelIconColor } from '@/lib/levelColors';
import type { DemoSecondaryDomain } from '../services/mockData';

interface NavigationProps {
  notifications: number;
  setNotifications: (count: number) => void;
  onCreateItem: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onMenuClick: () => void;
  selectedPage?: 'products' | 'devices' | 'channels';
  selectedChannel?: string | null;
  concepts?: any[];
  companies?: any[];
  stores?: any[];
  selectedConcept?: string | null;
  selectedCompany?: string | null;
  selectedStore?: string | null;
  expandedConcept?: string | null;
  expandedCompany?: string | null;
  onSelectConcept?: (conceptId: string) => void;
  onSelectCompany?: (companyId: string) => void;
  onSelectStore?: (storeId: string) => void;
  onExpandConcept?: (conceptId: string | null) => void;
  onExpandCompany?: (companyId: string | null) => void;
  onResetLocation?: () => void;
  loadingLocations?: boolean;
  onSelectOtherStore?: (storeId: string) => void;
  onSelectOtherConcept?: (conceptId: string) => void;
  onSelectOtherCompany?: (companyId: string) => void;
  isMultiDomainUser?: boolean;
  selectedSecondaryDomain?: DemoSecondaryDomain | null;
  onToggleMultiDomain?: (enabled: boolean) => void;
  // Demo tools that used to be in Settings: rule builder, brands, group templates, demo devices
  onOpenDemoTools?: () => void;
  onSelectSecondaryDomain?: (domainId: string) => void;
  demoSecondaryDomains?: DemoSecondaryDomain[];
}

const CHANNEL_INFO = {
  'shelf-labels': { name: 'Smart Labels', icon: Tag },
  'digital-signage': { name: 'Signage', icon: Tv },
  'order-confirmation': { name: 'Order Confirmation', icon: Receipt },
};

const PAGE_INFO = {
  products: { name: 'Operator Hub', icon: Package },
  devices: { name: 'Devices', icon: Monitor },
  channels: { name: 'Channels', icon: Tag },
};

export function Navigation({
  notifications,
  setNotifications,
  onCreateItem,
  theme,
  setTheme,
  onMenuClick,
  selectedPage,
  selectedChannel,
  concepts = [],
  companies = [],
  stores = [],
  selectedConcept,
  selectedCompany,
  selectedStore,
  expandedConcept,
  expandedCompany,
  onSelectConcept,
  onSelectCompany,
  onSelectStore,
  onExpandConcept,
  onExpandCompany,
  onResetLocation,
  loadingLocations = false,
  onSelectOtherStore,
  onSelectOtherConcept,
  onSelectOtherCompany,
  isMultiDomainUser = false,
  selectedSecondaryDomain = null,
  onToggleMultiDomain,
  onOpenDemoTools,
  onSelectSecondaryDomain,
  demoSecondaryDomains = [],
}: NavigationProps) {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  // User guide: a dot on the button until new What's new entries have been seen
  const [showGuide, setShowGuide] = useState(false);
  const [guideNewIds, setGuideNewIds] = useState<Set<string>>(() => new Set(unseenUpdates().map(u => u.id)));
  const [guideHasNew, setGuideHasNew] = useState(() => unseenUpdates().length > 0);
  const openGuide = () => {
    setGuideNewIds(new Set(unseenUpdates().map(u => u.id)));
    markUpdatesSeen();
    setGuideHasNew(false);
    setShowGuide(true);
  };
  const [showDismissAllConfirm, setShowDismissAllConfirm] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [navSpinner, setNavSpinner] = useState(false);
  const storeDropdownRef = useRef<HTMLDivElement>(null);
  const demoMenuRef = useRef<HTMLDivElement>(null);
  const dropdownScrollRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownMinWidth, setDropdownMinWidth] = useState(0);

  useEffect(() => {
    if (!showStoreDropdown) return;
    if (triggerRef.current) {
      setDropdownMinWidth(triggerRef.current.offsetWidth);
    }
    if (!activeItemRef.current) return;
    const t = setTimeout(() => {
      activeItemRef.current?.scrollIntoView({ block: 'nearest' });
    }, 0);
    return () => clearTimeout(t);
  }, [showStoreDropdown]);

  useEffect(() => {
    if (!showStoreDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        storeDropdownRef.current &&
        !storeDropdownRef.current.contains(e.target as Node)
      ) {
        setShowStoreDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStoreDropdown]);

  useEffect(() => {
    if (!showDemoMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        demoMenuRef.current &&
        !demoMenuRef.current.contains(e.target as Node)
      ) {
        setShowDemoMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDemoMenu]);

  const themeOptions = [
    { value: 'light', label: 'Light Mode', icon: Sun },
    { value: 'dark', label: 'Dark Mode', icon: Moon },
    { value: 'system', label: 'System Theme', icon: Laptop },
  ] as const;

  const currentThemeIcon =
    themeOptions.find((option) => option.value === theme)?.icon || Sun;

  // Get the current context (page/channel) for display
  const getCurrentContext = () => {
    if (!selectedPage) return null;

    const pageInfo = PAGE_INFO[selectedPage];
    const PageIcon = pageInfo.icon;

    if (selectedPage === 'channels' && selectedChannel) {
      const channelInfo = CHANNEL_INFO[selectedChannel];
      const ChannelIcon = channelInfo.icon;
      
      return (
        <div className="flex items-center gap-2">
          <ChannelIcon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          <span className="font-medium text-sky-600 dark:text-sky-400">
            {channelInfo.name}
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <PageIcon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        <span className="font-medium text-sky-600 dark:text-sky-400">
          {pageInfo.name}
        </span>
      </div>
    );
  };

  // Determine current navigation level
  const currentLevel: 'wand' | 'concept' | 'company' | 'store' = selectedStore
    ? 'store'
    : selectedCompany
      ? 'company'
      : selectedConcept
        ? 'concept'
        : 'wand';

  const triggerNavSpinner = () => {
    setNavSpinner(true);
    setTimeout(() => setNavSpinner(false), 600);
  };

  const getCurrentLabel = () => {
    if (currentLevel === 'wand') return 'WAND';
    if (currentLevel === 'concept') {
      const c = concepts.find((c) => c.id === selectedConcept);
      return c?.name || 'WAND';
    }
    if (currentLevel === 'company') {
      const c = companies.find((c) => c.id === selectedCompany);
      return c?.name || 'WAND';
    }
    // store
    const s = stores.find((s) => s.id === selectedStore);
    return s?.name || 'WAND';
  };

  const getCurrentIcon = () => {
    if (currentLevel === 'wand') return Wand2;
    if (currentLevel === 'concept') return Building2;
    if (currentLevel === 'company') return Building;
    return StoreIcon;
  };

  const CurrentIcon = getCurrentIcon();
  const isWandLevel = currentLevel === 'wand';

  // Drill-down items for the quick-select dropdown.
  // WAND/concept/company show children (one step down the hierarchy);
  // store shows siblings (stores in the same company) plus an "Other stores" group.
  const getDropdownItems = () => {
    if (currentLevel === 'wand') {
      return concepts.map((c) => ({
        id: c.id,
        name: c.name,
        type: 'concept' as const,
        icon: Building2,
      }));
    }
    if (currentLevel === 'concept') {
      return companies
        .filter((c) => c.conceptId === selectedConcept)
        .map((c) => ({
          id: c.id,
          name: c.name,
          type: 'company' as const,
          icon: Building,
        }));
    }
    if (currentLevel === 'company') {
      return stores
        .filter((s) => s.companyId === selectedCompany)
        .map((s) => ({
          id: s.id,
          name: s.name,
          type: 'store' as const,
          icon: StoreIcon,
        }));
    }
    // store level: sibling stores within the same company
    return stores
      .filter((s) => s.companyId === selectedCompany)
      .map((s) => ({
        id: s.id,
        name: s.name,
        type: 'store' as const,
        icon: StoreIcon,
      }));
  };

  const siblings = getDropdownItems();

  // Multi-domain "Other" sections — only shown when the user is multi-domain.
  // Each level shows nodes from the selected secondary domain that are outside
  // the current navigation context.
  const otherItems: { id: string; name: string; type: 'concept' | 'company' | 'store'; icon: any }[] = [];
  if (isMultiDomainUser && selectedSecondaryDomain) {
    if (currentLevel === 'wand' || currentLevel === 'concept') {
      otherItems.push({
        id: selectedSecondaryDomain.concept.id,
        name: selectedSecondaryDomain.concept.name,
        type: 'concept',
        icon: Building2,
      });
    }
    if (currentLevel === 'company') {
      otherItems.push(
        ...selectedSecondaryDomain.companies.map((c) => ({
          id: c.id,
          name: c.name,
          type: 'company' as const,
          icon: Building,
        })),
      );
    }
    if (currentLevel === 'store') {
      otherItems.push(
        ...selectedSecondaryDomain.stores.map((s) => ({
          id: s.id,
          name: s.name,
          type: 'store' as const,
          icon: StoreIcon,
        })),
      );
    }
  }

  const otherSectionTitle =
    currentLevel === 'company'
      ? 'Other Companies'
      : currentLevel === 'store'
        ? 'Other Stores'
        : 'Other Concepts';

  const handleSiblingSelect = (sibling: { id: string; type: 'concept' | 'company' | 'store' }) => {
    triggerNavSpinner();
    if (sibling.type === 'concept') {
      onSelectConcept?.(sibling.id);
    } else if (sibling.type === 'company') {
      onSelectCompany?.(sibling.id);
    } else {
      onSelectStore?.(sibling.id);
    }
    setShowStoreDropdown(false);
  };

  const handleOtherStoreSelect = (storeId: string) => {
    triggerNavSpinner();
    onSelectOtherStore?.(storeId);
    setShowStoreDropdown(false);
  };

  const handleOtherConceptSelect = (conceptId: string) => {
    triggerNavSpinner();
    onSelectOtherConcept?.(conceptId);
    setShowStoreDropdown(false);
  };

  const handleOtherCompanySelect = (companyId: string) => {
    triggerNavSpinner();
    onSelectOtherCompany?.(companyId);
    setShowStoreDropdown(false);
  };

  const handleOtherSelect = (item: { id: string; type: 'concept' | 'company' | 'store' }) => {
    if (item.type === 'concept') {
      handleOtherConceptSelect(item.id);
    } else if (item.type === 'company') {
      handleOtherCompanySelect(item.id);
    } else {
      handleOtherStoreSelect(item.id);
    }
  };

  const handleReset = () => {
    triggerNavSpinner();
    onResetLocation?.();
    setShowStoreDropdown(false);
  };

  return (
    <>
      <nav className="bg-brand-navy dark:bg-gray-950 shadow-sm fixed w-full z-10 transition-colors">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={onMenuClick}
                className="p-2 rounded-lg hover:bg-white/10 dark:hover:bg-gray-900 transition-colors"
              >
                <Menu className="h-6 w-6 text-gray-300 dark:text-gray-400" />
              </Button>

              <div className="flex items-center gap-3">
                <div className="relative" ref={storeDropdownRef}>
                  <div className="flex items-center gap-1">
                    <button
                      ref={triggerRef}
                      onClick={() => setShowStoreDropdown(!showStoreDropdown)}
                      className="flex items-center gap-2 px-4 py-2 text-white font-medium text-base hover:bg-white/10 dark:hover:bg-gray-900 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {isWandLevel ? (
                        <img src={`${import.meta.env.BASE_URL}wand-level.webp`} alt="WAND" className="h-4 w-4 object-contain" />
                      ) : (
                        <CurrentIcon className={`h-4 w-4 ${levelIconColor(currentLevel)}`} />
                      )}
                      {getCurrentLabel()}
                      <ChevronDown className="h-4 w-4" />
                    </button>

                    {navSpinner && (
                      <Loader2 className="h-4 w-4 animate-spin text-white/70" />
                    )}

                    {currentLevel !== 'wand' && (
                      <button
                        onClick={handleReset}
                        className="p-2 hover:bg-white/10 dark:hover:bg-gray-900 rounded-lg transition-colors"
                        title="Return to WAND"
                      >
                        <Home className="h-4 w-4 text-gray-300 dark:text-gray-400" />
                      </button>
                    )}
                  </div>

                  {showStoreDropdown && (
                    <Card ref={dropdownScrollRef} className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto" style={{ minWidth: dropdownMinWidth ? `${dropdownMinWidth}px` : undefined }}>
                      <CardContent className="p-2">
                        <div className="px-3 py-1 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700 mb-1">
                          {currentLevel === 'wand'
                            ? 'Concepts'
                            : currentLevel === 'concept'
                              ? 'Companies'
                              : currentLevel === 'company'
                                ? 'Stores'
                                : 'Stores in Company'}
                        </div>
                        {loadingLocations && siblings.length === 0 && otherItems.length === 0 ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                          </div>
                        ) : siblings.length === 0 && otherItems.length === 0 ? (
                          <p className="text-sm text-gray-400 dark:text-gray-500 px-3 py-4 text-center">
                            No locations found.
                          </p>
                        ) : (
                          <>
                          {siblings.map((sibling) => {
                            const SibIcon = sibling.icon;
                            const isActive =
                              (sibling.type === 'concept' && sibling.id === selectedConcept) ||
                              (sibling.type === 'company' && sibling.id === selectedCompany) ||
                              (sibling.type === 'store' && sibling.id === selectedStore);
                            return (
                              <Button
                                key={sibling.id}
                                ref={isActive ? activeItemRef : undefined}
                                title={sibling.name}
                                variant={isActive ? 'secondary' : 'ghost'}
                                onClick={() => handleSiblingSelect(sibling)}
                                className={`flex justify-start gap-2 w-full px-3 py-2 text-sm rounded-md ${
                                  isActive
                                    ? 'text-white bg-brand hover:bg-brand-dark dark:bg-gray-600 dark:hover:bg-gray-500'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                <SibIcon className={`h-4 w-4 flex-shrink-0 ${
                                  isActive ? '' : levelIconColor(sibling.type)
                                }`} />
                                <span className="truncate">{sibling.name}</span>
                              </Button>
                            );
                          })}
                          {otherItems.length > 0 && (
                            <>
                              <div className="px-3 py-1 mt-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide border-t border-gray-100 dark:border-gray-700 pt-2">
                                {otherSectionTitle}
                              </div>
                              {otherItems.map((s) => {
                                const SibIcon = s.icon;
                                const isActive =
                                  (s.type === 'concept' && s.id === selectedConcept) ||
                                  (s.type === 'company' && s.id === selectedCompany) ||
                                  (s.type === 'store' && s.id === selectedStore);
                                return (
                                  <Button
                                    key={s.id}
                                    ref={isActive ? activeItemRef : undefined}
                                    title={s.name}
                                    variant={isActive ? 'secondary' : 'ghost'}
                                    onClick={() => handleOtherSelect(s)}
                                    className={`flex justify-start gap-2 w-full px-3 py-2 text-sm rounded-md ${
                                      isActive
                                        ? 'text-white bg-brand hover:bg-brand-dark dark:bg-gray-600 dark:hover:bg-gray-500'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    <SibIcon className={`h-4 w-4 flex-shrink-0 ${
                                      isActive ? '' : levelIconColor(s.type)
                                    }`} />
                                    <span className="truncate">{s.name}</span>
                                  </Button>
                                );
                              })}
                            </>
                          )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                <button
                  onClick={() => setShowLocationModal(true)}
                  className="p-2 text-brand hover:bg-white/10 dark:hover:bg-gray-900 rounded-lg transition-colors"
                  title="Full Location Selector"
                >
                  <MapPin className="h-5 w-5" />
                </button>
              </div>
            </div>

          <div className="flex items-center space-x-2 sm:space-x-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative" ref={demoMenuRef}>
                <Button
                  variant="secondary"
                  onClick={() => setShowDemoMenu(!showDemoMenu)}
                  className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 text-sm font-medium text-white rounded-lg hover:bg-brand-dark transition-colors bg-brand"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Manage Demo</span>
                </Button>

                {showDemoMenu && (
                  <Card className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4 space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                          Demo Controls
                        </h3>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Multi-domain user
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isMultiDomainUser}
                            onClick={() => onToggleMultiDomain?.(!isMultiDomainUser)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              isMultiDomainUser ? 'bg-brand' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isMultiDomainUser ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </label>
                      </div>

                      {isMultiDomainUser && (
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Secondary Domain
                          </label>
                          <div className="space-y-1">
                            {demoSecondaryDomains.map((domain) => (
                              <button
                                key={domain.id}
                                onClick={() => onSelectSecondaryDomain?.(domain.id)}
                                className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors ${
                                  domain.id === selectedSecondaryDomain?.id
                                    ? 'text-white bg-brand hover:bg-brand-dark'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                <Building2 className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate text-left">{domain.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-700">
                        Toggling multi-domain shows "Other" sections in the quick nav at every level.
                      </p>
                      {onOpenDemoTools && (
                        <button
                          type="button"
                          onClick={() => { setShowDemoMenu(false); onOpenDemoTools(); }}
                          className="w-full px-3 py-2 text-sm text-left rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Rules, brands and demo devices
                        </button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <div className="h-6 w-px bg-gray-700 dark:bg-gray-800" />

            <Button
              variant="ghost"
              className="relative p-2 rounded-full hover:bg-white/10 dark:hover:bg-gray-900 transition-colors"
              onClick={openGuide}
              aria-label={guideHasNew ? 'User guide (new updates)' : 'User guide'}
              title={guideHasNew ? 'User guide · new updates' : 'User guide'}
            >
              <BookOpen className="h-6 w-6 text-gray-300 dark:text-gray-400" />
              {guideHasNew && (
                <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-sky-500 ring-2 ring-brand-navy dark:ring-gray-950" />
              )}
            </Button>

            <div className="relative">
              <Button
                variant="ghost"
                className="relative p-2 rounded-full hover:bg-white/10 dark:hover:bg-gray-900 transition-colors"
                onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
              >
                <Bell
                  className={`h-6 w-6 ${
                    notifications > 0
                      ? 'text-amber-500 dark:text-amber-400'
                      : 'text-gray-300 dark:text-gray-400'
                  }`}
                />
                {notifications > 0 && (
                  <Badge
                    variant="default"
                    className="absolute top-0 right-0 h-4 w-4 rounded-full bg-amber-500 text-xs text-white text-center"
                  >
                    {notifications}
                  </Badge>
                )}
              </Button>

              {showNotificationsMenu && notifications > 0 && (
                <Card className="fixed sm:absolute right-0 sm:right-0 mt-2 w-full sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-[80vh] overflow-y-auto">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Notifications
                      </h3>
                      {notifications > 0 && !showDismissAllConfirm && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setNotifications(0);
                            setShowDismissAllConfirm(true);
                            setTimeout(() => setShowDismissAllConfirm(false), 2000);
                          }}
                          className="px-2 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                        >
                          Dismiss All
                        </Button>
                      )}
                      {showDismissAllConfirm && (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-xs font-medium">
                            All Dismissed
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="relative">
              <Button
                variant="ghost"
                className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-gray-900 transition-colors"
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              >
                {React.createElement(currentThemeIcon, {
                  className: 'h-6 w-6 text-gray-300 dark:text-gray-400',
                })}
              </Button>

              {showSettingsMenu && (
                <Card className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                  <CardContent className="p-2">
                    <div className="px-3 py-2">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Theme
                      </h3>
                    </div>
                    <div className="mt-1">
                      {themeOptions.map(({ value, label, icon: Icon }) => (
                        <Button
                          key={value}
                          variant={theme === value ? 'secondary' : 'ghost'}
                          onClick={() => {
                            setTheme(value as Theme);
                            setShowSettingsMenu(false);
                          }}
                          className={`flex justify-start gap-2 w-full px-3 py-2 text-sm rounded-md ${
                            theme === value
                              ? 'text-white bg-brand hover:bg-brand-dark'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>

      <UserGuideSheet open={showGuide} newIds={guideNewIds} onClose={() => setShowGuide(false)} />

      <LocationSelectionModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        concepts={concepts}
        companies={companies}
        stores={stores}
        selectedConcept={selectedConcept || null}
        selectedCompany={selectedCompany || null}
        selectedStore={selectedStore || null}
        expandedConcept={expandedConcept || null}
        expandedCompany={expandedCompany || null}
        onSelectConcept={onSelectConcept || (() => {})}
        onSelectCompany={onSelectCompany || (() => {})}
        onSelectStore={onSelectStore || (() => {})}
        onExpandConcept={onExpandConcept || (() => {})}
        onExpandCompany={onExpandCompany || (() => {})}
        onReset={onResetLocation || (() => {})}
        loading={loadingLocations}
      />
    </>
  );
}