import { cn } from "@/lib/utils";

export function SectionHeading({
  title,
  subtitle,
  action,
  className,
  centered,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  centered?: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        centered && "sm:flex-col sm:items-center text-center",
        className
      )}
    >
      <div className={cn(centered && "mx-auto")}>
        <div className="flex items-center gap-2.5">
          <span className="h-7 w-1.5 rounded-full bg-crimson" />
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h2>
        </div>
        {subtitle && (
          <p className="mt-2 text-sm text-muted-foreground sm:text-base max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
