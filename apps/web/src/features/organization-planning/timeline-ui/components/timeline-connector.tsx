type TimelineConnectorProps = {
  visible: boolean
}

export function TimelineConnector({ visible }: TimelineConnectorProps) {
  if (!visible) return null

  return (
    <span
      aria-hidden="true"
      className="absolute left-5 top-10 h-[calc(100%+1.5rem)] w-px bg-slate-200 sm:left-6"
    />
  )
}
