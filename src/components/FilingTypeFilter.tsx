"use client";

import { FILING_CATEGORIES } from "@/types/sec";

interface FilingTypeFilterProps {
  selected: string[];
  onChange: (types: string[]) => void;
}

export default function FilingTypeFilter({
  selected,
  onChange,
}: FilingTypeFilterProps) {
  // Collect every available form type across all categories
  const allTypes = FILING_CATEGORIES.flatMap((cat) => cat.types);

  const handleToggle = (type: string) => {
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  const handleSelectAll = () => {
    onChange(allTypes);
  };

  const handleClear = () => {
    onChange([]);
  };

  const allSelected = allTypes.length > 0 && allTypes.every((t) => selected.includes(t));
  const anySelected = selected.length > 0;

  return (
    <div className="space-y-4">
      {/* Top action buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSelectAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
            bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={allSelected}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          全选
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
            bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!anySelected}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          清除
        </button>
        {anySelected && (
          <span className="text-xs text-gray-400">
            已选 {selected.length} 项
          </span>
        )}
      </div>

      {/* Category groups */}
      {FILING_CATEGORIES.map((category) => (
        <section key={category.label} className="mb-4">
          {/* Category header */}
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-0.5">
            {category.label}
          </h3>
          {category.description && (
            <p className="text-xs text-gray-400 mb-2">{category.description}</p>
          )}

          {/* Chips */}
          <div className="flex flex-wrap gap-2">
            {category.types.map((type) => {
              const isSelected = selected.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleToggle(type)}
                  className={`
                    inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                    cursor-pointer transition-all duration-150
                    ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                    }
                  `}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
