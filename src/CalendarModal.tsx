import React, { useState } from 'react';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDateSelect: (date: string) => void;
}

const CalendarModal: React.FC<CalendarModalProps> = ({ isOpen, onClose, onDateSelect }) => {
  const [selectedDate, setSelectedDate] = useState('');

  if (!isOpen) return null;

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleSubmit = () => {
    if (selectedDate) {
      onDateSelect(selectedDate);
      onClose();
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const firstWordleDate = '2021-06-19'; // First ever Wordle puzzle

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Select a Date</h2>
        <div className="mb-6">
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            min={firstWordleDate}
            max={today}
            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedDate}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            Load Wordle
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarModal;