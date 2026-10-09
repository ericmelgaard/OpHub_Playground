import { useEffect, useState } from 'react';
import { MapPin, Check } from 'lucide-react';

interface LocationChangeOverlayProps {
  locationLabel: string;
  locationPath: string[];
  trigger: number;
}

export function LocationChangeOverlay({
  locationLabel,
  locationPath,
  trigger,
}: LocationChangeOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 1600);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm location-overlay-enter">
      <div className="location-overlay-card bg-white dark:bg-gray-900 rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center max-w-md mx-4">
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full bg-brand/20 animate-ping" />
          <div className="relative h-16 w-16 rounded-full bg-brand flex items-center justify-center">
            <MapPin className="h-8 w-8 text-white" />
          </div>
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
          Changing location to
        </p>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center">
          {locationLabel}
        </h2>
        {locationPath.length > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
            {locationPath.join(' › ')}
          </p>
        )}
        <div className="mt-4 flex items-center gap-1.5 text-brand">
          <Check className="h-4 w-4" />
          <span className="text-sm font-medium">Location updated</span>
        </div>
      </div>
    </div>
  );
}
