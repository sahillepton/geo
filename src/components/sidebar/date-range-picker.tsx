"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  from?: Date;
  to?: Date;
  onSelect?: (range: { from?: Date; to?: Date }) => void;
  disabled?: boolean;
}

export function DateRangePicker({
  from,
  to,
  onSelect,
  disabled,
}: DateRangePickerProps) {
  const [fromOpen, setFromOpen] = React.useState(false);
  const [toOpen, setToOpen] = React.useState(false);
  const [fromDate, setFromDate] = React.useState<Date | undefined>(from);
  const [toDate, setToDate] = React.useState<Date | undefined>(to);

  React.useEffect(() => {
    setFromDate(from);
    setToDate(to);
  }, [from, to]);

  const handleFromDateSelect = (date: Date | undefined) => {
    setFromDate(date);
    setFromOpen(false);
    onSelect?.({ from: date, to: toDate });
  };

  const handleToDateSelect = (date: Date | undefined) => {
    setToDate(date);
    setToOpen(false);
    onSelect?.({ from: fromDate, to: date });
  };

  return (
    <div className="flex gap-2">
      <Popover open={fromOpen} onOpenChange={setFromOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-28 justify-between font-normal text-xs h-8"
            disabled={disabled}
          >
            {fromDate ? fromDate.toLocaleDateString() : "From Date"}
            <ChevronDownIcon className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={fromDate}
            captionLayout="dropdown"
            onSelect={handleFromDateSelect}
            disabled={(date) => (toDate ? date > toDate : false)}
          />
        </PopoverContent>
      </Popover>

      <Popover open={toOpen} onOpenChange={setToOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-28 justify-between font-normal text-xs h-8"
            disabled={disabled}
          >
            {toDate ? toDate.toLocaleDateString() : "To Date"}
            <ChevronDownIcon className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={toDate}
            captionLayout="dropdown"
            onSelect={handleToDateSelect}
            disabled={(date) => (fromDate ? date < fromDate : false)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
