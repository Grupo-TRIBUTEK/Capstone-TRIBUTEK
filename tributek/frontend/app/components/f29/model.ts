// Proyección informativa. Los montos RCV se conservan tal como vienen del archivo.
export type Kind = 'sales' | 'purchases';
export type Row = {
    code: number;
    rut: string;
    name: string;
    folio: string;
    date: string;
    exempt: number;
    net: number;
    iva: number;
    total: number;
};
export type Source = {
    name: string;
    importedAt: string;
    rows: Row[];
    warnings: string[];
};
export const manualLabels = {
    voucherNet: 'Comprobante electrónico · neto', importation: 'IVA de importación', previousCredit: 'Remanente mes anterior',
    retained: 'IVA retenido por pagar', singleTax: 'Impuesto único', loanSalary: '3% préstamo solidario · remuneraciones',
    loanFees: '3% préstamo solidario · honorarios', withholding: 'Retención de honorarios · monto', contributions: 'Cotizaciones previsionales', fees: 'Honorarios',
} as const;
export type ManualKey = keyof typeof manualLabels;
export type Projection = {
    clientId: string;
    period: string;
    manual: Record<ManualKey, number>;
    ppmRate: number;
    ppmOverride: number | null;
    sales?: Source;
    purchases?: Source;
    reviewed: boolean;
};
export type Client = {
    id: string;
    name: string;
    rut: string;
};
export type Database = {
    version: 1;
    revision: string;
    clients: Client[];
    projections: Projection[];
};
export const emptyDatabase: Database = { version: 1, revision: '', clients: [], projections: [] };
export const money = (n: number) => '$ ' + Math.round(n).toLocaleString('es-CL');
export function periodLabel(period: string) { return new Date(period + '-15T12:00:00').toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }); }
export const validPeriod = (p: string) => /^20\d{2}-(0[1-9]|1[0-2])$/.test(p);
export const normalizeRut = (rut: string) => rut.replace(/[.\s]/g, '').toUpperCase();
export function validRut(rut: string) {
    const match = normalizeRut(rut).match(/^(\d{7,8})-([0-9K])$/);
    if (!match)
        return false;
    let sum = 0, factor = 2;
    for (const n of [...match[1]].reverse()) {
        sum += Number(n) * factor;
        factor = factor === 7 ? 2 : factor + 1;
    }
    const result = 11 - sum % 11;
    return match[2] === (result === 11 ? '0' : result === 10 ? 'K' : String(result));
}
export function newProjection(clientId: string, period: string): Projection {
    if (!validPeriod(period))
        throw new Error('Período inválido.');
    return { clientId, period, manual: Object.fromEntries(Object.keys(manualLabels).map(k => [k, 0])) as Record<ManualKey, number>, ppmRate: 0.3, ppmOverride: null, reviewed: false };
}
const normalize = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
// Handles quoted delimiters, escaped quotes, CRLF and embedded newlines.
export function csvRows(text: string): string[][] {
    text = text.replace(/^\uFEFF/, '');
    const first = text.split(/\r?\n/)[0];
    const delimiter = first.includes(';') ? ';' : first.includes('\t') ? '\t' : ',';
    const rows: string[][] = [];
    let row: string[] = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') {
            if (quoted && text[i + 1] === '"') {
                cell += '"';
                i++;
            }
            else
                quoted = !quoted;
        }
        else if (ch === delimiter && !quoted) {
            row.push(cell);
            cell = '';
        }
        else if ((ch === '\n' || ch === '\r') && !quoted) {
            if (ch === '\r' && text[i + 1] === '\n')
                i++;
            row.push(cell);
            if (row.some(v => v.trim()))
                rows.push(row);
            row = [];
            cell = '';
        }
        else
            cell += ch;
    }
    if (quoted)
        throw new Error('CSV con comillas sin cerrar.');
    row.push(cell);
    if (row.some(v => v.trim()))
        rows.push(row);
    return rows;
}
function amount(raw: string, line: number) {
    let s = raw.trim().replace(/[$\s]/g, '');
    if (!s)
        return 0;
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s))
        s = s.replace(/\./g, '');
    if (!/^-?\d+$/.test(s) || !Number.isSafeInteger(Number(s)) || Math.abs(Number(s)) > 1e12)
        throw new Error(`Monto inválido en fila ${line}: ${raw}`);
    return Number(s);
}
const supported = [33, 34, 39, 41, 46, 56, 61];
export function parseRcv(text: string, kind: Kind, period: string): {
    rows: Row[];
    warnings: string[];
} {
    const [header, ...body] = csvRows(text);
    if (!header)
        throw new Error('CSV vacío.');
    if (body.length > 20000)
        throw new Error('El archivo supera 20.000 documentos.');
    const h = header.map(normalize);
    const col = (name: string) => { const i = h.indexOf(normalize(name)); if (i < 0)
        throw new Error(`Falta la columna ${name}.`); return i; };
    const fields = { code: col('Tipo Doc'), rut: col(kind === 'sales' ? 'Rut cliente' : 'RUT Proveedor'), name: col('Razon Social'), folio: col('Folio'), date: col('Fecha Docto'), exempt: col('Monto Exento'), net: col('Monto Neto'), iva: col(kind === 'sales' ? 'Monto IVA' : 'Monto IVA Recuperable'), total: col('Monto Total') };
    const seen = new Set<string>(), warnings = new Set<string>();
    const rows = body.map((values, i): Row | null => {
        const line = i + 2;
        if (values.length < header.length)
            throw new Error(`Fila ${line} incompleta.`);
        const code = Number(values[fields.code]);
        if (!supported.includes(code) || (kind === 'purchases' && [39, 41].includes(code)))
            throw new Error(`Tipo de documento ${code} no contemplado en esta proyección (fila ${line}). No se importó el archivo.`);
        const rut = normalizeRut(values[fields.rut]), folio = values[fields.folio].trim();
        if (!rut || !folio || !values[fields.name].trim())
            throw new Error(`Faltan datos del documento en fila ${line}.`);
        const key = [code, rut, folio].join('|');
        if (seen.has(key)) {
            // El RCV puede repetir un folio en una línea sin Nro para detallar otro impuesto.
            const numberIndex = h.indexOf('nro'), otherIndex = h.indexOf('valorotroimpuesto');
            const emptyBase = [fields.exempt, fields.net, fields.iva, fields.total].every(index => !values[index].trim());
            if (numberIndex >= 0 && !values[numberIndex].trim() && emptyBase && otherIndex >= 0 && amount(values[otherIndex], line) !== 0) {
                warnings.add(`Folio ${folio}: línea adicional de otro impuesto (${money(amount(values[otherIndex], line))}); no se cuenta como otro documento ni como crédito IVA.`);
                return null;
            }
            throw new Error(`Documento duplicado en fila ${line}: ${folio}.`);
        }
        seen.add(key);
        const date = values[fields.date].trim(), parts = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!parts || new Date(`${parts[3]}-${parts[2]}-${parts[1]}T12:00:00`).getDate() !== Number(parts[1]))
            throw new Error(`Fecha inválida en fila ${line}.`);
        if (`${parts[3]}-${parts[2]}` !== period)
            warnings.add('Hay documentos emitidos en otro mes. Comprueba que corresponden al período del registro.');
        const sign = code === 61 ? -1 : 1;
        const value = (k: 'exempt' | 'net' | 'iva' | 'total') => {
            const n = amount(values[fields[k]], line);
            if (n < 0 && sign > 0)
                throw new Error(`Monto negativo inesperado en fila ${line}.`);
            return sign * Math.abs(n);
        };
        for (const special of ['IVA uso Comun', 'IVA Retenido Total', 'IVA Retenido Parcial', 'Valor Otro Impuesto', 'Monto Iva No Recuperable', 'IVA Activo Fijo', 'NCE o NDE sobre Fact. de Compra']) {
            const index = h.indexOf(normalize(special));
            if (index >= 0 && amount(values[index], line) !== 0)
                warnings.add(`Revisar ${special}: no se incorpora automáticamente a otras obligaciones.`);
        }
        return { code, rut, folio, name: values[fields.name].trim(), date, exempt: value('exempt'), net: value('net'), iva: value('iva'), total: value('total') };
    });
    return { rows: rows.filter((row): row is Row => row !== null), warnings: [...warnings] };
}
export function fileIdentity(name: string): {
    rut: string;
    period: string;
    kind: Kind;
} | null {
    const match = name.toUpperCase().match(/^RCV_(VENTA|COMPRA(?:_REGISTRO)?)_(\d{7,8}(?:-[0-9K])?)_(20\d{2})(0[1-9]|1[0-2])(?:\s*\(\d+\))?\.CSV$/);
    return match ? { kind: match[1] === 'VENTA' ? 'sales' : 'purchases', rut: match[2], period: `${match[3]}-${match[4]}` } : null;
}
export function matchesFile(name: string, client: Client, period: string) {
    const identity = fileIdentity(name), rut = normalizeRut(client.rut);
    return !!identity && identity.period === period && (identity.rut === rut || identity.rut === rut.split('-')[0]);
}
export const sumRows = (rows: Pick<Row, 'exempt' | 'net' | 'iva' | 'total'>[]) => rows.reduce((a, r) => ({ exempt: a.exempt + r.exempt, net: a.net + r.net, iva: a.iva + r.iva, total: a.total + r.total }), { exempt: 0, net: 0, iva: 0, total: 0 });
export function calculate(p: Projection) {
    const sales = sumRows(p.sales?.rows ?? []), purchases = sumRows(p.purchases?.rows ?? []), m = p.manual;
    const voucherIva = Math.round(m.voucherNet * 0.19);
    const debit = sales.iva + voucherIva, credit = purchases.iva + m.importation + m.previousCredit;
    const difference = debit - credit, ivaPayable = Math.max(0, difference), remainder = Math.max(0, -difference);
    const ppm = p.ppmOverride ?? Math.round(Math.max(0, sales.net + m.voucherNet) * p.ppmRate / 100);
    const taxes = ivaPayable + m.retained + m.singleTax + m.loanSalary + m.loanFees + m.withholding + ppm;
    const other = taxes - ivaPayable + m.contributions + m.fees;
    return { sales, purchases, voucherIva, debit, credit, ivaPayable, remainder, ppm, taxes, other, total: taxes + m.contributions + m.fees, suggestedNet: Math.round(ivaPayable / 0.19), suggestedGross: Math.ceil(ivaPayable / 0.19 * 1.19) };
}
export function associated(rows: Row[]) {
    const map = new Map<string, ReturnType<typeof sumRows> & {
        name: string;
        rut: string;
        docs: number;
    }>();
    for (const row of rows) {
        const old = map.get(row.rut) ?? { name: row.name, rut: row.rut, docs: 0, exempt: 0, net: 0, iva: 0, total: 0 };
        map.set(row.rut, { ...old, docs: old.docs + 1, ...sumRows([old, row]) });
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
}
export function message(client: Client, p: Projection) {
    void client;
    const r = calculate(p);
    const opening = '*Buenas tardes, estimado cliente:*\n\nAdjunto este informe con una estimación tributaria basada en la información registrada hasta la fecha.\nComo el mes aún no ha finalizado, el resultado puede variar según los documentos que se registren hasta el cierre.';
    const closing = '_Este monto es solo una referencia y puede modificarse según las ventas y compras que se registren hasta el cierre del mes._';
    if (r.remainder > 0)
        return `${opening}\n\n*Resultado: remanente de crédito fiscal a favor*\n${money(r.remainder)}\n\n*Información sobre el remanente*\nEl crédito fiscal de compras supera al débito fiscal de ventas, por lo que no se genera IVA a pagar por este concepto.\n\n*Monto estimado del remanente:*\n${money(r.remainder)}${r.other > 0 ? `\n\n*Otras obligaciones estimadas a pagar:*\n${money(r.other)}` : ''}\n\n${closing}`;
    return `${opening}\n\n*Valor aproximado a pagar el próximo mes:*\n${money(r.total)}${r.ivaPayable > 0 ? `\n\n*Recomendación para disminuir el impuesto a pagar*\nSi desean reducir el monto estimado del impuesto, pueden aumentar su crédito fiscal realizando compras con factura.\n\n*Monto aproximado de compras con factura recomendado:*\n${money(r.suggestedNet)}` : '\n\nNo se genera IVA a pagar por este concepto.'}\n\n${closing}`;
}
export function summary(client: Client, p: Projection) { const r = calculate(p); return `${client.name}\nRUT: ${client.rut}\nPeríodo: ${periodLabel(p.period)}\nVentas: ${money(r.sales.total + p.manual.voucherNet + r.voucherIva)}\nCompras: ${money(r.purchases.total)}\nIVA débito: ${money(r.debit)}\nIVA crédito: ${money(r.credit)}\nRemanente: ${money(r.remainder)}\nPPM: ${money(r.ppm)}\nCotizaciones previsionales: ${money(p.manual.contributions)}\nHonorarios: ${money(p.manual.fees)}\nTotal estimado a pagar: ${money(r.total)}`; }
export function validateDatabase(value: unknown): Database {
    if (!value || typeof value !== 'object')
        throw new Error('Respaldo F29 inválido.');
    const d = value as Database;
    if (d.version !== 1 || typeof d.revision !== 'string' || !Array.isArray(d.clients) || !Array.isArray(d.projections) || d.clients.length > 500 || d.projections.length > 6000)
        throw new Error('Formato o tamaño de respaldo F29 inválido.');
    const ids = new Set<string>(), ruts = new Set<string>(), keys = new Set<string>();
    for (const c of d.clients) {
        if (!c || typeof c.id !== 'string' || !c.id || typeof c.name !== 'string' || !c.name.trim() || c.name.length > 200 || typeof c.rut !== 'string' || !validRut(c.rut) || ids.has(c.id) || ruts.has(normalizeRut(c.rut)))
            throw new Error('Cliente F29 inválido o duplicado.');
        ids.add(c.id);
        ruts.add(normalizeRut(c.rut));
    }
    const safe = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= 1e12;
    for (const p of d.projections) {
        const key = `${p.clientId}|${p.period}`;
        if (!ids.has(p.clientId) || !validPeriod(p.period) || keys.has(key) || !p.manual || Object.keys(manualLabels).some(k => !safe(p.manual[k as ManualKey])) || typeof p.reviewed !== 'boolean' || !Number.isFinite(p.ppmRate) || p.ppmRate < 0 || p.ppmRate > 100 || (p.ppmOverride !== null && !safe(p.ppmOverride)))
            throw new Error('Proyección F29 inválida.');
        keys.add(key);
        for (const s of [p.sales, p.purchases]) {
            if (!s)
                continue;
            if (typeof s.name !== 'string' || typeof s.importedAt !== 'string' || !Array.isArray(s.rows) || s.rows.length > 20000 || !Array.isArray(s.warnings) || s.warnings.some(w => typeof w !== 'string'))
                throw new Error('Origen RCV inválido.');
            const documents = new Set<string>();
            for (const r of s.rows) {
                if (!r || !supported.includes(r.code) || ['rut', 'name', 'folio', 'date'].some(k => typeof r[k as keyof Row] !== 'string') || ['net', 'exempt', 'iva', 'total'].some(k => { const n = r[k as keyof Row]; return typeof n !== 'number' || !safe(Math.abs(n)) || (r.code === 61 ? n > 0 : n < 0); }))
                    throw new Error('Documento RCV inválido.');
                const key = `${r.code}|${r.rut}|${r.folio}`;
                if (documents.has(key))
                    throw new Error('Documento RCV duplicado.');
                documents.add(key);
            }
            if (Object.values(sumRows(s.rows)).some(n => !Number.isSafeInteger(n)))
                throw new Error('El total excede la precisión admitida.');
        }
    }
    return d;
}
