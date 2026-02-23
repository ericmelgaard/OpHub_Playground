import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  LayoutGrid,
  Rows,
  ChevronRight,
  Search,
  Building2,
  Store,
  Camera,
  Monitor,
  Plus,
  Database,
  Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Placement } from '../types';

interface MenuFiltersProps {
  mealPeriods: string[];
  selectedMealPeriod: string;
  setSelectedMealPeriod: (period: string) => void;
  stations: string[];
  selectedStation: string;
  setSelectedStation: (station: string) => void;
  viewMode: 'grid' | 'tiles';
  setViewMode: (mode: 'grid' | 'tiles') => void;
  searchValue: string;
  setSearchValue: (value: string) => void;
  selectedLocation?: {
    concept?: string;
    company?: string;
    store?: string;
  };
  showDevices: boolean;
  setShowDevices: (show: boolean) => void;
  onCreateItem: () => void;
  placements?: Placement[];
  selectedPlacement: string | null;
  setSelectedPlacement: (id: string | null) => void;
}

export function MenuFilters({
  mealPeriods,
  selectedMealPeriod,
  setSelectedMealPeriod,
  stations,
  selectedStation,
  setSelectedStation,
  viewMode,
  setViewMode,
  searchValue,
  setSearchValue,
  selectedLocation,
  showDevices,
  setShowDevices,
  onCreateItem,
  placements = [],
  selectedPlacement,
  setSelectedPlacement,
}: MenuFiltersProps) {
  const [mealPeriodExpanded, setMealPeriodExpanded] = useState(false);
  const [stationExpanded, setStationExpanded] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showPlacementFilter, setShowPlacementFilter] = useState(false);

  const handleScanBarcode = () => {
    // This will be implemented when the barcode scanning API is available
    console.log('Barcode scanning will be implemented when API is available');
  };

  const getPlacementPath = (id: string | null): string => {
    if (!id) return 'All Locations';

    const findPath = (id: string, placements: Placement[], path: string[] = []): string[] | null => {
      for (const placement of placements) {
        if (placement.id === id) {
          return [...path, placement.name];
        }
        const childPath = findPath(id, placement.children, [...path, placement.name]);
        if (childPath) return childPath;
      }
      return null;
    };

    const path = findPath(id, placements);
    return path ? path.join(' / ') : 'All Locations';
  };

  const renderLocationInfo = () => {
    if (!selectedLocation) return null;

    return (
      <div className="flex flex-col sm:flex-row sm:items-center text-sm">
        {selectedLocation.store && (
          <div className="flex items-center gap-1">
            <Store className="h-3 w-3 text-gray-400 dark:text-gray-500" />
            <span className="text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
              {selectedLocation.store}
            </span>
          </div>
        )}
        {selectedLocation.company && (
          <>
            <span className="hidden sm:inline text-gray-400 dark:text-gray-500 mx-2">
              •
            </span>
            <div className="flex items-center gap-1 mt-1 sm:mt-0">
              <Building2 className="h-3 w-3 text-gray-400 dark:text-gray-500" />
              <span className="text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                {selectedLocation.company}
              </span>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderDataSourceIndicator = () => (
    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
      <Database className="h-3 w-3" />
      <span>Webtrition</span>
    </div>
  );

  const renderPlacementFilter = () => {
    const renderPlacement = (placement: Placement, level = 0) => (
      <div key={placement.id} className="space-y-1">
        <Button
          variant={selectedPlacement === placement.id ? 'default' : 'ghost'}
          onClick={() => {
            setSelectedPlacement(selectedPlacement === placement.id ? null : placement.id);
            setShowPlacementFilter(false);
          }}
          className={`w-full justify-start ${
            selectedPlacement === placement.id
              ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
              : 'text-gray-700 dark:text-gray-300'
          }`}
          style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
        >
          <div className="flex items-center gap-2">
            {placement.devices.length > 0 ? (
              <Monitor className="h-4 w-4" />
            ) : (
              <Store className="h-4 w-4" />
            )}
            <span>{placement.name}</span>
          </div>
        </Button>

        {placement.children.length > 0 && (
          <div className="space-y-1">
            {placement.children.map((child) => renderPlacement(child, level + 1))}
          </div>
        )}
      </div>
    );

    return (
      <Card className="mt-2 bg-white dark:bg-gray-800">
        <CardContent className="p-3">
          <div className="space-y-1">
            <Button
              variant={!selectedPlacement ? 'default' : 'ghost'}
              onClick={() => {
                setSelectedPlacement(null);
                setShowPlacementFilter(false);
              }}
              className="w-full justify-start"
            >
              <Store className="h-4 w-4 mr-2" />
              All Locations
            </Button>
            {placements.map((placement) => renderPlacement(placement))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="mb-8 space-y-4">
      <div>
        <Button
          variant="ghost"
          onClick={() => {
            if (showDevices) {
              setShowPlacementFilter(!showPlacementFilter);
            } else {
              setMealPeriodExpanded(!mealPeriodExpanded);
            }
          }}
          className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all hover:bg-white hover:dark:bg-gray-800"
        >
          <div className="flex items-center gap-2">
            {showDevices ? (
              <Store className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            )}
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {showDevices ? 'Location: ' : 'Menu Items: '}
                <span className="text-indigo-600 dark:text-indigo-400">
                  {showDevices
                    ? getPlacementPath(selectedPlacement)
                    : selectedMealPeriod === 'all'
                    ? 'All Periods'
                    : selectedMealPeriod}
                </span>
              </span>
              {selectedLocation && (
                <>
                  <span className="hidden sm:inline text-gray-400 dark:text-gray-500">
                    •
                  </span>
                  {renderLocationInfo()}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {renderDataSourceIndicator()}
            <ChevronRight
              className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform ${
                (showDevices ? showPlacementFilter : mealPeriodExpanded) ? 'transform rotate-90' : ''
              }`}
            />
          </div>
        </Button>

        {showDevices ? (
          showPlacementFilter && renderPlacementFilter()
        ) : (
          mealPeriodExpanded && (
            <Card className="mt-2 bg-white dark:bg-gray-800">
              <CardContent className="p-3">
                <div className="flex flex-wrap gap-2">
                  {mealPeriods.map((period) => (
                    <Button
                      key={period}
                      variant={
                        selectedMealPeriod === period ? 'default' : 'secondary'
                      }
                      onClick={() => setSelectedMealPeriod(period)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2
                      ${
                        selectedMealPeriod === period
                          ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      size="sm"
                    >
                      <Clock className="h-4 w-4" />
                      {period === 'all' ? 'All Periods' : period}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {!showDevices && (
        <div>
          <Button
            variant="ghost"
            onClick={() => setStationExpanded(!stationExpanded)}
            className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all hover:bg-white hover:dark:bg-gray-800"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <span className="font-medium text-gray-900 dark:text-white">
                  Station:{' '}
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {selectedStation === 'all' ? 'All Stations' : selectedStation}
                  </span>
                </span>
                {selectedLocation && (
                  <>
                    <span className="hidden sm:inline text-gray-400 dark:text-gray-500">
                      •
                    </span>
                    {renderLocationInfo()}
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {renderDataSourceIndicator()}
              <ChevronRight
                className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform ${
                  stationExpanded ? 'transform rotate-90' : ''
                }`}
              />
            </div>
          </Button>

          {stationExpanded && (
            <Card className="mt-2 bg-white dark:bg-gray-800">
              <CardContent className="p-3">
                <div className="flex flex-wrap gap-2">
                  {stations.map((station) => (
                    <Button
                      key={station}
                      variant={
                        selectedStation === station ? 'default' : 'secondary'
                      }
                      onClick={() => setSelectedStation(station)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2
                      ${
                        selectedStation === station
                          ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      size="sm"
                    >
                      <MapPin className="h-4 w-4" />
                      {station === 'all' ? 'All Stations' : station}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
        {/* Search Bar */}
        <div className="relative flex-1 order-2 sm:order-1">
          <Input
            type="text"
            placeholder={showDevices ? "Search devices..." : "Search menu items..."}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full pl-10 pr-12 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleScanBarcode}
            className="md:hidden absolute right-2 top-1.5 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Scan barcode"
          >
            <Camera className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 order-1 sm:order-2">
          {!showDevices && (
            <Button
              variant="secondary"
              onClick={onCreateItem}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/70"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Item</span>
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => setShowDevices(!showDevices)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              showDevices
                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">
              {showDevices ? 'Show Menu' : 'Show Devices'}
            </span>
          </Button>

          <Button
            variant="secondary"
            size="icon"
            onClick={() => setViewMode(viewMode === 'grid' ? 'tiles' : 'grid')}
            className={`p-2 rounded-lg transition-colors ${
              'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          >
            {viewMode === 'grid' ? (
              <Rows className="h-5 w-5" />
            ) : (
              <LayoutGrid className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}