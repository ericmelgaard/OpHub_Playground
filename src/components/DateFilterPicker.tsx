import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface DateFilterPickerProps {
  selectedDate?: string;
  selectedRange?: { start: string; end: string };
  onDateSelect: (date: string) => void;
  onRangeSelect: (start: string, end: string) => void;
  mode: 'single' | 'range';
  onModeChange: (mode: 'single' | 'range') => void;
}

export const DateFilterPicker: React.FC<DateFilterPickerProps> = ({
  selectedDate,
  selectedRange,
  onDateSelect,
  onRangeSelect,
  mode,
  onModeChange,
}) => {
  const [rangeStart, setRangeStart] = useState(selectedRange?.start || '');
  const [rangeEnd, setRangeEnd] = useState(selectedRange?.end || '');

  const getCurrentWeekDays = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + (currentDay === 0 ? -6 : 1));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      days.push({
        label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        date: date.toISOString().split('T')[0],
      });
    }
    return days;
  };

  const weekDays = getCurrentWeekDays();
  const today = new Date().toISOString().split('T')[0];

  const handleRangeApply = () => {
    if (rangeStart && rangeEnd) {
      onRangeSelect(rangeStart, rangeEnd);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={mode === 'single' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onModeChange('single')}
        >
          Single Date
        </Button>
        <Button
          variant={mode === 'range' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onModeChange('range')}
        >
          Date Range
        </Button>
      </div>

      {mode === 'single' && (
        <>
          <div>
            <label className="text-sm font-medium mb-2 block">Quick Select - Current Week</label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedDate === today ? 'default' : 'outline'}
                size="sm"
                onClick={() => onDateSelect(today)}
              >
                Today
              </Button>
              {weekDays.map((day) => (
                <Button
                  key={day.date}
                  variant={selectedDate === day.date ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onDateSelect(day.date)}
                >
                  {day.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Or Select a Date</label>
            <Input
              type="date"
              value={selectedDate || ''}
              onChange={(e) => onDateSelect(e.target.value)}
            />
          </div>
        </>
      )}

      {mode === 'range' && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Start Date</label>
            <Input
              type="date"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">End Date</label>
            <Input
              type="date"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
            />
          </div>
          <Button
            onClick={handleRangeApply}
            disabled={!rangeStart || !rangeEnd}
            className="w-full"
          >
            Apply Range
          </Button>
        </div>
      )}
    </div>
  );
};
