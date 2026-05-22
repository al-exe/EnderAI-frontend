import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
  to?: "/" | "/home"
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
  to = "/",
}: LogoProps) {
  const content =
    variant === "responsive" ? (
      <>
        <span
          className={cn(
            "text-[1.7rem] font-semibold tracking-tight group-data-[collapsible=icon]:hidden",
            className,
          )}
        >
          Taskforce
        </span>
        <span
          className={cn(
            "text-[1.7rem] font-semibold tracking-tight hidden group-data-[collapsible=icon]:block",
            className,
          )}
        >
          T
        </span>
      </>
    ) : (
      <span
        className={cn(
          "font-semibold tracking-tight",
          variant === "full" ? "text-[1.7rem]" : "text-[1.5rem]",
          className,
        )}
      >
        {variant === "full" ? "Taskforce" : "T"}
      </span>
    )

  if (!asLink) {
    return content
  }

  return <Link to={to}>{content}</Link>
}
