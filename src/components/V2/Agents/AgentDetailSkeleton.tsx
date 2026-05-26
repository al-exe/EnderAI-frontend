import { cn } from "@/lib/utils"

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse bg-zinc-200/90 dark:bg-white/10",
        className,
      )}
    />
  )
}

function SectionHeaderSkeleton({
  titleWidth,
  metaWidth,
}: {
  titleWidth: string
  metaWidth?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-black/10 pb-2 dark:border-white/12">
      <Bone className={cn("h-[0.62rem]", titleWidth)} />
      {metaWidth ? <Bone className={cn("h-[0.68rem]", metaWidth)} /> : null}
    </div>
  )
}

type AgentDetailSkeletonProps = {
  shellClassName: string
  hideHeader?: boolean
}

export function AgentDetailSkeleton({
  shellClassName,
  hideHeader = false,
}: AgentDetailSkeletonProps) {
  return (
    <div
      className={cn(shellClassName, "py-6")}
      aria-busy="true"
      aria-label="Loading specialist"
    >
      {!hideHeader && (
        <header className="grid gap-4 border-b border-border pb-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <Bone className="h-[0.65rem] w-44" />
            <div className="mt-1 flex items-center gap-3">
              <Bone className="size-5 shrink-0" />
              <Bone className="h-7 w-56 max-w-full" />
            </div>
            <Bone className="mt-1 h-4 w-72 max-w-full" />
            <Bone className="mt-4 h-4 w-full max-w-xl" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Bone className="h-8 w-28" />
            <Bone className="h-8 w-24" />
          </div>
        </header>
      )}

      <section className="my-4 grid border border-black/10 bg-white sm:grid-cols-2 lg:grid-cols-4 dark:border-white/12 dark:bg-zinc-950">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="space-y-2 border-b border-black/10 p-4 last:border-b-0 sm:odd:border-r lg:border-r lg:border-b-0 lg:last:border-r-0 dark:border-white/12"
          >
            <Bone className="h-[0.62rem] w-24" />
            <Bone
              className={cn("h-8", index === 0 ? "w-28" : "w-20")}
            />
            <Bone className="h-[0.68rem] w-36 max-w-full" />
          </div>
        ))}
      </section>

      <section className="pt-2">
        <SectionHeaderSkeleton titleWidth="w-32" metaWidth="w-52 max-w-[45%]" />
        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Bone className="h-[0.66rem] w-28" />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 6 }, (_, index) => (
                <Bone
                  key={index}
                  className={cn("h-6", index % 2 === 0 ? "w-24" : "w-32")}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Bone className="h-[0.66rem] w-40" />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 3 }, (_, index) => (
                <Bone key={index} className="h-6 w-28" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pt-5">
        <SectionHeaderSkeleton titleWidth="w-44" metaWidth="w-20" />
        <div className="mt-3 border border-black/10 bg-zinc-50 dark:border-white/12 dark:bg-white/5">
          <div className="flex items-center justify-between border-b border-black/10 px-3 py-2 dark:border-white/12">
            <Bone className="h-[0.6rem] w-28" />
            <Bone className="h-[0.6rem] w-10" />
          </div>
          <div className="space-y-2.5 px-3 py-3">
            <Bone className="h-3.5 w-full" />
            <Bone className="h-3.5 w-[94%]" />
            <Bone className="h-3.5 w-[81%]" />
          </div>
          <div className="flex items-center justify-between border-t border-black/10 px-3 py-2 dark:border-white/12">
            <Bone className="h-[0.62rem] w-16" />
            <Bone className="size-4" />
          </div>
        </div>
      </section>

      <section className="pt-5">
        <SectionHeaderSkeleton titleWidth="w-36" metaWidth="w-32" />
        <div className="mt-2 overflow-x-auto border border-black/10 dark:border-white/12">
          <table className="w-full min-w-[42rem] border-collapse">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/12">
                <th className="py-2 pr-3 text-left">
                  <Bone className="h-[0.62rem] w-20" />
                </th>
                <th className="px-3 py-2 text-left">
                  <Bone className="h-[0.62rem] w-14" />
                </th>
                <th className="px-3 py-2 text-right">
                  <Bone className="ml-auto h-[0.62rem] w-16" />
                </th>
                <th className="py-2 pl-3 text-right">
                  <Bone className="ml-auto h-[0.62rem] w-10" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 3 }, (_, row) => (
                <tr
                  key={row}
                  className="border-b border-black/5 last:border-b-0 dark:border-white/10"
                >
                  <td className="py-3 pr-3 align-top">
                    <Bone className="h-4 w-full max-w-md" />
                    <Bone className="mt-2 h-3 w-[80%] max-w-sm" />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Bone className="h-[0.95rem] w-20" />
                  </td>
                  <td className="px-3 py-3 text-right align-top">
                    <Bone className="ml-auto h-3 w-28" />
                  </td>
                  <td className="py-3 pl-3 text-right align-top">
                    <Bone className="ml-auto h-[0.62rem] w-12" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="pt-5">
        <SectionHeaderSkeleton titleWidth="w-40" metaWidth="w-28" />
        <div className="mt-2 overflow-x-auto border border-black/10 dark:border-white/12">
          <table className="w-full min-w-[38rem] border-collapse">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/12">
                <th className="py-2 pr-3 text-left">
                  <Bone className="h-[0.62rem] w-12" />
                </th>
                <th className="px-3 py-2 text-left">
                  <Bone className="h-[0.62rem] w-10" />
                </th>
                <th className="px-3 py-2 text-right">
                  <Bone className="ml-auto h-[0.62rem] w-12" />
                </th>
                <th className="py-2 pl-3 text-right">
                  <Bone className="ml-auto h-[0.62rem] w-10" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }, (_, row) => (
                <tr
                  key={row}
                  className="border-b border-black/5 last:border-b-0 dark:border-white/10"
                >
                  <td className="py-3 pr-3 align-top">
                    <Bone
                      className={cn(
                        "h-[0.95rem]",
                        row % 2 === 0 ? "w-full max-w-lg" : "w-[88%] max-w-md",
                      )}
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Bone className="h-[0.95rem] w-28" />
                  </td>
                  <td className="px-3 py-3 text-right align-top">
                    <Bone className="ml-auto h-[0.95rem] w-14" />
                  </td>
                  <td className="py-3 pl-3 text-right align-top">
                    <Bone className="ml-auto h-[0.62rem] w-16" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
