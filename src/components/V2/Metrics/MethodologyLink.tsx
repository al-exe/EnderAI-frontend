import { Link } from "@tanstack/react-router"

export function MethodologyLink() {
  return (
    <div className="text-sm">
      <Link
        to="/v2/metrics/methodology"
        className="text-primary underline-offset-4 hover:underline"
      >
        Learn how we calculate savings →
      </Link>
    </div>
  )
}
