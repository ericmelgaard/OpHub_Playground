import React, { useState, useMemo } from 'react';
import { Coffee, MapPin, MoreVertical, Monitor, CreditCard as Edit, Plus, Tag, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, ChevronRight, Calendar } from 'lucide-react';
import { MenuItem as MenuItemType, Device } from '../types';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StationsModal } from './StationsModal';
import { DAY_ABBR } from '../lib/availability';
import { daypartColor } from '../lib/daypartColors';
import { levelIconColor } from '@/lib/levelColors';

interface MenuItemProps {
  item: MenuItemType;
  selectedChannel: string | null;
  expandedItem: string | null;
  toggleItemExpansion: (itemId: number) => void;
  isItemInChannel: (itemId: number, channelId: string) => boolean;
  toggleItemInChannel: (item: MenuItemType, channelId: string) => void;
  setSelectedItem: (item: MenuItemType) => void;
  setShowDeviceModal: (show: boolean) => void;
  setShowPageSelectionModal: (show: boolean) => void;
  setWorkflowType: (type: 'manage' | 'assign' | null) => void;
  viewMode: 'grid' | 'list';
  devices: Device[];
  onEdit?: (item: MenuItemType) => void;
  selectedCycleWeek?: number;
  refreshTag?: 'new' | 'updated';
}

// Columns shared by the product list header (MenuItems) and each row
export const PRODUCT_ROW_COLS = 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_120px_70px_80px_40px]';

