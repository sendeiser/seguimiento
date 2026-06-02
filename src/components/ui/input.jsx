import * as React from "react"
import { cn } from "../../lib/utils"

const Input = React.forwardRef(({ className, type, icon: Icon, error, label, ...props }, ref) => {
  return (
    <div>
      {label && <label className="input-label">{label}</label>}
      <div className="input-wrapper">
        {Icon && <Icon className="input-icon" />}
        <input
          type={type}
          className={cn(
            "input",
            Icon && "input-with-icon",
            error && "input-error",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
      {error && <p className="input-error-message">{error}</p>}
    </div>
  )
})
Input.displayName = "Input"

export { Input }