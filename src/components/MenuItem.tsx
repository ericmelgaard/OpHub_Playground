import React, { useState, useMemo } from 'react';
import { Coffee, MapPin, MoreVertical, Plus, Clock, ChevronDown, ChevronUp, ChevronRight, Calendar, Eye, Link2 } from 'lucide-react';
import { MenuItem as MenuItemType, Device } from '../types';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { StationsModal } from './StationsModal';
import { daypartColor } from '../lib/daypartColors';
import { levelIconColor } from '@/lib/levelColors';
import { plainText } from '../lib/richText';
import { menuDaysInWeek, sortDayparts, type LabelUse } from '../lib/weekSchedule';
import { productDayparts, ALL_DAYPARTS } from '../lib/stations';
import { ProductDayStrip } from './ProductDays';
import { labelName, isCustomItem, wandId, linkedSourceId } from '../lib/labelDisplay';
import { CopyButton } from './CopyButton';

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
  // Opens the product sheet (card / row click, and View product in the menu)
  onOpen?: (item: MenuItemType) => void;
  // Opened last: sky ring, same as labels
  lastOpened?: boolean;
  // Days this product is on labels in the selected week
  labelDays?: Set<number>;
  // Where it's on labels; a custom product's dayparts and stations come only from here
  labelUse?: LabelUse;
  selectedCycleWeek?: number;
  refreshTag?: 'new' | 'updated';
}

// Columns shared by the product list header (MenuItems) and each row
export const PRODUCT_ROW_COLS = 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_150px_70px_80px_84px]';

