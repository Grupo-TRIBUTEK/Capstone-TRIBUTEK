"use client"
import { useDialogs } from "./DialogProvider"

/** Presenta la explicación del indicador en un diálogo accesible, también mediante teclado y pantalla táctil. */
export default function HelpTip({ label, text }: { label: string
      text: string }) {
  const dialogs = useDialogs()
  return <button type="button" className="tk-help-trigger"
    aria-label={"Ayuda sobre " + label}
    onClick={() => void dialogs.alert(text, { title: label })}>?</button>
}
