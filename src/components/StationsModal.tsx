import { X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { levelIconColor } from '@/lib/levelColors';

interface StationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stations: string[];
  itemName: string;
}

export function StationsModal({ isOpen, onClose, stations, itemName }: StationsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            <MapPin className={`h-5 w-5 ${levelIconColor('placement')}`} />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Stations
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {itemName}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-wrap gap-2">
            {stations.map((station, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-sm py-1.5 px-3"
              >
                {station}
              </Badge>
            ))}
          </div>
        </div>

        <div className="p-4 border-t dark:border-gray-700 flex justify-end">
          <Button onClick={onClose} variant="default">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
