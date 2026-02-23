import React from 'react';
import { X, Clock, Plus, Check, AlertCircle } from 'lucide-react';
import { Device, MenuItem, DevicePage } from '../types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PageSelectionModalProps {
  show: boolean;
  onClose: () => void;
  selectedDevice: Device | null;
  selectedItems: MenuItem[];
  onAssignToPage: (
    device: Device,
    items: MenuItem[],
    pageId: string
  ) => Promise<void>;
  menuItems: MenuItem[];
  isAddingToPage?: string | null;
  lastAssignedPageId?: string | null;
  header?: ReactNode;
}

const getDaypartColor = (daypart: string) => {
  switch (daypart) {
    case 'Breakfast':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'Lunch':
      return 'text-green-600 dark:text-green-400';
    case 'Dinner':
      return 'text-blue-600 dark:text-blue-400';
    case 'Late Night':
      return 'text-purple-600 dark:text-purple-400';
    case 'Custom':
      return 'text-gray-600 dark:text-gray-400';
    default:
      return 'text-indigo-600 dark:text-indigo-400';
  }
};

const getDaypartBg = (daypart: string) => {
  switch (daypart) {
    case 'Breakfast':
      return 'bg-yellow-50 dark:bg-yellow-900/20';
    case 'Lunch':
      return 'bg-green-50 dark:bg-green-900/20';
    case 'Dinner':
      return 'bg-blue-50 dark:bg-blue-900/20';
    case 'Late Night':
      return 'bg-purple-50 dark:bg-purple-900/20';
    case 'Custom':
      return 'bg-gray-50 dark:bg-gray-900/20';
    default:
      return 'bg-indigo-50 dark:bg-indigo-900/20';
  }
};

export function PageSelectionModal({
  show,
  onClose,
  selectedDevice,
  selectedItems,
  onAssignToPage,
  menuItems,
  isAddingToPage,
  lastAssignedPageId,
  header,
}: PageSelectionModalProps) {
  if (!show || !selectedDevice) return null;

  const handleAssignToPage = async (pageId: string) => {
    if (!selectedDevice || selectedItems.length === 0) return;
    await onAssignToPage(selectedDevice, selectedItems, pageId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-container">
      <Card className="bg-white dark:bg-gray-800 rounded-lg w-full h-[90vh] max-w-6xl flex flex-col modal-content">
        <CardHeader className="flex-shrink-0 p-6 border-b dark:border-gray-700 modal-header">
          {header}
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto scrollbar-thin p-6 modal-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedDevice.pages.map((page) => {
              const isLoading = isAddingToPage === page.id;
              const wasRecentlyAdded = lastAssignedPageId === page.id;

              const hasDuplicates =
                !wasRecentlyAdded &&
                selectedItems.some((item) =>
                  page.assignedItems.some((existing) => existing.id === item.id)
                );

              return (
                <Card
                  key={page.id}
                  className={`border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 transition-all duration-200 ${
                    wasRecentlyAdded
                      ? 'ring-2 ring-green-500 dark:ring-green-400 transform scale-[1.02]'
                      : ''
                  }`}
                >
                  <CardHeader
                    className={`px-4 py-3 rounded-t-lg border-b dark:border-gray-700 ${getDaypartBg(
                      page.daypart
                    )}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Clock
                          className={`h-4 w-4 ${getDaypartColor(page.daypart)}`}
                        />
                        <h4
                          className={`text-sm font-medium ${getDaypartColor(
                            page.daypart
                          )}`}
                        >
                          {page.daypart}
                        </h4>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-0.5"
                      >
                        HI Page {page.name.split(' ')[1]}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {page.assignedItems.length} items •{' '}
                        {page.displayCapacity} display slots
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4">
                    {page.assignedItems.length === 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center h-[200px] border-2 border-dashed dark:border-gray-700 rounded-lg">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No items assigned
                          </p>
                        </div>
                        <Button
                          onClick={() => handleAssignToPage(page.id)}
                          disabled={isLoading}
                          className={`w-full flex items-center justify-center gap-2 transition-all duration-200 ${
                            wasRecentlyAdded
                              ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/50'
                              : isLoading
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                              : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/70'
                          }`}
                        >
                          {wasRecentlyAdded ? (
                            <>
                              <Check className="h-4 w-4" />
                              Added Successfully
                            </>
                          ) : isLoading ? (
                            'Adding...'
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              Add Items Here
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          {page.itemOrder.slice(0, 3).map((itemId) => {
                            const item = page.assignedItems.find(
                              (i) => i.id === itemId
                            );
                            if (!item) return null;

                            return (
                              <Card
                                key={`${item.id}`}
                                className="flex items-center justify-between p-3 border dark:border-gray-700 bg-white dark:bg-gray-800"
                              >
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {item.name}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    ${item.price}
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                          {page.assignedItems.length > 3 && (
                            <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
                              +{page.assignedItems.length - 3} more items
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={() => handleAssignToPage(page.id)}
                          disabled={isLoading}
                          className={`w-full flex items-center justify-center gap-2 transition-all duration-200 ${
                            wasRecentlyAdded
                              ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/50'
                              : isLoading
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                              : hasDuplicates
                              ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/50 hover:bg-yellow-100 dark:hover:bg-yellow-900/70'
                              : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/70'
                          }`}
                        >
                          {wasRecentlyAdded ? (
                            <>
                              <Check className="h-4 w-4" />
                              Added Successfully
                            </>
                          ) : isLoading ? (
                            'Adding...'
                          ) : hasDuplicates ? (
                            <>
                              <AlertCircle className="h-4 w-4" />
                              Item already assigned
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              Add Items Here
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
