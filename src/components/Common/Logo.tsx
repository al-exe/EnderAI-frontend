import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
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
          EnderAI
        </span>
        <span
          className={cn(
            "text-[1.7rem] font-semibold tracking-tight hidden group-data-[collapsible=icon]:block",
            className,
          )}
        >
          E
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
        {variant === "full" ? "EnderAI" : "E"}
      </span>
    )

  if (!asLink) {
    return content
  }

  return <Link to="/">{content}</Link>
}
