import { useState, useRef, useCallback, useEffect } from 'react';

interface NfcState {
  supported: boolean;
  scanning: boolean;
  error: string | null;
}

interface NfcReading {
  text: string;
  timestamp: number;
}

export function useNfc() {
  const [state, setState] = useState<NfcState>({
    supported: false,
    scanning: false,
    error: null,
  });
  const [lastReading, setLastReading] = useState<NfcReading | null>(null);
  const readerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('NDEFReader' in window)) {
      setState((s) => ({ ...s, supported: false }));
      return;
    }
    setState((s) => ({ ...s, supported: true }));
  }, []);

  const startScan = useCallback(async () => {
    if (!('NDEFReader' in window)) {
      setState((s) => ({ ...s, error: 'NFC is not supported on this device or browser' }));
      return;
    }

    try {
      const reader = new (window as any).NDEFReader();
      readerRef.current = reader;

      await reader.scan();
      setState((s) => ({ ...s, scanning: true, error: null }));

      reader.addEventListener('reading', (event: any) => {
        let text = '';
        if (event.message && event.message.records) {
          for (const record of event.message.records) {
            if (record.recordType === 'text') {
              const decoder = new TextDecoder(record.encoding || 'utf-8');
              text += decoder.decode(record.data);
            } else if (record.recordType === 'url') {
              const decoder = new TextDecoder();
              text += decoder.decode(record.data);
            }
          }
        }
        if (text) {
          setLastReading({ text, timestamp: Date.now() });
        }
      });

      reader.addEventListener('error', () => {
        setState((s) => ({ ...s, scanning: false, error: 'NFC scan was interrupted' }));
      });
    } catch (err: any) {
      setState((s) => ({
        ...s,
        scanning: false,
        error: err?.message || 'Failed to start NFC scan. Make sure NFC is enabled and the page is served over HTTPS.',
      }));
    }
  }, []);

  const stopScan = useCallback(() => {
    if (readerRef.current) {
      readerRef.current = null;
    }
    setState((s) => ({ ...s, scanning: false }));
  }, []);

  const clearReading = useCallback(() => {
    setLastReading(null);
    setState((s) => ({ ...s, error: null }));
  }, []);

  return {
    supported: state.supported,
    scanning: state.scanning,
    error: state.error,
    lastReading,
    startScan,
    stopScan,
    clearReading,
  };
}
