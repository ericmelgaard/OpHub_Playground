import { useState, useRef, useCallback } from 'react';

interface NfcReading {
  text: string;
  timestamp: number;
}

export function useNfc() {
  const [scanning, setScanning] = useState(false);
  const [lastReading, setLastReading] = useState<NfcReading | null>(null);
  const readerRef = useRef<any>(null);

  const startScan = useCallback(async () => {
    setScanning(true);
    setLastReading(null);

    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      try {
        const reader = new (window as any).NDEFReader();
        readerRef.current = reader;
        await reader.scan();

        reader.addEventListener('reading', (event: any) => {
          let text = '';
          if (event.message?.records) {
            for (const record of event.message.records) {
              if (record.recordType === 'text') {
                const decoder = new TextDecoder(record.encoding || 'utf-8');
                text += decoder.decode(record.data);
              } else if (record.recordType === 'url') {
                text += new TextDecoder().decode(record.data);
              }
            }
          }
          if (text) {
            setLastReading({ text, timestamp: Date.now() });
          }
        });
      } catch {
        // Real NFC unavailable — stay in scanning mode for demo
      }
    }
  }, []);

  const stopScan = useCallback(() => {
    readerRef.current = null;
    setScanning(false);
  }, []);

  const clearReading = useCallback(() => {
    setLastReading(null);
  }, []);

  const simulateReading = useCallback((text: string) => {
    setLastReading({ text, timestamp: Date.now() });
  }, []);

  return {
    scanning,
    lastReading,
    startScan,
    stopScan,
    clearReading,
    simulateReading,
  };
}
