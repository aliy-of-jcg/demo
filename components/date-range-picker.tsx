"use client";

import { Calendar } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

interface DateRangePickerProps {
    startDate: string | null;
    endDate: string | null;
    onStartDateChange: (date: string | null) => void;
    onEndDateChange: (date: string | null) => void;
    maxRangeDays?: number;
    onRangeClamped?: () => void;
    className?: string;
}

export function DateRangePicker({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    maxRangeDays,
    onRangeClamped,
    className = "",
}: DateRangePickerProps) {
    const startDateObj = startDate ? (() => {
        const date = new Date(startDate + 'T00:00:00');
        return isNaN(date.getTime()) ? null : date;
    })() : null;
    const endDateObj = endDate ? (() => {
        const date = new Date(endDate + 'T00:00:00');
        return isNaN(date.getTime()) ? null : date;
    })() : null;

    const handleStartDateChange = (date: Date | null) => {
        if (!date) {
            onStartDateChange(null);
            return;
        }

        const dateStr = format(date, 'yyyy-MM-dd');

        // If end date exists, check range
        if (endDate && maxRangeDays) {
            const end = new Date(endDate);
            const diffMs = end.getTime() - date.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays > maxRangeDays) {
                const clampedStart = new Date(end);
                clampedStart.setDate(clampedStart.getDate() - maxRangeDays);
                onStartDateChange(format(clampedStart, 'yyyy-MM-dd'));
                if (onRangeClamped) onRangeClamped();
                return;
            }
        }

        onStartDateChange(dateStr);
    };

    const handleEndDateChange = (date: Date | null) => {
        if (!date) {
            onEndDateChange(null);
            return;
        }

        const dateStr = format(date, 'yyyy-MM-dd');

        // If start date exists, check range
        if (startDate && maxRangeDays) {
            const start = new Date(startDate);
            const diffMs = date.getTime() - start.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays > maxRangeDays) {
                const clampedEnd = new Date(start);
                clampedEnd.setDate(clampedEnd.getDate() + maxRangeDays);
                onEndDateChange(format(clampedEnd, 'yyyy-MM-dd'));
                if (onRangeClamped) onRangeClamped();
                return;
            }
        }

        onEndDateChange(dateStr);
    };

    return (
        <div className={`flex items-center gap-2 flex-wrap ${className}`}>
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
            <DatePicker
                selected={startDateObj}
                onChange={handleStartDateChange}
                dateFormat="yyyy/MM/dd"
                placeholderText="Start date"
                className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm flex-1 min-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                maxDate={endDateObj || undefined}
                showPopperArrow={false}
            />
            <span className="text-gray-500">~</span>
            <DatePicker
                selected={endDateObj}
                onChange={handleEndDateChange}
                dateFormat="yyyy/MM/dd"
                placeholderText="End date"
                className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm flex-1 min-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                minDate={startDateObj || undefined}
                showPopperArrow={false}
            />
        </div>
    );
}

