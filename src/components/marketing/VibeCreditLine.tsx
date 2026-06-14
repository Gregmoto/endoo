const UTM = "?utm_source=endoo&utm_medium=footer&utm_campaign=client-credit"

export function VibeCreditLine() {
  return (
    <p className="text-xs text-muted-foreground/60">
      Byggt av{" "}
      <a
        href={`https://vibedev.se${UTM}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground font-medium transition-colors"
      >
        VibeDev
      </a>
    </p>
  )
}
