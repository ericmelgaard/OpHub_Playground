import React, { useState } from 'react';
import { Device, MenuItem } from '../types';
import { DeviceModal } from '../components/DeviceModal';
import { PageSelectionModal } from '../components/PageSelectionModal';
import { DeviceHeader } from '../components/DeviceHeader';
import { mockPlacements } from '../services/mockData';
import { useModalHistory } from '../hooks/useModalHistory';

interface ItemFirstWorkflowProps {
  devices: Device[];
  menuItems: MenuItem[];
  selectedItem: MenuItem;
  onAssignToPage: (device: Device, items: MenuItem[], pageId: string) => Promise<void>;
  onClose: () => void;
  onForcePage?: (deviceId: string, pageId: string | null) => void;
}

export function ItemFirstWorkflow({
  devices,
  menuItems,
  selectedItem,
  onAssignToPage,
  onClose,
  onForcePage
}: ItemFirstWorkflowProps) {
  const [showDeviceModal, setShowDeviceModal] = useState(true);
  const [showPageSelectionModal, setShowPageSelectionModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isAddingToPage, setIsAddingToPage] = useState<string | null>(null);
  const [lastAssignedPageId, setLastAssignedPageId] = useState<string | null>(null);
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
    setShowPageSelectionModal(false);
    setSelectedDevice(null);
    setOptimisticDevice(null);
    setIsAddingToPage(null);
    setLastAssignedPageId(null);
    onClose();
  };

  const handleBackToDeviceModal = () => {
    setShowPageSelectionModal(false);
    setShowDeviceModal(true);
  };

  const handleDeviceSelect = (device: Device) => {
    const deviceClone = JSON.parse(JSON.stringify(device));
    setSelectedDevice(deviceClone);
    setOptimisticDevice(deviceClone);
    setShowDeviceModal(false);
    setShowPageSelectionModal(true);
  };

  const handleAssignToPage = async (device: Device, items: MenuItem[], pageId: string) => {
    if (!optimisticDevice) return;

    // Create optimistic update
    const updatedDevice = JSON.parse(JSON.stringify(optimisticDevice));
    const page = updatedDevice.pages.find(p => p.id === pageId);
    if (!page) return;

    // Check for duplicates in this specific page
    const duplicateItems = items.filter(item => 
      page.assignedItems.some(existing => existing.id === item.id)
    );
    const newItems = items.filter(item => 
      !page.assignedItems.some(existing => existing.id === item.id)
    );

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
    setIsAddingToPage(pageId);

    try {
      // Make API call
      await onAssignToPage(device, items, pageId);
      
      // Keep using our optimistic update since it matches what the server will return
      setSelectedDevice(updatedDevice);
      setLastAssignedPageId(pageId);
    } catch (err) {
      console.error('Error adding items:', err);
      // Revert to last known good state
      const currentDevice = devices.find(d => d.id === device.id);
      if (currentDevice) {
        const currentDeviceClone = JSON.parse(JSON.stringify(currentDevice));
        setOptimisticDevice(currentDeviceClone);
        setSelectedDevice(currentDeviceClone);
      }
    } finally {
      setIsAddingToPage(null);
      // Clear success state after a delay
      setTimeout(() => {
        setLastAssignedPageId(null);
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

  // Add modal IDs for history management
  const deviceModalState = { id: 'device-select', isOpen: showDeviceModal };
  const pageSelectionModalState = { id: 'page-selection', isOpen: showPageSelectionModal };

  // Use the improved hook for each modal
  useModalHistory(deviceModalState, handleCloseModals, true); // Top-level modal
  useModalHistory(pageSelectionModalState, handleBackToDeviceModal); // Nested modal

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
        mode="assign"
        onDeviceSelect={handleDeviceSelect}
        selectedItems={[selectedItem]}
        onClose={handleCloseModals}
        placements={mockPlacements}
      />

      <PageSelectionModal
        show={showPageSelectionModal}
        onClose={handleBackToDeviceModal}
        selectedDevice={optimisticDevice}
        selectedItems={[selectedItem]}
        onAssignToPage={handleAssignToPage}
        menuItems={menuItems}
        isAddingToPage={isAddingToPage}
        lastAssignedPageId={lastAssignedPageId}
        header={optimisticDevice && (
          <DeviceHeader
            device={optimisticDevice}
            onClose={handleCloseModals}
            onOpenConfig={() => {}}
          />
        )}
      />
    </>
  );
}