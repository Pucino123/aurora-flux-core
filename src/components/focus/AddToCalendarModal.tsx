import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarPlus, X, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface AddToCalendarModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
}

const TIME_OPTIONS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
  "21:00", "21:30", "22:00",
];

const AddToCalendarModal = ({ open, title, onClose, onConfirm }: AddToCalendarModalProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState("09:00");

  const handleConfirm = () => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    onConfirm(dateStr, selectedTime);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-card/95 backdrop-blur-2xl border border-border/30 rounded-2xl shadow-2xl shadow-black/40 p-5 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarPlus size={18} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Tilføj til planner</h3>
              </div>
              <button onClick={onClose} className="group flex items-center justify-center"
                style={{ width: 13, height: 13, borderRadius: "50%", background: "#ff5f57", border: "0.5px solid rgba(0,0,0,0.12)", boxShadow: "0 0.5px 1px rgba(0,0,0,0.15)" }}>
                <X size={7} strokeWidth={3} className="opacity-0 group-hover:opacity-100 transition-opacity duration-100" style={{ color: "rgba(80,0,0,0.7)" }} />
              </button>
            </div>

            {/* Title preview */}
            <div className="px-3 py-2 rounded-xl bg-secondary/40 border border-border/30 mb-4">
              <p className="text-xs text-muted-foreground mb-0.5">Titel</p>
              <p className="text-sm font-medium text-foreground truncate">{title}</p>
            </div>

            {/* Calendar */}
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              className={cn("p-3 pointer-events-auto rounded-xl border border-border/30 mb-4")}
            />

            {/* Time selector */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Tidspunkt</p>
              </div>
              <div className="grid grid-cols-4 gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                {TIME_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTime(t)}
                    className={cn(
                      "text-[11px] py-1.5 rounded-lg transition-all font-medium",
                      selectedTime === t
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary/50 text-foreground/70 hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Confirm */}
            <button
              onClick={handleConfirm}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Tilføj til {format(selectedDate, "d. MMM")} kl. {selectedTime}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default AddToCalendarModal;
