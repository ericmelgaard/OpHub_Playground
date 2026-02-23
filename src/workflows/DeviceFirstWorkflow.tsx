import React, { useState } from 'react';
import { Device, MenuItem } from '../types';
import { DeviceModal } from '../components/DeviceModal';
import { DeviceSettingsModal } from '../components/DeviceSettingsModal';
import { ItemSelectionModal } from '../components/ItemSelectionModal';
import { DeviceHeader } from '../components/DeviceHeader';
import { mockPlacements } from '../services/mockData';
import { useModalHistory } from '../hooks/useModalHistory';

interface DeviceFirstWorkflowProps {
  devices: Device[];
  menuItems: MenuItem[];
  onAddItems: (device: Device, items: MenuItem[], pageId: string) => void;
  onRemoveItem: (itemId: number, deviceId: string, pageId: string) => void;
  onReorderItems: (deviceId: string, pageId: string, startIndex: number, endIndex: number) => void;
  onClose: () => void;
  onForcePage?: (deviceId: string, pageId: string | null) => void;
  setNotifications: (count: number) => void;
}

export function DeviceFirstWorkflow({
  devices,
  menuItems,
  onAddItems,
  onRemoveItem,
  onReorderItems,
  onClose,
  onForcePage,
  setNotifications
}: DeviceFirstWorkflowProps) {
  const [showDeviceModal, setShowDeviceModal] = useState(true);
  const [showDeviceSettingsModal, setShowDeviceSettingsModal] = useState(false);
  const [showItemSelectionModal, setShowItemSelectionModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isAddingToPage, setIsAddingToPage] = useState<string | null>(null);
  const [lastAssignedPageId, setLastAssignedPageId] = useState<string | null>(null);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [optimisticDevice, setOptimisticDevice] = useState<Device | null>(null);
  const [deviceSearchValue, setDeviceSearchValue] = useState('');
  const [itemSearchValue, setItemSearchValue] = useState('');
  const [selectedMealPeriod, setSelectedMealPeriod] = useState('all');
  const [selectedStation, setSelectedStation] = useState('all');

  // Get unique meal periods and stations from menu items
  const mealPeriods = ['all', ...new Set(menuItems.map(item => item.mealPeriod))];
  const stations = ['all', ...new Set(menuItems.map(item => item.mealStation))];

  const handleCloseModals = () => {
    setShowDeviceModal(false);
    setShowDeviceSettingsModal(false);
    setShowItemSelectionModal(false);
    setSelectedDevice(null);
    setOptimisticDevice(null);
    setSelectedPageId(null);
    setIsAddingToPage(null);
    setLastAssignedPageId(null);
    setDuplicateCount(0);
    onClose();
  };

  const handleDeviceSelect = (device: Device) => {
    const deviceClone = JSON.parse(JSON.stringify(device));
    setSelectedDevice(deviceClone);
    setOptimisticDevice(deviceClone);
    setShowDeviceModal(false);
    setShowDeviceSettingsModal(true);
  };

  const handleAddItems = (device: Device, pageId: string) => {
    setSelectedDevice(device);
    setSelectedPageId(pageId);
    setShowItemSelectionModal(true);
  };

  const handleItemSelect = async (items: MenuItem[]) => {
    if (!selectedDevice || !selectedPageId || items.length === 0 || !optimisticDevice) return;

    // Create optimistic update
    const updatedDevice = JSON.parse(JSON.stringify(optimisticDevice));
    const page = updatedDevice.pages.find(p => p.id === selectedPageId);
    if (!page) return;

    // Track which items were duplicates
    const duplicateItems = items.filter(item => 
      page.assignedItems.some(existing => existing.id === item.id)
    );
    const newItems = items.filter(item => 
      !page.assignedItems.some(existing => existing.id === item.id)
    );

    // Store duplicate count for warning message
    setDuplicateCount(duplicateItems.length);

    // Add only new items to page
    newItems.forEach(item => {
      page.assignedItems.push(item);
      page.itemOrder.push(item.id);
    });

    // Add new items to device if not already present
    newItems.forEach(item => {
      if (!updatedDevice.assignedItems.some(i => i.id === item.id)) {
        updatedDevice.assignedItems.push(item);
      }
    });

    // Update UI immediately with optimistic state
    setOptimisticDevice(updatedDevice);
    setIsAddingToPage(selectedPageId);
    setShowItemSelectionModal(false);
    setShowDeviceSettingsModal(true);

    try {
      // Make API call
      await onAddItems(selectedDevice, items, selectedPageId);
      
      // Keep using our optimistic update since it matches what the server will return
      setSelectedDevice(updatedDevice);
      setLastAssignedPageId(selectedPageId);
    } catch (err) {
      console.error('Error adding items:', err);
      // Revert to last known good state
      const currentDevice = devices.find(d => d.id === selectedDevice.id);
      if (currentDevice) {
        const currentDeviceClone = JSON.parse(JSON.stringify(currentDevice));
        setOptimisticDevice(currentDeviceClone);
        setSelectedDevice(currentDeviceClone);
      }
    } finally {
      setIsAddingToPage(null);
      // Keep warning/success state visible longer
      setTimeout(() => {
        setLastAssignedPageId(null);
        setDuplicateCount(0);
      }, 2000);
    }
  };

  const handleForcePage = (pageId: string | null) => {
    if (!selectedDevice || !onForcePage) return;
    
    // Create optimistic update
    const updatedDevice = JSON.parse(JSON.stringify(optimisticDevice));
    updatedDevice.status.forcedPage = pageId;
    if (pageId) {
      updatedDevice.status.currentPage = pageId;
    }
    
    // Update UI immediately
    setOptimisticDevice(updatedDevice);
    
    // Make API call
    onForcePage(selectedDevice.id, pageId);
  };

  const handleReorderItems = async (deviceId: string, pageId: string, startIndex: number, endIndex: number) => {
    if (!optimisticDevice) return;

    // Create optimistic update
    const updatedDevice = JSON.parse(JSON.stringify(optimisticDevice));
    const page = updatedDevice.pages.find(p => p.id === pageId);
    if (!page) return;

    // Perform the reorder optimistically
    const [removed] = page.itemOrder.splice(startIndex, 1);
    page.itemOrder.splice(endIndex, 0, removed);

    // Update UI immediately
    setOptimisticDevice(updatedDevice);

    try {
      // Make API call
      await onReorderItems(deviceId, pageId, startIndex, endIndex);
      
      // Keep using our optimistic update
      setSelectedDevice(updatedDevice);
    } catch (err) {
      console.error('Error reordering items:', err);
      // Revert to last known good state
      const currentDevice = devices.find(d => d.id === deviceId);
      if (currentDevice) {
        const currentDeviceClone = JSON.parse(JSON.stringify(currentDevice));
        setOptimisticDevice(currentDeviceClone);
        setSelectedDevice(currentDeviceClone);
      }
    }
  };

  // Add modal IDs for history management after all functions are defined
  const deviceModalState = { id: 'device-select', isOpen: showDeviceModal };
  const settingsModalState = { id: 'device-settings', isOpen: showDeviceSettingsModal };
  const itemSelectionModalState = { id: 'item-selection', isOpen: showItemSelectionModal };

  // Use the improved hook for each modal
  useModalHistory(deviceModalState, handleCloseModals, true); // Top-level modal
  useModalHistory(settingsModalState, () => {
    setShowDeviceSettingsModal(false);
    setShowDeviceModal(true);
  });
  useModalHistory(itemSelectionModalState, () => {
    setShowItemSelectionModal(false);
    setShowDeviceSettingsModal(true);
  });

  return (
    <>
      <DeviceModal
        showDeviceModal={showDeviceModal}
        deviceSearchValue={deviceSearchValue}
        setDeviceSearchValue={setDeviceSearchValue}
        selectedLocation="all"
        setSelectedLocation={() => {}}
        filteredDevices={devices}
        locations={[]}
        mode="manage"
        onDeviceSelect={handleDeviceSelect}
        selectedItems={[]}
        onClose={handleCloseModals}
        placements={mockPlacements}
      />

      <DeviceSettingsModal
        showDeviceSettingsModal={showDeviceSettingsModal}
        selectedDeviceSettings={optimisticDevice}
        setShowDeviceSettingsModal={setShowDeviceSettingsModal}
        setSelectedDeviceSettings={setOptimisticDevice}
        removeItemFromDevice={onRemoveItem}
        reorderItems={handleReorderItems}
        onAddItems={handleAddItems}
        onClose={handleCloseModals}
        isAddingToPage={isAddingToPage}
        lastAssignedPageId={lastAssignedPageId}
        duplicateCount={duplicateCount}
        header={optimisticDevice && (
          <DeviceHeader
            device={optimisticDevice}
            onClose={handleCloseModals}
            onForcePage={handleForcePage}
          />
        )}
        setNotifications={setNotifications}
      />

      <ItemSelectionModal
        show={showItemSelectionModal}
        onClose={() => {
          setShowItemSelectionModal(false);
          setShowDeviceSettingsModal(true);
        }}
        menuItems={menuItems}
        selectedDevice={optimisticDevice}
        onItemSelect={handleItemSelect}
        searchValue={itemSearchValue}
        setSearchValue={setItemSearchValue}
        selectedMealPeriod={selectedMealPeriod}
        setSelectedMealPeriod={setSelectedMealPeriod}
        selectedStation={selectedStation}
        setSelectedStation={setSelectedStation}
        mealPeriods={mealPeriods}
        stations={stations}
        selectedPage={selectedPageId}
      />
    </>
  );
}