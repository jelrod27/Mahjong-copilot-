"use client"

import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-sm border-2 border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-retro-cyan/50 active:translate-y-[1px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-retro-accent text-white border-retro-border/20 hover:bg-retro-accent/90 hover:border-retro-border/40 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]",
        retro: "retro-btn-modern",
        outline:
          "border-retro-border/30 bg-transparent text-retro-text hover:bg-retro-accent/10 hover:border-retro-border/60",
        secondary:
          "bg-retro-panel text-retro-text border-retro-border/10 hover:bg-retro-panel/80",
        ghost:
          "text-retro-textDim hover:text-retro-text hover:bg-retro-bgLight/50",
        cyan: "bg-retro-cyan/20 text-retro-cyan border-retro-cyan/30 hover:bg-retro-cyan/30 hover:border-retro-cyan/50",
        gold: "bg-retro-gold/20 text-retro-gold border-retro-gold/30 hover:bg-retro-gold/30 hover:border-retro-gold/50",
      },
      size: {
        default: "h-9 px-4 gap-2",
        xs: "h-7 px-2 text-xs gap-1",
        sm: "h-8 px-3 text-sm gap-1.5",
        lg: "h-11 px-6 text-base gap-2",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentPropsWithoutRef<typeof ButtonPrimitive> &
  VariantProps<typeof buttonVariants>

const Button = React.forwardRef<React.ElementRef<typeof ButtonPrimitive>, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <ButtonPrimitive
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
)
Button.displayName = "Button"

export { Button, buttonVariants }