function getWeekDateRange(weekOffset: number): { start: Date; end: Date } {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
  monday.setDate(monday.getDate() + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

export function MenuItem({
  item,
  selectedChannel,
  expandedItem,
  toggleItemExpansion,
  isItemInChannel,
  toggleItemInChannel,
  setSelectedItem,
  setShowDeviceModal,
  setShowPageSelectionModal,
  setWorkflowType,
  viewMode,
  devices,
  onEdit,
  selectedCycleWeek,
  refreshTag,
}: MenuItemProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState(false);

  const weekActiveDays = useMemo(() => {
    if (selectedCycleWeek === undefined || !item.dates || item.dates.length === 0) {
      return item.activeDays || [];
    }
    const { start, end } = getWeekDateRange(selectedCycleWeek);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const daysInWeek = new Set<number>();
    for (const dateStr of item.dates) {
      if (dateStr >= startStr && dateStr <= endStr) {
        const d = new Date(dateStr + 'T12:00:00');
        daysInWeek.add(d.getDay());
      }
    }
    return [...daysInWeek].sort();
  }, [selectedCycleWeek, item.dates, item.activeDays]);
  const [showStationsModal, setShowStationsModal] = useState(false);

  const deviceCount = devices.filter((device) =>
    device.pages.some((page) =>
      page.assignedItems.some((assignedItem) => assignedItem.id === item.id)
    )
  ).length;

  const isInSelectedChannel = selectedChannel
    ? isItemInChannel(item.id, selectedChannel)
    : false;
  const isActive = item.isActive !== false;

  const handleOptionClick = (action: 'manage' | 'edit' | 'add' | 'assign') => {
    setShowOptions(false);

    switch (action) {
      case 'manage':
        setSelectedItem(item);
        setWorkflowType('manage');
        setShowDeviceModal(true);
        break;
      case 'edit':
        onEdit?.(item);
        break;
      case 'add':
        if (selectedChannel) {
          toggleItemInChannel(item, selectedChannel);
        }
        break;
      case 'assign':
        setSelectedItem(item);
        setWorkflowType('assign');
        setShowDeviceModal(true);
        break;
    }
  };

  const handleAssignClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Add button clicked!', { item: item.name, selectedChannel, isInSelectedChannel });
    if (selectedChannel) {
      if (!isInSelectedChannel) {
        // If not in channel, add to channel first
        toggleItemInChannel(item, selectedChannel);
      }
      // Then show device assignment modal
      setSelectedItem(item);
      setWorkflowType('assign');
      setShowDeviceModal(true);
    }
  };

  const getDaypartColor = (daypart: string) => daypartColor(daypart).chip;

  // Option 1: Expandable with all details
  const renderExpandableInfo = () => (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setExpandedDetails(!expandedDetails)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        {expandedDetails ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        <span>
          {item.mealPeriods?.length || 0} dayparts • {item.mealStations?.length || 0} stations
        </span>
      </button>

      {expandedDetails && (
        <div className="flex flex-col gap-3 pl-6 pt-2 border-l-2 border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Dayparts</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {item.mealPeriods?.map((period, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className={`text-xs border ${getDaypartColor(period)}`}
                >
                  {period}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <MapPin className={`h-3.5 w-3.5 ${levelIconColor('placement')}`} />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Stations</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {item.mealStations?.map((station, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="text-xs"
                >
                  {station}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Option 2: Color-coded compact grid
  const renderColorCodedGrid = () => (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {item.mealPeriods?.map((period, idx) => (
          <Badge
            key={idx}
            variant="outline"
            className={`text-xs border ${getDaypartColor(period)}`}
          >
            {period}
          </Badge>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
        {item.mealStations?.slice(0, 6).map((station, idx) => (
          <Badge
            key={idx}
            variant="secondary"
            className="text-xs"
          >
            {station.length > 25 ? station.substring(0, 25) + '...' : station}
          </Badge>
        ))}
        {item.mealStations && item.mealStations.length > 6 && (
          <Badge variant="secondary" className="text-xs bg-gray-200 dark:bg-gray-700">
            +{item.mealStations.length - 6} more
          </Badge>
        )}
      </div>
    </div>
  );

  // Option 3: Compact with hover tooltip (using title attribute)
  const renderCompactWithTooltip = () => (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-center gap-2 cursor-help"
        title={item.mealPeriods?.join(', ')}
      >
        <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <div className="flex flex-wrap gap-1.5">
          {item.mealPeriods?.slice(0, 3).map((period, idx) => (
            <Badge
              key={idx}
              variant="outline"
              className={`text-xs border ${getDaypartColor(period)}`}
            >
              {period}
            </Badge>
          ))}
          {item.mealPeriods && item.mealPeriods.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{item.mealPeriods.length - 3}
            </Badge>
          )}
        </div>
      </div>
      <div
        className="flex items-center gap-2 cursor-help"
        title={item.mealStations?.join('\n')}
      >
        <MapPin className={`h-4 w-4 flex-shrink-0 ${levelIconColor('placement')}`} />
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {item.mealStations?.length || 0} locations
        </span>
      </div>
    </div>
  );

  // Option 4: Organized grid with sections
  const renderOrganizedGrid = () => (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 space-y-2.5">
      <div className="flex items-start gap-2">
        <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
        <div className="flex flex-wrap gap-1.5 flex-1">
          {item.mealPeriods?.map((period, idx) => (
            <Badge
              key={idx}
              variant="outline"
              className={`text-xs border ${getDaypartColor(period)}`}
            >
              {period}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex items-start gap-2">
        <MapPin className={`h-4 w-4 flex-shrink-0 mt-0.5 ${levelIconColor('placement')}`} />
        <div className="flex-1 max-h-20 overflow-y-auto">
          <div className="flex flex-wrap gap-1.5">
            {item.mealStations?.map((station, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-xs"
              >
                {station.length > 30 ? station.substring(0, 30) + '...' : station}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Option 5: Summary view with expand button
  const renderSummaryView = () => (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {item.mealPeriods?.length || 0} dayparts
          </span>
        </div>
        <button
          onClick={() => setExpandedDetails(!expandedDetails)}
          className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
        >
          {expandedDetails ? 'Hide' : 'Show all'}
          {expandedDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {expandedDetails ? (
        <div className="space-y-2 pt-2 border-t dark:border-gray-700">
          <div className="flex flex-wrap gap-1.5">
            {item.mealPeriods?.map((period, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className={`text-xs border ${getDaypartColor(period)}`}
              >
                {period}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {item.mealStations?.map((station, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {station}
              </Badge>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <MapPin className={`h-4 w-4 ${levelIconColor('placement')}`} />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {item.mealStations?.length || 0} stations
          </span>
        </div>
      )}
    </div>
  );

  const renderDaypartsAndStations = () => {
    // Normalize data - handle both grouped (arrays) and single (string) values
    const periods = item.mealPeriods || (item.mealPeriod ? [item.mealPeriod] : []);
    const stations = item.mealStations || (item.mealStation ? [item.mealStation] : []);
    const activeDays = weekActiveDays;

    return (
      <div className="flex flex-col gap-2 w-full min-w-0">
        {/* Active Days */}
        {activeDays.length > 0 && (
          <div className="flex items-center gap-2 w-full">
            <Calendar className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <div className="flex gap-0.5">
              {[0, 1, 2, 3, 4, 5, 6].map(day => {
                const isActive = activeDays.includes(day);
                return (
                  <div
                    key={day}
                    className={`text-xs px-1 py-0.5 rounded ${
                      isActive
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                    }`}
                    title={DAY_ABBR[day]}
                  >
                    {DAY_ABBR[day][0]}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dayparts - color coded, no icon */}
        {periods.length > 0 && (
          <div className="flex flex-wrap gap-1.5 w-full">
            {periods.map((period, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className={`text-xs border ${getDaypartColor(period)}`}
              >
                {period}
              </Badge>
            ))}
          </div>
        )}

        {/* Stations - show first one with expand button */}
        {stations.length > 0 && (
          <div className="w-full min-w-0">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Stations</div>
            <div className="flex items-start gap-2 w-full min-w-0">
              <div className="text-xs text-gray-700 dark:text-gray-300 truncate min-w-0" style={{ flexBasis: 0, flexGrow: 1 }}>
                {stations[0]}
              </div>
              {stations.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowStationsModal(true);
                  }}
                  className="flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:underline whitespace-nowrap flex-shrink-0"
                >
                  +{stations.length - 1} more
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderOptionsMenu = () => (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          setShowOptions(!showOptions);
        }}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="More options"
      >
        <MoreVertical className="h-5 w-5 text-gray-400 dark:text-gray-500" />
      </Button>
      {showOptions && (
        <Card className="absolute right-0 mt-1 w-48 z-10 bg-white dark:bg-gray-800">
          <CardContent className="p-1">
            {selectedChannel && (
              <Button
                variant="ghost"
                onClick={() => handleOptionClick('add')}
                className={`w-full justify-start ${
                  isInSelectedChannel
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                }`}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isInSelectedChannel ? 'Remove from Channel' : 'Add to Channel'}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => handleOptionClick('assign')}
              className="w-full justify-start text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20"
            >
              <Monitor className="h-4 w-4 mr-2" />
              Assign to Pages
            </Button>
            {deviceCount > 0 && (
              <Button
                variant="ghost"
                onClick={() => handleOptionClick('manage')}
                className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
              >
                <Monitor className="h-4 w-4 mr-2" />
                Manage Devices ({deviceCount})
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => handleOptionClick('edit')}
              className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Item
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (viewMode === 'list') {
    const periods = item.mealPeriods || (item.mealPeriod ? [item.mealPeriod] : []);
    const stations = item.mealStations || (item.mealStation ? [item.mealStation] : []);
    const opensProduct = !!onEdit;

    return (
      <>
        <StationsModal
          isOpen={showStationsModal}
          onClose={() => setShowStationsModal(false)}
          stations={stations}
          itemName={item.name}
        />
        <div
          onClick={opensProduct ? () => onEdit!(item) : undefined}
          data-product-id={item.id}
          className={`group grid grid-cols-[minmax(0,1fr)_auto_auto] ${PRODUCT_ROW_COLS} gap-3 items-center px-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-lg transition-all ${
            opensProduct ? 'hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-sm cursor-pointer' : ''
          } ${!isActive ? 'opacity-50' : ''}`}
        >
          {/* Product name + MRN (dayparts and stations fold in under lg) */}
          <div className="flex items-center gap-3 min-w-0">
            {isActive ? (
              <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</span>
                {refreshTag && <RefreshTagBadge tag={refreshTag} />}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                MRN: {item.mrn}
                <span className="lg:hidden">
                  {periods.length > 0 && ` · ${periods.join(', ')}`}
                  {stations.length > 0 && ` · ${stations.length} ${stations.length === 1 ? 'station' : 'stations'}`}
                </span>
              </p>
            </div>
          </div>

          {/* Dayparts */}
          <div className="hidden lg:flex items-center gap-1 min-w-0" title={periods.join(', ')}>
            {periods.slice(0, 2).map(period => (
              <Badge key={period} variant="outline" className={`text-xs border flex-shrink-0 ${getDaypartColor(period)}`}>
                {period}
              </Badge>
            ))}
            {periods.length > 2 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">+{periods.length - 2}</span>
            )}
          </div>

          {/* Stations */}
          <div className="hidden lg:flex items-center gap-1.5 min-w-0">
            {stations.length > 0 ? (
              <>
                <MapPin className={`h-3.5 w-3.5 flex-shrink-0 ${levelIconColor('placement')}`} />
                <span className="text-sm text-gray-600 dark:text-gray-400 truncate" title={stations.join('\n')}>
                  {stations[0]}
                </span>
                {stations.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowStationsModal(true);
                    }}
                    className="text-xs text-sky-600 dark:text-sky-400 hover:underline whitespace-nowrap flex-shrink-0"
                  >
                    +{stations.length - 1}
                  </button>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-400 dark:text-gray-500">No stations</span>
            )}
          </div>

          {/* Labels it's on */}
          <div className="hidden lg:flex items-center gap-1.5 min-w-0">
            <Tag className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className={`text-xs truncate ${deviceCount > 0 ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
              {deviceCount > 0 ? `On ${deviceCount} ${deviceCount === 1 ? 'label' : 'labels'}` : 'Not on labels'}
            </span>
          </div>

          <span className="hidden lg:block text-xs text-gray-500 dark:text-gray-400 tabular-nums">{item.calories} cal</span>
          <span className="text-sm font-medium text-sky-600 dark:text-sky-400 tabular-nums">${item.price}</span>

          <div className="flex justify-end" onClick={e => e.stopPropagation()}>
            {renderOptionsMenu()}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <StationsModal
        isOpen={showStationsModal}
        onClose={() => setShowStationsModal(false)}
        stations={item.mealStations || []}
        itemName={item.name}
      />
      <Card
        className={`bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow p-6 group flex flex-col min-h-[280px] ${
          isInSelectedChannel ? 'ring-2 ring-sky-500 dark:ring-sky-400' : ''
        } ${!isActive ? 'opacity-50' : ''} relative overflow-hidden`}
      >
      {/* Top row with status, MRN, and actions */}
      <CardHeader className="p-0 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            {isActive ? (
              <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            )}
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              MRN: {item.mrn}
            </span>
            {refreshTag && <RefreshTagBadge tag={refreshTag} />}
            {isInSelectedChannel && (
              <Tag className="h-4 w-4 text-sky-500 dark:text-sky-400 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 relative z-10">
            {item.isGrouped && item.occurrenceCount && item.occurrenceCount > 1 && (
              <Badge variant="secondary" className="text-xs bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300">
                {item.occurrenceCount}x
              </Badge>
            )}
            {selectedChannel && (
              <Button
                variant={isInSelectedChannel ? 'secondary' : 'default'}
                size="sm"
                onClick={handleAssignClick}
                className={`flex items-center gap-1 relative ${
                  isInSelectedChannel
                    ? 'bg-sky-50 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/70'
                    : 'bg-emerald-50 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/70'
                }`}
              >
                {isInSelectedChannel ? (
                  <Monitor className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Content area - flex-1 to push the bottom content down */}
      <CardContent className="flex-1 p-0 min-w-0">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {item.name}
        </h3>
        {(item.description || item.enticingDescription) && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">
            {item.enticingDescription || item.description}
          </p>
        )}
      </CardContent>

      {/* Bottom content - always at the bottom */}
      <CardFooter className="flex-col space-y-4 p-0 mt-4 min-w-0">
        {/* Daypart and Station info */}
        {renderDaypartsAndStations()}

        {/* Price and options */}
        <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700 w-full">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {item.calories} cal
            </span>
            <span className="font-medium text-sky-600 dark:text-sky-400">
              ${item.price}
            </span>
          </div>
          {renderOptionsMenu()}
        </div>
      </CardFooter>
    </Card>
    </>
  );
}

function RefreshTagBadge({ tag }: { tag: 'new' | 'updated' }) {
  return tag === 'new' ? (
    <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white">New</span>
  ) : (
    <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">Updated</span>
  );
}
