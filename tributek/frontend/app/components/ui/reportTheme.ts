/**
 * Lee los estilos del documento para dibujar reportes con los colores y fuentes del sistema.
 */
/** Colores de exportación definidos exclusivamente en globals.css. */
export function reportTheme() {
  const styles = getComputedStyle(document.documentElement);
  /** Lee una variable CSS y exige que exista antes de dibujar el reporte. */
  const token = (name: string) => {
    const value = styles.getPropertyValue(name).trim();
    if (!value) throw new Error(`Falta el estilo global ${name}. Recarga la página.`);
    return value;
  };
  return {
    primary: token("--report-primary"),
    accent: token("--report-accent"),
    paper: token("--report-paper"),
    ink: token("--report-ink"),
    muted: token("--report-muted"),
    line: token("--report-line"),
    soft: token("--report-soft"),
    stripe: token("--report-stripe"),
    error: token("--report-error"),
    onPrimary: token("--report-on-primary"),
    font: token("--font-body"),
  };
}
