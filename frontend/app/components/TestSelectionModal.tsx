"use client";

import React, { useState, useEffect } from 'react';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

export interface SelectedTestItem {
  test_id: string;
  test_name: string;
  package_name?: string;
  sortOrder: number;
  isSelected: boolean;
}

interface TestSelectionModalProps {
  isOpen: boolean;
  tests: any[]; // Array of test objects with test_id and test_name
  onConfirm: (selectedTests: SelectedTestItem[]) => void;
  onCancel: () => void;
  loading?: boolean;
}

const TestSelectionModal: React.FC<TestSelectionModalProps> = ({
  isOpen,
  tests,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const [testItems, setTestItems] = useState<SelectedTestItem[]>([]);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  // Initialize test items with default values
  useEffect(() => {
    if (isOpen && tests.length > 0) {
      const items = tests.map((test, index) => ({
        test_id: test.test_id,
        test_name: test.test_name,
        package_name: test.package_name,
        sortOrder: index + 1,
        isSelected: true, // All tests selected by default
      }));
      setTestItems(items);
    }
  }, [isOpen, tests]);

  // Toggle test selection
  const handleToggleTest = (index: number) => {
    const updated = [...testItems];
    updated[index].isSelected = !updated[index].isSelected;
    // Reorder list with checked items first
    const sorted = sortTestItems(updated);
    setTestItems(sorted);
  };

  // Sort tests: checked items first, unchecked items last
  const sortTestItems = (items: SelectedTestItem[]) => {
    const checked = items.filter((item) => item.isSelected);
    const unchecked = items.filter((item) => !item.isSelected);
    
    // Update sort orders only for checked items
    checked.forEach((item, i) => {
      item.sortOrder = i + 1;
    });
    
    // Unchecked items don't get sort numbers
    unchecked.forEach((item) => {
      item.sortOrder = 0; // or any placeholder value, won't be displayed
    });
    
    const sorted = [...checked, ...unchecked];
    return sorted;
  };

  // Move test up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...testItems];
    [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]];
    // Update sort orders
    updated[index - 1].sortOrder = index;
    updated[index].sortOrder = index + 1;
    setTestItems(updated);
  };

  // Move test down
  const handleMoveDown = (index: number) => {
    if (index === testItems.length - 1) return;
    const updated = [...testItems];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    // Update sort orders
    updated[index].sortOrder = index + 1;
    updated[index + 1].sortOrder = index + 2;
    setTestItems(updated);
  };

  // Handle drag start
  const handleDragStart = (index: number) => {
    setDraggedItem(index);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;

    const updated = [...testItems];
    const draggedTest = updated[draggedItem];
    updated.splice(draggedItem, 1);
    updated.splice(index, 0, draggedTest);

    // Update sort orders
    updated.forEach((item, i) => {
      item.sortOrder = i + 1;
    });

    setTestItems(updated);
    setDraggedItem(index);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Handle confirm
  const handleConfirm = () => {
    const selected = testItems.filter((item) => item.isSelected);
    if (selected.length === 0) {
      alert('Please select at least one test');
      return;
    }
    onConfirm(selected);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white px-6 py-4">
          <h2 className="text-xl font-bold">Select & Arrange Tests</h2>
          <p className="text-sm text-cyan-100 mt-1">Choose which tests to include and set their print order (priority)</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {testItems.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No tests available
              </div>
            ) : (
              testItems.map((item, index) => (
                <div
                  key={item.test_id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border-2 transition-all cursor-move ${
                    draggedItem === index
                      ? 'bg-cyan-50 border-cyan-400 opacity-70'
                      : item.isSelected
                      ? 'bg-green-50 border-green-300 hover:border-green-400'
                      : 'bg-gray-50 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {/* Drag Handle */}
                  <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />

                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={item.isSelected}
                    onChange={() => handleToggleTest(index)}
                    className="w-4 h-4 accent-cyan-600 cursor-pointer flex-shrink-0"
                  />

                  {/* Test Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">
                      {item.test_name}
                    </p>
                    {item.package_name && (
                      <p className="text-xs text-gray-500 truncate">Package: {item.package_name}</p>
                    )}
                  </div>

                  {/* Sort Order Badge - Only show for selected items */}
                  {item.isSelected && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-cyan-600 text-white text-xs font-bold rounded-full">
                        {item.sortOrder}
                      </span>
                    </div>
                  )}

                  {/* Move Buttons */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || !item.isSelected}
                      className="p-0.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move up"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === testItems.length - 1 || !item.isSelected}
                      className="p-0.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move down"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Info Box */}
          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>💡 Tip:</strong> Drag tests to reorder them, or use the up/down buttons. The number badge shows the print order (1 = first, 2 = second, etc.). Unchecked tests will not be printed.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t px-6 py-4 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || testItems.filter((t) => t.isSelected).length === 0}
            className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : `Print ${testItems.filter((t) => t.isSelected).length} Test(s)`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestSelectionModal;
