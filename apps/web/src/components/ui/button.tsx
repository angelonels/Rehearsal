import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const variants = cva("inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#caff3d] disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: {
      default: "bg-[#caff3d] text-[#090a09] hover:bg-[#dcff78]",
      secondary: "border border-[#30342f] bg-[#151715] text-[#f3f4ef] hover:bg-[#1c1f1b]",
      ghost: "text-[#a6aca3] hover:bg-[#171917] hover:text-white",
      destructive: "border border-red-900/70 bg-red-950/30 text-red-300 hover:bg-red-950/60"
    }
  },
  defaultVariants: { variant: "default" }
});
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof variants>;
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, ...props }, ref) => (
  <button ref={ref} className={cn(variants({ variant }), className)} {...props} />
));
Button.displayName = "Button";
