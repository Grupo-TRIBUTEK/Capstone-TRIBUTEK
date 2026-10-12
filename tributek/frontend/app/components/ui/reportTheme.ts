/** Colores de exportación definidos exclusivamente en globals.css. */
export function reportTheme() {
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string) => {
    const value = styles.getPropertyValue(name).trim();
    if (!value) throw new Error(`Falta el estilo global ${name}. Recarga la página.`);
    return value;
  };
  return {
    primary: token('--report-primary'), accent: token('--report-accent'),
    paper: token('--report-paper'), ink: token('--report-ink'),
    muted: token('--report-muted'), line: token('--report-line'),
    soft: token('--report-soft'), stripe: token('--report-stripe'),
    error: token('--report-error'), onPrimary: token('--report-on-primary'),
    font: token('--font-body'),
  };
}
