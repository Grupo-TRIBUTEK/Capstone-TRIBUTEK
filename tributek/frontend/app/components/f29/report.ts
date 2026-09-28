import { associated, calculate, money, periodLabel, type Client, type Projection } from './model';

export function reportCanvas(client: Client, p: Projection): HTMLCanvasElement {
    const r = calculate(p), m = p.manual;
    const reportRows = (rows: NonNullable<Projection['sales']>['rows']) => [
        ...associated(rows.filter(row => row.code !== 61)),
        ...associated(rows.filter(row => row.code === 61)).map(row => ({ ...row, name: `Nota de crédito · ${row.name}` })),
    ];
    const sales = reportRows(p.sales?.rows ?? []), purchases = reportRows(p.purchases?.rows ?? []);
    if (m.voucherNet) sales.push({ name: 'Comprobantes electrónicos', rut: '', docs: 0, exempt: 0, net: m.voucherNet, iva: r.voucherIva, total: m.voucherNet + r.voucherIva });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo crear la imagen.');
    const navy = '#223559', rose = '#B98B7B', pale = '#F5EBE7', ink = '#26334A', muted = '#667184', line = '#E4E7EC', red = '#B42332';
    const commands: (() => void)[] = [];
    function box(x: number, y: number, w: number, h: number, fill: string, radius = 0) {
        commands.push(() => { ctx!.fillStyle = fill; ctx!.beginPath(); ctx!.roundRect(x, y, w, h, radius); ctx!.fill(); });
    }
    function text(value: string, x: number, y: number, size = 20, bold = false, color = ink, align: CanvasTextAlign = 'left') {
        commands.push(() => { ctx!.font = `${bold ? 700 : 400} ${size}px Arial`; ctx!.fillStyle = value.startsWith('$ -') ? red : color; ctx!.textAlign = align; ctx!.fillText(value, x, y); });
    }
    function lines(value: string, width: number, size = 20, bold = false) {
        ctx!.font = `${bold ? 700 : 400} ${size}px Arial`;
        const output: string[] = []; let current = '';
        for (const word of value.split(/\s+/)) {
            if (current && ctx!.measureText(`${current} ${word}`).width > width) { output.push(current); current = ''; }
            if (ctx!.measureText(word).width > width) {
                for (const char of word) { if (ctx!.measureText(current + char).width > width) { output.push(current); current = ''; } current += char; }
            } else current += (current ? ' ' : '') + word;
        }
        if (current) output.push(current);
        return output.length ? output : [''];
    }
    function paragraph(value: string, x: number, y: number, width: number, size = 20, color = muted, bold = false) {
        const rows = lines(value, width, size, bold);
        rows.forEach((row, i) => text(row, x, y + i * (size + 9), size, bold, color));
        return rows.length * (size + 9);
    }
    function amount(value: number, x: number, y: number, size = 23, color = navy) { text(money(value), x, y, size, true, color, 'right'); }
    box(0, 0, 1400, 12, rose);
    text('TRIBUTEK', 64, 83, 34, true, navy);
    text('GESTIÓN CONTABLE', 66, 110, 14, true, muted);
    text('PROYECCIÓN MENSUAL F29', 1336, 76, 17, true, navy, 'right');
    text(periodLabel(p.period).toUpperCase(), 1336, 106, 19, false, muted, 'right');
    box(64, 142, 1272, 1, line);
    text('Tu resumen mensual', 64, 202, 38, true, navy);
    let y = 248;
    y += paragraph(client.name, 64, y, 1250, 26, ink, true);
    text(`RUT ${client.rut}`, 64, y + 6, 19, false, muted);
    y += 42;
    const cardY = y;
    box(64, y, 760, 194, navy, 18);
    text(r.remainder > 0 ? 'REMANENTE ESTIMADO A FAVOR' : 'TOTAL ESTIMADO A PAGAR', 94, y + 43, 18, true, '#E9D4CB');
    text(money(r.remainder > 0 ? r.remainder : r.total), 94, y + 118, 60, true, '#FFFFFF');
    text(r.remainder > 0 ? 'Crédito disponible para el cálculo de próximos períodos.' : 'Incluye impuestos y otras obligaciones informadas.', 94, y + 160, 18, false, '#E0E5EF');
    box(844, y, 492, 194, pale, 18);
    text(r.remainder > 0 ? 'OTRAS OBLIGACIONES A PAGAR' : 'COMPOSICIÓN DEL TOTAL', 870, y + 38, 17, true, navy);
    const metrics: [string, number][] = [['IVA del período', r.ivaPayable], ['Otras obligaciones', r.other], ['Total a pagar', r.total]];
    metrics.forEach(([label, value], i) => { text(label, 870, cardY + 78 + i * 42, 20, i === 2); amount(value, 1310, cardY + 78 + i * 42, 24); });
    y += 226;
    const explanation = r.remainder > 0
        ? 'El crédito fiscal considerado supera al IVA de ventas. El remanente se muestra separado de las otras obligaciones por pagar.'
        : r.ivaPayable > 0
            ? `Compras con factura de referencia: ${money(r.suggestedNet)} netos · ${money(r.suggestedGross)} con IVA. La procedencia del crédito fiscal debe revisarse con la contadora.`
            : 'No se genera IVA a pagar en esta proyección. El total corresponde a las otras obligaciones informadas.';
    text(r.remainder > 0 ? 'SOBRE TU REMANENTE' : r.ivaPayable > 0 ? 'REFERENCIA DE COMPRAS' : 'SOBRE EL RESULTADO', 64, y, 16, true, navy);
    y += 32;
    y += paragraph(explanation, 64, y, 1240, 20);
    y += 25;
    text('01', 64, y, 18, true, rose); text('Detalle del cálculo', 105, y, 27, true, navy); y += 27;
    function panel(x: number, top: number, title: string, rows: [string, number][]) {
        box(x, top, 620, 48, navy, 8); text(title, x + 20, top + 31, 19, true, '#FFFFFF');
        let cursor = top + 52;
        rows.forEach(([label, value], i) => {
            const labelLines = lines(label, 375, 19, i === rows.length - 1);
            const height = Math.max(43, labelLines.length * 26 + 18), final = i === rows.length - 1;
            box(x, cursor, 620, height, final ? pale : i % 2 === 0 ? '#F7F8FA' : '#FFFFFF');
            labelLines.forEach((row, j) => text(row, x + 18, cursor + 28 + j * 26, 19, final));
            amount(value, x + 600, cursor + 28, 21); cursor += height;
        });
        return cursor;
    }
    const left = panel(64, y, 'IVA DEL PERÍODO', [
        ['IVA débito por ventas', r.debit], ['IVA crédito por compras', r.purchases.iva], ['IVA de importación', m.importation],
        ['Remanente mes anterior', m.previousCredit], [r.remainder > 0 ? 'Remanente estimado' : 'IVA estimado a pagar', r.remainder || r.ivaPayable],
    ]);
    const right = panel(716, y, 'OTRAS OBLIGACIONES', [
        ['IVA retenido por pagar', m.retained], ['Impuesto único', m.singleTax], ['3% préstamo solidario · remuneraciones', m.loanSalary],
        ['3% préstamo solidario · honorarios', m.loanFees], ['Retención de honorarios', m.withholding], ['P.P.M.', r.ppm],
        ['Cotizaciones', m.contributions], ['Honorarios', m.fees], ['Total otras obligaciones', r.other],
    ]);
    y = Math.max(left, right) + 55;
    function table(number: string, title: string, firstColumn: string, list: typeof sales) {
        text(number, 64, y, 18, true, rose); text(title, 105, y, 27, true, navy);
        const docs = list.reduce((sum, item) => sum + item.docs, 0);
        text(`${docs} documentos`, 1336, y, 18, false, muted, 'right');
        y += 23;
        box(64, y, 1272, 43, '#EDF0F5', 7);
        text(firstColumn, 80, y + 28, 17, true, navy);
        const columns = [686, 839, 1000, 1154, 1320];
        ['Docs.', 'Exento', 'Neto', 'IVA', 'Total'].forEach((label, i) => text(label, columns[i], y + 28, 17, true, navy, 'right'));
        y += 48;
        if (!list.length) { text('Sin documentos importados.', 80, y + 27, 19, false, muted); y += 55; }
        list.forEach((item, index) => {
            const nameLines = lines(item.name, 555, 19);
            const height = Math.max(64, nameLines.length * 26 + (item.rut ? 35 : 20));
            if (index % 2 === 0) box(64, y, 1272, height, '#F8F9FB');
            nameLines.forEach((row, i) => text(row, 80, y + 25 + i * 26, 19));
            if (item.rut) text(`RUT ${item.rut}`, 80, y + nameLines.length * 26 + 21, 15, false, muted);
            [String(item.docs), money(item.exempt), money(item.net), money(item.iva), money(item.total)].forEach((value, i) => text(value, columns[i], y + 30, 18, false, ink, 'right'));
            y += height;
        });
        box(64, y, 1272, 48, pale, 7); text('TOTAL', 80, y + 31, 18, true, navy);
        const sums = list.reduce((s, row) => [s[0] + row.docs, s[1] + row.exempt, s[2] + row.net, s[3] + row.iva, s[4] + row.total], [0, 0, 0, 0, 0]);
        sums.forEach((value, i) => text(i === 0 ? String(value) : money(value), columns[i], y + 31, 18, true, navy, 'right'));
        y += 99;
    }
    table('02', 'Ventas asociadas', 'Cliente / receptor', sales);
    table('03', 'Compras asociadas', 'Proveedor', purchases);
    box(64, y - 15, 1272, 1, line);
    y += paragraph('Estimación basada en los registros disponibles. Los montos pueden variar hasta el cierre del mes.', 64, y + 14, 1240, 18);
    y += 45;
    text('TRIBUTEK', 64, y, 23, true, navy);
    text('INFORMACIÓN CONFIDENCIAL · USO EXCLUSIVO DEL CLIENTE', 1336, y, 14, false, muted, 'right');
    canvas.width = 1400;
    const height = Math.ceil(y + 50);
    if (height > 30000) throw new Error('El detalle es demasiado extenso para una sola imagen. Reduce el alcance del informe antes de exportar.');
    canvas.height = height;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    commands.forEach(draw => draw());
    return canvas;
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
