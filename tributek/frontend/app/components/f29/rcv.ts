import { fileIdentity, matchesFile, parseRcv, type Client, type Projection } from './model';

export async function importRcv(previous: Projection, client: Client, files: File[]): Promise<Projection> {
    if (!files.length || files.some(file => !matchesFile(file.name, client, previous.period)))
        throw new Error('Los archivos no corresponden al cliente y período de esta hoja.');
    const updated = { ...previous, manual: { ...previous.manual }, reviewed: false };
    for (const kind of ['sales', 'purchases'] as const) {
        const matching = files.filter(file => fileIdentity(file.name)?.kind === kind);
        if (matching.length > 1)
            throw new Error(`Hay varios archivos de ${kind === 'sales' ? 'ventas' : 'compras'}. Selecciona una sola versión.`);
        if (!matching.length) continue;
        const file = matching[0];
        if (file.size > 10000000) throw new Error('CSV mayor a 10 MB.');
        const buffer = await file.arrayBuffer();
        let text = new TextDecoder('utf-8').decode(buffer);
        if (text.includes('\uFFFD')) text = new TextDecoder('windows-1252').decode(buffer);
        updated[kind] = { ...parseRcv(text, kind, previous.period), name: file.name, importedAt: new Date().toISOString() };
    }
    return updated;
}
