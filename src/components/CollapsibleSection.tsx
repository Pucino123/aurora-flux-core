import { ReactNode, useState } from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}

const CollapsibleSection = ({ title, count, defaultOpen, children }: CollapsibleSectionProps) => {
  const isMobile = useIsMobile();
  const resolvedDefault = defaultOpen ?? !isMobile;
  const [open, setOpen] = useState(resolvedDefault);

  return (
    <CollapsiblePrimitive.Root open={open} onOpenChange={setOpen}>
      <CollapsiblePrimitive.CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 w-full py-2 group text-left">
          <motion.div
            animate={{ rotate: open ? 0 : -90 }}
            transition={{ duration: 0.2 }}
            className="text-muted-foreground"
          >
            <ChevronDown size={14} />
          </motion.div>
          <span className="text-sm font-semibold font-display text-foreground">{title}</span>
          {count !== undefined && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
              {count}
            </span>
          )}
        </button>
      </CollapsiblePrimitive.CollapsibleTrigger>

      <AnimatePresence initial={false}>
        {open && (
          <CollapsiblePrimitive.CollapsibleContent forceMount asChild>
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              {children}
            </motion.div>
          </CollapsiblePrimitive.CollapsibleContent>
        )}
      </AnimatePresence>
    </CollapsiblePrimitive.Root>
  );
};

export default CollapsibleSection;
