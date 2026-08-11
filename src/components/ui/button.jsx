import * as React from "react"
import { cn } from "../../lib/utils"

const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
  const variants = {
    default: "btn btn-primary btn-md",
    destructive: "btn btn-destructive btn-md",
    outline: "btn btn-secondary btn-md bg-transparent",
    secondary: "btn btn-secondary btn-md",
    ghost: "btn btn-ghost btn-md",
    link: "text-primary underline-offset-4 hover:underline",
  }
  const sizes = {
    default: "",
    sm: "btn-sm",
    lg: "btn-lg",
    icon: "btn-icon",
  }

  return (
    <button
      className={cn(
        variants[variant],
        sizes[size],
        "touch-target shrink-0 active:scale-95 transition-transform duration-150",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }