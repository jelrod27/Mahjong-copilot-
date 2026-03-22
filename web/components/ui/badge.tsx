import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border border-transparent px-2 py-0.5 text-[9px] font-pixel whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-retro-accent/10 text-retro-accent border-retro-accent/30 hover:bg-retro-accent/20",
        secondary:
          "bg-retro-panel text-retro-textDim border-retro-border/10",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/30",
        outline:
          "border-retro-border/20 text-retro-textDim hover:bg-retro-accent/5 hover:text-retro-text hover:border-retro-border/40",
        cyan: "bg-retro-cyan/10 text-retro-cyan border-retro-cyan/30 hover:bg-retro-cyan/20",
        gold: "bg-retro-gold/10 text-retro-gold border-retro-gold/30 hover:bg-retro-gold/20",
        link: "text-retro-accent underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
