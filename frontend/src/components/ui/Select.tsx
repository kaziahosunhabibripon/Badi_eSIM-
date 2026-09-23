import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { selectClassName?: string };

// className sizes the outer wrapper (e.g. "w-full", "w-auto") so it composes correctly as a
// flex/grid item; the <select> itself always just fills that wrapper.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, selectClassName, children, ...rest }, ref) => (
  <div className={cn("relative inline-block", className)}>
    <select
      ref={ref}
      className={cn(
        "w-full appearance-none pl-3 pr-9 py-2 border border-slate-300 rounded-md text-sm bg-white",
        "focus:outline-none focus:ring-2 focus:ring-indigo-600/40 focus:border-indigo-600",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        selectClassName
      )}
      {...rest}
    >
      {children}
    </select>
    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
  </div>
));
Select.displayName = "Select";
