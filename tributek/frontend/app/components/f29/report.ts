import { associated, calculate, money, periodLabel, type Client, type Projection } from './model';
export function reportCanvas(client: Client, p: Projection): HTMLCanvasElement {
    const r = calculate(p), m = p.manual;
    // Mostrar las notas de crédito separadas evita ocultarlas en un saldo neto positivo.
    const reportRows = (rows: NonNullable<Projection['sales']>['rows']) => [
        ...associated(rows.filter(row => row.code !== 61)),
        ...associated(rows.filter(row => row.code === 61)).map(row => ({...row, name: `Nota de crédito · ${row.name}`})),
    ];
    const sales = reportRows(p.sales?.rows ?? []), purchases = reportRows(p.purchases?.rows ?? []);
    if (m.voucherNet)
        sales.push({ name: 'Comprobante electrónico / consumidor final', rut: '', docs: 0, exempt: 0, net: m.voucherNet, iva: r.voucherIva, total: m.voucherNet + r.voucherIva });
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 1400 + (Math.max(1, sales.length) + Math.max(1, purchases.length)) * 54;
    if (canvas.height > 30000)
        throw new Error('El detalle es demasiado extenso para una sola imagen. Reduce el alcance del informe antes de exportar.');
    const ctx = canvas.getContext('2d');
    if (!ctx)
        throw new Error('No se pudo crear la imagen.');
    const blue = '#32508C', rose = '#F2D9D0', gray = '#F2F2F2', ink = '#243047';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    function rect(x: number, y: number, w: number, h: number, color: string) { ctx!.fillStyle = color; ctx!.fillRect(x, y, w, h); }
    function text(value: string, x: number, y: number, size = 18, bold = false, color = ink, align: CanvasTextAlign = 'left') {
        ctx!.font = `${bold ? '700' : '400'} ${size}px Arial`;
        ctx!.fillStyle = value.startsWith('$ -') ? '#b91c1c' : color;
        ctx!.textAlign = align;
        ctx!.fillText(value, x, y);
    }
    function wrap(value: string, x: number, y: number, width: number, size = 18) {
        ctx!.font = `${size}px Arial`;
        let line = '';
        for (const word of value.split(/\s+/)) {
            if (ctx!.measureText(line + word).width > width && line) {
                text(line, x, y, size);
                y += size + 8;
                line = '';
            }
            line += word + ' ';
        }
        text(line, x, y, size);
        return y;
    }
    rect(60, 40, 1280, 130, blue);
    text('TRIBUTEK | INFORME PROYECCIÓN MENSUAL F29', 700, 100, 31, true, '#fff', 'center');
    text(`Período: ${periodLabel(p.period).toUpperCase()}`, 700, 140, 20, true, '#fff', 'center');
    wrap(client.name, 70, 220, 1220, 22);
    text(`RUT: ${client.rut}`, 70, 274, 18, false, '#666');
    rect(60, 300, 1280, 105, gray);
    text('RESUMEN PARA EL CLIENTE', 80, 332, 19, true, blue);
    wrap('Estimado cliente: adjuntamos el resumen mensual preparado con los registros disponibles de compras, ventas y obligaciones asociadas al Formulario 29 del período informado.', 80, 362, 1220);
    rect(60, 425, 480, 130, rose);
    text(r.remainder ? 'REMANENTE ESTIMADO' : 'TOTAL ESTIMADO A PAGAR', 300, 464, 19, true, blue, 'center');
    text(money(r.remainder || r.total), 300, 510, 36, true, blue, 'center');
    rect(560, 425, 780, 130, gray);
    text('RECOMENDACIÓN TRIBUTEK', 580, 458, 19, true, blue);
    wrap(r.remainder ? `El crédito fiscal supera al débito de ventas. Remanente: ${money(r.remainder)}. Otras obligaciones estimadas a pagar: ${money(r.other)}.` : r.ivaPayable ? `Compras brutas de referencia: ${money(r.suggestedGross)}. Solo compras del giro con derecho a crédito fiscal, previa revisión de la contadora.` : 'No se genera IVA a pagar por este concepto. El total considera las otras obligaciones informadas.', 580, 490, 730);
    text('CÓMO SE COMPONE EL RESULTADO', 60, 595, 23, true, blue);
    rect(60, 615, 620, 36, '#E8EEF6');
    rect(700, 615, 640, 36, '#E8EEF6');
    text('IVA DEL PERÍODO', 75, 640, 18, true, blue);
    text('OTRAS OBLIGACIONES', 715, 640, 18, true, blue);
    const left: [
        string,
        number
    ][] = [['IVA débito por ventas', r.debit], ['IVA crédito por compras', r.purchases.iva], ['IVA de importación', m.importation], ['Remanente mes anterior', m.previousCredit], [r.remainder ? 'Remanente estimado' : 'IVA estimado a pagar', r.remainder || r.ivaPayable]];
    const right: [
        string,
        number
    ][] = [['IVA retenido por pagar', m.retained], ['Impuesto único', m.singleTax], ['3% préstamo solidario · remuneraciones', m.loanSalary], ['3% préstamo solidario · honorarios', m.loanFees], ['Retención de honorarios', m.withholding], ['P.P.M.', r.ppm], ['Cotizaciones', m.contributions], ['Honorarios', m.fees], ['TOTAL OTRAS OBLIGACIONES', r.other]];
    left.forEach(([label, n], i) => { if (i === 4)
        rect(60, 655 + i * 32, 620, 32, rose); text(label, 75, 678 + i * 32, 17, i === 4); text(money(n), 660, 678 + i * 32, 17, i === 4, blue, 'right'); });
    right.forEach(([label, n], i) => { if (i === 8)
        rect(700, 655 + i * 32, 640, 32, '#E8EEF6'); text(label, 715, 678 + i * 32, 17, i === 8); text(money(n), 1320, 678 + i * 32, 17, i === 8, blue, 'right'); });
    let y = 992;
    function table(title: string, list: typeof sales) {
        text(title, 60, y, 23, true, blue);
        y += 20;
        rect(60, y, 1280, 34, '#E8EEF6');
        text('Cliente / proveedor', 70, y + 24, 17, true, blue);
        ['Docs.', 'Neto', 'IVA', 'Total'].forEach((h, i) => text(h, [820, 990, 1150, 1330][i], y + 24, 17, true, blue, 'right'));
        y += 36;
        if (!list.length) {
            text('Sin documentos registrados.', 75, y + 26);
            y += 54;
        }
        for (const item of list) {
            wrap(item.name, 75, y + 21, 690, 16);
            [String(item.docs), money(item.net), money(item.iva), money(item.total)].forEach((v, i) => text(v, [820, 990, 1150, 1330][i], y + 25, 17, false, ink, 'right'));
            y += 54;
        }
        rect(60, y, 1280, 34, rose);
        text('TOTAL', 75, y + 24, 17, true, blue);
        const sums = list.reduce((a, v) => [a[0] + v.docs, a[1] + v.net, a[2] + v.iva, a[3] + v.total], [0, 0, 0, 0]);
        sums.forEach((v, i) => text(i ? money(v) : String(v), [820, 990, 1150, 1330][i], y + 24, 17, true, blue, 'right'));
        y += 74;
    }
    table('VENTAS ASOCIADAS', sales);
    table('COMPRAS ASOCIADAS', purchases);
    // Resize to measured content without losing the drawing.
    const output = document.createElement('canvas');
    output.width = 1400;
    output.height = y + 115;
    const out = output.getContext('2d')!;
    out.fillStyle = '#fff';
    out.fillRect(0, 0, 1400, output.height);
    out.drawImage(canvas, 0, 0);
    out.font = '16px Arial';
    out.fillStyle = ink;
    out.fillText('Estimación informativa. Los montos pueden variar hasta el cierre del mes.', 60, y + 14);
    out.fillStyle = blue;
    out.fillRect(60, y + 40, 1280, 48);
    out.fillStyle = '#fff';
    out.font = '15px Arial';
    out.fillText('TRIBUTEK', 80, y + 70);
    out.fillText('INFORMACIÓN CONFIDENCIAL · USO EXCLUSIVO DEL CLIENTE', 450, y + 70);
    return output;
}
export function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export async function exportImage(client: Client, p: Projection, copy: boolean) {
    const canvas = reportCanvas(client, p);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('No se pudo generar el PNG.')), 'image/png'));
    if (copy && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            return 'Imagen copiada sin botones. Ya puedes pegarla en WhatsApp.';
        }
        catch { /* Fallback explicitly reported to the user. */ }
    }
    download(blob, `TRIBUTEK-F29-${client.rut}-${p.period}.png`);
    return copy ? 'El navegador no permitió copiar la imagen. Se descargó el PNG.' : 'Informe PNG descargado.';
}
