import { useEffect, useCallback } from 'react';

interface ModalState {
  id: string;
  isOpen: boolean;
}

export function useModalHistory(
  modalState: ModalState,
  onClose: () => void,
  isTopLevel: boolean = false
) {
  // Memoize the handler to prevent unnecessary re-renders
  const handlePopState = useCallback((event: PopStateEvent) => {
    // Check if this modal should handle the pop state
    if (modalState.isOpen) {
      onClose();
    }
  }, [modalState.isOpen, onClose]);

  useEffect(() => {
    if (!modalState.isOpen) return;

    // For nested modals, replace the current state instead of pushing
    if (!isTopLevel && window.history.state?.modalId) {
      window.history.replaceState(
        { 
          appRoot: true,
          modalId: modalState.id,
          isNested: true
        },
        ''
      );
    } else {
      // For top-level modals or first modal, push new state
      window.history.pushState(
        { 
          appRoot: true,
          modalId: modalState.id,
          isNested: false
        },
        ''
      );
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      
      // Only modify history if this modal is still open when unmounting
      if (modalState.isOpen) {
        // Check if there are other modals in the stack
        const hasOtherModals = document.querySelector('.modal-container');
        
        if (!hasOtherModals) {
          // If this was the last modal, restore app root state without modal ID
          window.history.replaceState({ appRoot: true }, '');
        }
      }
    };
  }, [modalState.isOpen, modalState.id, handlePopState, isTopLevel]);
}