import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown } from "lucide-react";

interface DateTimePickerProps {
  value: string; // ISO datetime string (YYYY-MM-DDTHH:mm format)
  onChange: (value: string) => void;
  min?: string; // ISO datetime string
  className?: string;
}

export function DateTimePicker({ value, onChange, min, className }: DateTimePickerProps) {
  const [date, setDate] = useState<Date>(value ? new Date(value) : new Date());
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [amPm, setAmPm] = useState<"AM" | "PM">("PM");

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setDate(d);
      let h = d.getHours();
      const m = d.getMinutes();
      setMinute(m);
      if (h >= 12) {
        setAmPm("PM");
        if (h > 12) h -= 12;
      } else {
        setAmPm("AM");
        if (h === 0) h = 12;
      }
      setHour(h);
    }
  }, [value]);

  const updateDateTime = (newDate: Date, newHour: number, newMinute: number, newAmPm: "AM" | "PM") => {
    let hours24 = newHour;
    if (newAmPm === "PM" && newHour !== 12) {
      hours24 = newHour + 12;
    } else if (newAmPm === "AM" && newHour === 12) {
      hours24 = 0;
    }
    
    const finalDate = new Date(newDate);
    finalDate.setHours(hours24, newMinute, 0, 0);
    
    // Format as YYYY-MM-DDTHH:mm for datetime-local input format
    const year = finalDate.getFullYear();
    const month = String(finalDate.getMonth() + 1).padStart(2, '0');
    const day = String(finalDate.getDate()).padStart(2, '0');
    const hours = String(hours24).padStart(2, '0');
    const minutes = String(newMinute).padStart(2, '0');
    const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    onChange(formatted);
  };

  const handleDateChange = (newDate: Date) => {
    setDate(newDate);
    updateDateTime(newDate, hour, minute, amPm);
  };

  const handleHourChange = (newHour: number) => {
    setHour(newHour);
    updateDateTime(date, newHour, minute, amPm);
  };

  const handleMinuteChange = (newMinute: number) => {
    setMinute(newMinute);
    updateDateTime(date, hour, newMinute, amPm);
  };

  const handleAmPmChange = (newAmPm: "AM" | "PM") => {
    setAmPm(newAmPm);
    updateDateTime(date, hour, minute, newAmPm);
  };

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const years = Array.from({ length: 10 }, (_, i) => date.getFullYear() - 5 + i);
  const hours12 = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes60 = Array.from({ length: 60 }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const ScrollablePicker = ({ 
    items, 
    selected, 
    onSelect, 
    format = (v: any) => String(v)
  }: { 
    items: any[]; 
    selected: any; 
    onSelect: (value: any) => void;
    format?: (value: any) => string;
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedIndex = items.indexOf(selected);

    useEffect(() => {
      if (containerRef.current && selectedIndex >= 0) {
        const itemHeight = 40;
        const scrollPosition = selectedIndex * itemHeight - (containerRef.current.clientHeight / 2) + (itemHeight / 2);
        containerRef.current.scrollTo({ top: scrollPosition, behavior: 'smooth' });
      }
    }, [selectedIndex]);

    return (
      <div 
        ref={containerRef}
        className="h-32 overflow-y-auto scrollbar-hide snap-y snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex flex-col items-center py-12">
          {items.map((item, idx) => {
            const isSelected = item === selected;
            return (
              <div
                key={idx}
                className={cn(
                  "h-10 w-full flex items-center justify-center cursor-pointer snap-center transition-all",
                  isSelected 
                    ? "text-foreground font-semibold text-lg scale-110" 
                    : "text-muted-foreground opacity-50 text-base scale-95"
                )}
                onClick={() => onSelect(item)}
              >
                {format(item)}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("space-y-6 bg-background text-foreground", className)}>
      {/* Date Picker */}
      <div>
        <div className="flex gap-4 justify-center">
          {/* Month */}
          <div className="flex flex-col items-center w-20">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-full mb-1"
              onClick={() => {
                const newDate = new Date(date);
                newDate.setMonth(date.getMonth() - 1);
                handleDateChange(newDate);
              }}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <ScrollablePicker
              items={months}
              selected={months[date.getMonth()]}
              onSelect={(month) => {
                const newDate = new Date(date);
                newDate.setMonth(months.indexOf(month));
                handleDateChange(newDate);
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-full mt-1"
              onClick={() => {
                const newDate = new Date(date);
                newDate.setMonth(date.getMonth() + 1);
                handleDateChange(newDate);
              }}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Day */}
          <div className="flex flex-col items-center w-16">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-full mb-1"
              onClick={() => {
                const newDate = new Date(date);
                newDate.setDate(date.getDate() - 1);
                handleDateChange(newDate);
              }}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <ScrollablePicker
              items={days}
              selected={date.getDate()}
              onSelect={(day) => {
                const newDate = new Date(date);
                newDate.setDate(day);
                handleDateChange(newDate);
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-full mt-1"
              onClick={() => {
                const newDate = new Date(date);
                newDate.setDate(date.getDate() + 1);
                handleDateChange(newDate);
              }}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Year */}
          <div className="flex flex-col items-center w-20">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-full mb-1"
              onClick={() => {
                const newDate = new Date(date);
                newDate.setFullYear(date.getFullYear() - 1);
                handleDateChange(newDate);
              }}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <ScrollablePicker
              items={years}
              selected={date.getFullYear()}
              onSelect={(year) => {
                const newDate = new Date(date);
                newDate.setFullYear(year);
                handleDateChange(newDate);
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-full mt-1"
              onClick={() => {
                const newDate = new Date(date);
                newDate.setFullYear(date.getFullYear() + 1);
                handleDateChange(newDate);
              }}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Time Picker */}
      <div className="flex gap-4 justify-center items-center">
        {/* Hour */}
        <div className="flex flex-col items-center w-16">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-full mb-1"
            onClick={() => {
              const newHour = hour === 1 ? 12 : hour - 1;
              handleHourChange(newHour);
            }}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <ScrollablePicker
            items={hours12}
            selected={hour}
            onSelect={handleHourChange}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-full mt-1"
            onClick={() => {
              const newHour = hour === 12 ? 1 : hour + 1;
              handleHourChange(newHour);
            }}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-2xl font-bold text-foreground">:</span>

        {/* Minute */}
        <div className="flex flex-col items-center w-16">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-full mb-1"
            onClick={() => {
              const newMinute = minute === 0 ? 59 : minute - 1;
              handleMinuteChange(newMinute);
            }}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <ScrollablePicker
            items={minutes60}
            selected={minute}
            onSelect={handleMinuteChange}
            format={(m) => String(m).padStart(2, '0')}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-full mt-1"
            onClick={() => {
              const newMinute = minute === 59 ? 0 : minute + 1;
              handleMinuteChange(newMinute);
            }}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        {/* AM/PM */}
        <div className="flex flex-col items-center w-16">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-full mb-1"
            onClick={() => handleAmPmChange(amPm === "AM" ? "PM" : "AM")}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <ScrollablePicker
            items={["AM", "PM"]}
            selected={amPm}
            onSelect={(ap) => handleAmPmChange(ap as "AM" | "PM")}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-full mt-1"
            onClick={() => handleAmPmChange(amPm === "AM" ? "PM" : "AM")}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
