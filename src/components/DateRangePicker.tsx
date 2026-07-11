"use client";

import { useState } from "react";

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

interface Preset {
  label: string;
  months?: number;
  years?: number;
  all?: boolean;
}

const presets: Preset[] = [
  { label: "1个月", months: -1 },
  { label: "3个月", months: -3 },
  { label: "6个月", months: -6 },
  { label: "1年", years: -1 },
  { label: "5年", years: -5 },
  { label: "全部", all: true },
];

export default function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const today = new Date();
  const todayStr = formatDate(today);
  const error = from && to && from > to ? "开始日期不能晚于结束日期" : null;

  function handlePreset(preset: Preset) {
    setActivePreset(preset.label);
    if (preset.all) {
      onChange({ from: "", to: "" });
      return;
    }
    const fromDate = preset.months
      ? addMonths(today, preset.months)
      : addYears(today, preset.years!);
    onChange({ from: formatDate(fromDate), to: todayStr });
  }

  function handleFromChange(value: string) {
    setActivePreset(null);
    onChange({ from: value, to });
  }

  function handleToChange(value: string) {
    setActivePreset(null);
    onChange({ from, to: value });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="date-from" className="block text-sm font-medium text-gray-700">
            从
          </label>
          <input
            type="date"
            id="date-from"
            value={from}
            max={todayStr}
            onChange={(e) => handleFromChange(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="date-to" className="block text-sm font-medium text-gray-700">
            到
          </label>
          <input
            type="date"
            id="date-to"
            value={to}
            max={todayStr}
            onChange={(e) => handleToChange(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handlePreset(preset)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              activePreset === preset.label
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