export function MenuItem({
  item,
  expandedItem,
  toggleItemExpansion,
  setSelectedItem,
  setShowDeviceModal,
  setShowPageSelectionModal,
  setWorkflowType,
  viewMode,
  onEdit,
  onOpen,
  lastOpened,
  labelDays,
  labelUse,
  selectedCycleWeek,
  refreshTag,
}: MenuItemProps) {
  const [expandedDetails, setExpandedDetails] = useState(false);

  // Dayparts are the product's own (none = all dayparts). Stations: from the source for imported
  // products, from the labels it's on for custom ones
  const placement = useMemo(() => ({
    periods: sortDayparts(productDayparts(item)),
    stations: isCustomItem(item)
      ? [...(labelUse?.stations ?? [])].sort()
      : item.mealStations || (item.mealStation ? [item.mealStation] : []),
  }), [item, labelUse]);

  const menuDays = useMemo(
    () => menuDaysInWeek(item, selectedCycleWeek ?? 0),
    [item, selectedCycleWeek],
  );
  const [showStationsModal, setShowStationsModal] = useState(false);

  const isActive = item.isActive !== false;

  const handleOptionClick = (action: 'manage' | 'edit' | 'assign') => {

    switch (action) {
      case 'manage':
        setSelectedItem(item);
        setWorkflowType('manage');
        setShowDeviceModal(true);
        break;
      case 'edit':
        onEdit?.(item);
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
    handleOptionClick('assign');
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
    const { periods, stations } = placement;
    const activeDays = menuDays;

    return (
      <div className="flex flex-col gap-2 w-full min-w-0">
        {/* Days: Webtrition menu, on labels, or both */}
        {(activeDays.length > 0 || (labelDays?.size ?? 0) > 0) && (
          <div className="flex items-center gap-2 w-full">
            <Calendar className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <ProductDayStrip menuDays={activeDays} labelDays={labelDays} />
          </div>
        )}

        {/* Dayparts - color coded, no icon; none means all of them */}
        <div className="flex flex-wrap gap-1.5 w-full">
          {(periods.length > 0 ? periods : [ALL_DAYPARTS]).map((period, idx) => (
            <Badge
              key={idx}
              variant="outline"
              className={`text-xs border ${getDaypartColor(period)}`}
            >
              {period}
            </Badge>
          ))}
        </div>

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => e.stopPropagation()}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="More options"
        >
          <MoreVertical className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
        {onOpen && (
          <DropdownMenuItem onSelect={() => onOpen(item)}>
            <Eye />
            View product
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => handleOptionClick('assign')}>
          <Plus />
          Add to label
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Quick add to a label
  const renderAddButton = () => (
    <Button
      variant="outline"
      size="sm"
      onClick={handleAssignClick}
      aria-label="Add to label"
      title="Add to label"
      className="h-9 w-9 p-0 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/30"
    >
      <Plus className="h-4 w-4" />
    </Button>
  );

  if (viewMode === 'list') {
    const { periods, stations } = placement;
    const opensProduct = !!onOpen;

    return (
      <>
        <StationsModal
          isOpen={showStationsModal}
          onClose={() => setShowStationsModal(false)}
          stations={stations}
          itemName={item.name}
        />
        <div
          onClick={opensProduct ? () => onOpen!(item) : undefined}
          data-product-id={item.id}
          className={`group grid grid-cols-[minmax(0,1fr)_auto_auto] ${PRODUCT_ROW_COLS} gap-3 items-center px-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-lg transition-all ${
            opensProduct ? 'hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-sm cursor-pointer' : ''
          } ${!isActive ? 'opacity-50' : ''} ${lastOpened ? 'ring-2 ring-sky-400 dark:ring-sky-500' : ''}`}
        >
          {/* Product name + MRN (dayparts and stations fold in under lg) */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</span>
                {refreshTag && <RefreshTagBadge tag={refreshTag} />}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                <ItemIds item={item} />
                {item.displayName?.trim() && <> · Shows as “{labelName(item)}”</>}
                <span className="lg:hidden">
                  {` · ${periods.length > 0 ? periods.join(', ') : ALL_DAYPARTS}`}
                  {stations.length > 0 && ` · ${stations.length} ${stations.length === 1 ? 'station' : 'stations'}`}
                </span>
              </p>
            </div>
          </div>

          {/* Dayparts */}
          <div className="hidden lg:flex items-center gap-1 min-w-0" title={periods.length ? periods.join(', ') : ALL_DAYPARTS}>
            {(periods.length > 0 ? periods : [ALL_DAYPARTS]).slice(0, 2).map(period => (
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

          {/* Days: Webtrition menu, on labels, or both */}
          <div className="hidden lg:flex items-center min-w-0">
            <ProductDayStrip menuDays={menuDays} labelDays={labelDays} />
          </div>

          <span className="hidden lg:block text-xs text-gray-500 dark:text-gray-400 tabular-nums">{item.calories} cal</span>
          <span className="text-sm font-medium text-sky-600 dark:text-sky-400 tabular-nums">${item.price}</span>

          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
            {renderAddButton()}
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
        stations={placement.stations}
        itemName={item.name}
      />
      <Card
        onClick={onOpen ? () => onOpen(item) : undefined}
        data-product-id={item.id}
        className={`bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow p-6 group flex flex-col min-h-[280px] ${onOpen ? 'cursor-pointer' : ''} ${!isActive ? 'opacity-50' : ''} ${lastOpened ? 'ring-2 ring-sky-400 dark:ring-sky-500' : ''} relative overflow-hidden`}
      >
      {/* Top row with MRN and the quick add */}
      <CardHeader className="p-0 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              <ItemIds item={item} />
            </span>
            {refreshTag && <RefreshTagBadge tag={refreshTag} />}
          </div>
          <div className="flex items-center gap-2 relative z-10" onClick={e => e.stopPropagation()}>
            {renderAddButton()}
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
            {plainText(item.enticingDescription || item.description)}
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

// The WAND ID first; a linked item also shows the source item it's linked to
function ItemIds({ item }: { item: MenuItemType }) {
  const source = linkedSourceId(item);
  return (
    <>
      <span className="inline-flex items-center gap-0.5">
        ID {wandId(item)}
        <CopyButton value={wandId(item)} size="xs" />
      </span>
      {source && (
        <span className="inline-flex items-center gap-1 ml-2 font-normal text-gray-400 dark:text-gray-500" title={`Linked to source item ${source}`}>
          <Link2 className="h-3 w-3 flex-shrink-0" />
          {source}
          <CopyButton value={source} label="source ID" size="xs" />
        </span>
      )}
    </>
  );
}
