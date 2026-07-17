import type {
  ReactNode,
} from "react"

export type ProductInsightVariant =
  | "tip"
  | "best-practice"
  | "info"
  | "warning"
  | "success"
  | "ai"

type ProductInsightProps = {
  title?: string
  children: ReactNode
  variant?: ProductInsightVariant
  action?: ReactNode
}

const VARIANT_CONFIG: Record<
  ProductInsightVariant,
  {
    icon: string
    defaultTitle: string
    containerClassName: string
    iconClassName: string
  }
> = {
  tip: {
    icon: "💡",
    defaultTitle: "Dica do Evol",
    containerClassName:
      "border-blue-200 bg-blue-50/70",
    iconClassName: "bg-blue-100",
  },
  "best-practice": {
    icon: "✨",
    defaultTitle: "Boa prática",
    containerClassName:
      "border-violet-200 bg-violet-50/70",
    iconClassName: "bg-violet-100",
  },
  info: {
    icon: "ℹ️",
    defaultTitle: "Informação",
    containerClassName:
      "border-slate-200 bg-slate-50/70",
    iconClassName: "bg-slate-100",
  },
  warning: {
    icon: "⚠️",
    defaultTitle: "Atenção",
    containerClassName:
      "border-amber-200 bg-amber-50/70",
    iconClassName: "bg-amber-100",
  },
  success: {
    icon: "✅",
    defaultTitle: "Tudo certo",
    containerClassName:
      "border-emerald-200 bg-emerald-50/70",
    iconClassName: "bg-emerald-100",
  },
  ai: {
    icon: "✨",
    defaultTitle: "Sugestão da IA",
    containerClassName:
      "border-primary/20 bg-primary/5",
    iconClassName: "bg-primary/10",
  },
}

export function ProductInsight({
  title,
  children,
  variant = "tip",
  action,
}: ProductInsightProps) {
  const config = VARIANT_CONFIG[variant]

  return (
    <aside
      className={[
        "rounded-xl border p-5 shadow-sm",
        config.containerClassName,
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg",
            config.iconClassName,
          ].join(" ")}
        >
          {config.icon}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-foreground">
            {title ?? config.defaultTitle}
          </h2>

          <div className="mt-1 text-sm leading-6 text-muted-foreground">
            {children}
          </div>

          {action ? (
            <div className="mt-4">
              {action}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
