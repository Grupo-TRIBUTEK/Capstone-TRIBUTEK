"use client";
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useData } from '../ficha/store';
import { extra, type Ledger } from '../management/model';
import { Modal } from '../management/ui';
import { authenticatedFetch } from '../../features/auth/auth-client';
import { associated, calculate, emptyDatabase, manualLabels, matchesFile, message, money, newProjection, normalizeRut, periodLabel, sumRows, summary, validPeriod, validRut, validateDatabase, type Client, type Database, type Kind, type ManualKey, type Projection, type Row, type Source } from './model';
import { folderFiles, readDatabase, writeDatabase } from './storage';
import { download, exportImage, reportCanvas } from './report';
import { importRcv } from './rcv';
import './f29.css';
type Candidate = {
    client: Client;
    files: File[];
};
const currentMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
export default function F29Workspace() {
    const ledger = useData();
    const [db, setDb] = useState<Database>(emptyDatabase), [ready, setReady] = useState(false), [blocked, setBlocked] = useState('');
    const [period, setPeriod] = useState(''), [search, setSearch] = useState(''), [active, setActive] = useState<Client | null>(null), [draft, setDraft] = useState<Projection | null>(null), [dirty, setDirty] = useState(false);
    const [notice, setNotice] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const [files, setFiles] = useState<File[]>([]), [folder, setFolder] = useState('Sin carpeta seleccionada');
    const [candidates, setCandidates] = useState<Candidate[] | null>(null), [acuse, setAcuse] = useState(false), [identity, setIdentity] = useState(false);
    const [editClient, setEditClient] = useState<Client | 'new' | null>(null), [preview, setPreview] = useState(false);
    const [available, setAvailable] = useState<Record<string, string>>({});
    const sourceMode = useRef<'folder' | 'files'>('folder');
    const pendingSearch = useRef<{ all: boolean; refresh: boolean } | null>(null);
    const directoryInput = useRef<HTMLInputElement>(null), csvInput = useRef<HTMLInputElement>(null), restoreInput = useRef<HTMLInputElement>(null);
    useEffect(() => { queueMicrotask(() => { try {
        setDb(readDatabase());
        setPeriod(currentMonth());
    }
    catch (e) {
        setBlocked(String(e));
    } setReady(true); }); }, []);
    useEffect(() => { if (!dirty)
        return; const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
    function attempt(fn: () => void | Promise<void>) { setError(''); setNotice(''); Promise.resolve().then(fn).catch(e => { if (e instanceof DOMException && e.name === 'AbortError')
        return; setError(e instanceof Error ? e.message : String(e)); }); }
    function commit(next: Database) { const saved = writeDatabase(next, db.revision); setDb(saved); return saved; }
    function save(p = draft) { if (!p)
        return; commit({ ...db, projections: [...db.projections.filter(x => x.clientId !== p.clientId || x.period !== p.period), p] }); setDraft(p); setDirty(false); setNotice('Proyección guardada.'); }
    function leave() { return !dirty || confirm('Hay cambios sin guardar. ¿Quieres descartarlos?'); }
    function open(c: Client) { if (!leave())
        return; setActive(c); setDraft(db.projections.find(p => p.clientId === c.id && p.period === period) ?? newProjection(c.id, period)); setDirty(false); setError(''); setNotice(''); }
    function change(p: Projection) { setDraft({ ...p, reviewed: false }); setDirty(true); }
    function foundFiles(pool: File[], all: boolean, refresh = false) {
        const list = (all ? db.clients : active ? [active] : []).map(client => ({ client, files: pool.filter(f => matchesFile(f.name, client, period)) }));
        setAvailable(Object.fromEntries(list.map(c => [c.client.id, c.files.length ? `${c.files.length} RCV encontrados` : 'Sin RCV'])));
        if (refresh) { setNotice('Disponibilidad actualizada.'); return; }
        if (!list.some(c => c.files.length))
            throw new Error('No se encontraron CSV para el cliente y período seleccionados. Revisa el RUT y el período del nombre del archivo.');
        setAcuse(false);
        setIdentity(false);
        setCandidates(list);
    }
    async function chooseFolder(choose = true, search?: { all: boolean; refresh: boolean }) {
        const found = await folderFiles(choose);
        if (!found) {
            pendingSearch.current = search ?? null;
            directoryInput.current?.click();
            return;
        }
        sourceMode.current = 'folder';
        setFiles(found.files);
        setFolder(found.name);
        return found.files;
    }
    function receivedFiles(e: ChangeEvent<HTMLInputElement>) {
        const selected = Array.from(e.target.files ?? []);
        e.target.value = '';
        if (!selected.length) { pendingSearch.current = null; return; }
        sourceMode.current = 'files';
        setFiles(selected);
        setFolder(`${selected.length} CSV seleccionados`);
        const search = pendingSearch.current;
        pendingSearch.current = null;
        if (search) foundFiles(selected, search.all, search.refresh);
        else if (active) foundFiles(selected, false);
    }
    async function locate(all: boolean, refresh = false) {
        const pool = sourceMode.current === 'folder' || !files.length
            ? await chooseFolder(false, { all, refresh }) : files;
        if (pool) foundFiles(pool, all, refresh);
    }
    async function process() {
        if (!candidates || !acuse || !identity)
            return;
        setBusy(true);
        setError('');
        try {
            const projections = [...db.projections], results: string[] = [];
            let count = 0, missing = 0, failed = 0;
            let activeUpdated = false;
            for (const c of candidates) {
                if (!c.files.length) {
                    missing++;
                    continue;
                }
                try {
                    const previous = draft?.clientId === c.client.id && draft.period === period
                        ? draft : projections.find(p => p.clientId === c.client.id && p.period === period) ?? newProjection(c.client.id, period);
                    const updated = await importRcv(previous, c.client, c.files);
                    const index = projections.findIndex(p => p.clientId === updated.clientId && p.period === period);
                    if (index < 0)
                        projections.push(updated);
                    else
                        projections[index] = updated;
                    count++;
                    if (active?.id === updated.clientId) activeUpdated = true;
                }
                catch (e) {
                    failed++;
                    results.push(`${c.client.name}: ${e instanceof Error ? e.message : String(e)}`);
                }
            }
            if (count > 0) {
                const saved = commit({ ...db, projections });
                if (activeUpdated && active) {
                    setDraft(saved.projections.find(p => p.clientId === active.id && p.period === period)!);
                    setDirty(false);
                }
                setCandidates(null);
            }
            setNotice(`Procesados: ${count}. Sin RCV: ${missing}. Errores: ${failed}.${results.length ? '\n' + results.join('\n') : ''}`);
        }
        finally {
            setBusy(false);
        }
    }
    async function importClients() {
        const candidates: {
            name: string;
            rut: string;
        }[] = ledger.data.clients.map(c => ({ name: c.name, rut: extra(ledger.data as Ledger).profiles[c.id]?.rut ?? '' }));
        let remoteError = '';
        try {
            const response = await authenticatedFetch('/clientes');
            if (!response.ok)
                throw new Error('Directorio remoto no disponible.');
            const remote = await response.json();
            if (!Array.isArray(remote))
                throw new Error('Directorio inválido.');
            for (const c of remote) {
                if (typeof c.nombreRazonSocial === 'string' && typeof c.rut === 'string')
                    candidates.push({ name: c.nombreRazonSocial, rut: c.rut });
            }
        }
        catch {
            remoteError = ' No se pudo consultar el servidor; se usó el directorio local disponible.';
        }
        const clients = [...db.clients];
        let invalid = 0;
        for (const c of candidates) {
            if (!validRut(c.rut)) {
                invalid++;
                continue;
            }
            if (!clients.some(x => normalizeRut(x.rut) === normalizeRut(c.rut)))
                clients.push({ id: crypto.randomUUID(), name: c.name, rut: normalizeRut(c.rut) });
        }
        commit({ ...db, clients });
        setNotice(`Se agregaron ${clients.length - db.clients.length} clientes a F29. ${invalid ? `${invalid} entradas sin RUT válido se omitieron.` : ''}${remoteError}`);
    }
    function saveClient(c: Client) {
        const client = { ...c, name: c.name.trim(), rut: normalizeRut(c.rut) };
        if (!client.name || !validRut(client.rut))
            throw new Error('Ingresa razón social y RUT válido con dígito verificador.');
        if (db.clients.some(x => x.id !== client.id && x.rut === client.rut))
            throw new Error('Este RUT ya está en F29.');
        commit({ ...db, clients: [...db.clients.filter(x => x.id !== client.id), client] });
        if (active?.id === client.id)
            setActive(client);
        setEditClient(null);
    }
    function removeClient() { if (!active || !leave() || !confirm(`¿Eliminar a ${active.name} del módulo F29 y sus proyecciones? Esto no elimina al cliente del directorio general.`))
        return; commit({ ...db, clients: db.clients.filter(c => c.id !== active.id), projections: db.projections.filter(p => p.clientId !== active.id) }); setActive(null); setDraft(null); setDirty(false); }
    function startMonth() { if (!leave())
        return; const raw = prompt('Período a iniciar (YYYYMM). Los meses anteriores se conservan.', period.replace('-', '')); if (!raw)
        return; const next = raw.includes('-') ? raw : `${raw.slice(0, 4)}-${raw.slice(4)}`; if (!validPeriod(next))
        throw new Error('Ingresa un período válido, por ejemplo 202610.'); setPeriod(next); setActive(null); setDraft(null); setDirty(false); setAvailable({}); setNotice('Período seleccionado.'); }
    async function copy(text: string) { await navigator.clipboard.writeText(text); setNotice('Texto copiado. Ya puedes pegarlo en WhatsApp.'); }
    async function restore(e: ChangeEvent<HTMLInputElement>) { const file = e.target.files?.[0]; e.target.value = ''; if (!file)
        return; if (file.size > 30000000)
        throw new Error('El respaldo supera 30 MB.'); const next = validateDatabase(JSON.parse(await file.text())); if (!confirm('¿Reemplazar todos los datos F29 de este navegador por el respaldo?'))
        return; commit(next); setActive(null); setDraft(null); setDirty(false); setNotice('Respaldo restaurado.'); }
    const selected = db.clients.filter(c => `${c.name} ${c.rut}`.toLowerCase().includes(search.toLowerCase()));
    if (!ready)
        return <p>Cargando proyecciones F29…</p>;
    if (blocked)
        return <div className="tk"><h1>Proyección F29</h1><p role="alert">No se pudieron leer los datos guardados. No se sobrescribirán. {blocked}</p></div>;
    return <main className="tk f29">
    <header className="f29-heading"><div><span className="f29-eyebrow">TRIBUTEK / PROYECCIÓN MENSUAL</span><h1>{active ? active.name : 'Proyección F29'}</h1><p>{active ? `RUT ${active.rut} · ${periodLabel(period)}` : periodLabel(period)}</p></div>{active && <button onClick={() => { if (leave()) {
        setActive(null);
        setDraft(null);
        setDirty(false);
    } }}>Volver al panel</button>}</header>
    
    {error && <p role="alert" className="f29-error">{error}</p>}{notice && <p role="status" className="f29-notice">{notice}</p>}
    <input hidden type="file" ref={directoryInput} multiple {...({ webkitdirectory: '' } as Record<string, string>)} onChange={e => attempt(() => receivedFiles(e))}/>
    <input hidden type="file" ref={csvInput} accept=".csv" multiple onChange={e => attempt(() => receivedFiles(e))}/>
    <input hidden type="file" ref={restoreInput} accept=".json" onChange={e => attempt(() => restore(e))}/>
    {!active ? <>
      <div className="f29-toolbar"><label>Período de trabajo<input type="month" value={period} min="2000-01" max="2099-12" onChange={e => { if (validPeriod(e.target.value)) {
            setPeriod(e.target.value);
            setAvailable({});
        } }}/></label><label className="f29-grow">Buscar cliente o RUT<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Razón social o RUT"/></label></div>
      <div className="f29-actions"><button className="f29-primary" onClick={() => attempt(startMonth)}>Iniciar mes</button><button onClick={() => setEditClient('new')}>Agregar cliente</button><button disabled={busy} onClick={() => attempt(() => locate(true, true))}>Actualizar estados</button><button disabled={!db.clients.length || busy} onClick={() => attempt(() => locate(true))}>Procesar todos</button></div>
      <section className="f29-folder"><div><strong>Carpeta RCV global</strong><p>{folder}</p></div><button onClick={() => attempt(async () => { await chooseFolder(); })}>Configurar carpeta RCV</button><button onClick={() => csvInput.current?.click()}>Importar CSV</button><button onClick={() => attempt(importClients)}>Traer clientes de TRIBUTEK</button></section>
      <div className="f29-table-wrap"><table><thead><tr><th>Cliente</th><th>RUT</th><th>Estado del período</th><th>Resultado estimado</th><th>Acción</th></tr></thead><tbody>{selected.map(c => { const p = db.projections.find(p => p.clientId === c.id && p.period === period), r = p ? calculate(p) : null; return <tr key={c.id}><td><strong>{c.name}</strong></td><td>{c.rut}</td><td>{p?.reviewed ? 'Revisado' : p?.sales && p?.purchases ? 'Importado · por revisar' : p?.sales || p?.purchases ? 'RCV parcial' : 'Pendiente'}{available[c.id] && <small>{available[c.id]}</small>}</td><td>{r ? <>{r.remainder > 0 && <small>Remanente <Amount value={r.remainder}/></small>}A pagar <Amount value={r.total}/></> : '—'}</td><td><button onClick={() => open(c)}>Abrir hoja</button></td></tr>; })}</tbody></table>{!selected.length && <p className="tk-empty">Sin clientes para mostrar.</p>}</div>
      <details className="f29-backup"><summary>Respaldo F29</summary><button onClick={() => download(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }), `TRIBUTEK-F29-respaldo-${currentMonth()}.json`)}>Descargar respaldo</button> <button onClick={() => restoreInput.current?.click()}>Restaurar respaldo</button><p><Link href="/admin/clientes">Ir al directorio general de clientes</Link></p></details>
    </> : draft && <>
      <p className="f29-source-status">Carpeta / archivos RCV: {folder}</p>
      <div className="f29-actions f29-sticky"><button className="f29-primary" onClick={() => attempt(() => save())}>{dirty ? 'Guardar cambios' : 'Guardar proyección'}</button><button onClick={() => attempt(() => locate(false))}>Buscar RCV automáticamente</button><button onClick={() => attempt(() => copy(message(active, draft)))}>Copiar mensaje</button><button onClick={() => setPreview(true)}>Ver informe</button><button onClick={() => attempt(async () => { setNotice(await exportImage(active, draft, true)); })}>Copiar informe</button><span aria-live="polite">{dirty ? 'Cambios sin guardar' : 'Hoja guardada / sin cambios'}</span></div>
      <details className="f29-more"><summary>Más opciones</summary><div className="f29-actions"><button onClick={() => csvInput.current?.click()}>Importar CSV</button><button onClick={() => attempt(async () => { await chooseFolder(); })}>Configurar carpeta RCV</button><button onClick={() => attempt(() => copy(summary(active, draft)))}>Copiar resumen</button><button onClick={() => setEditClient(active)}>Editar nombre</button><button className="f29-danger" onClick={() => attempt(removeClient)}>Eliminar cliente de F29</button></div></details>
      
      <Sheet p={draft} onChange={change}/>
      <details className="f29-panel"><summary>Archivos utilizados y detalle de documentos</summary>{(['sales', 'purchases'] as Kind[]).map(kind => <SourceDetail key={kind} kind={kind} source={draft[kind]}/>)}</details>
      <label className="f29-check"><input type="checkbox" checked={draft.reviewed} onChange={e => { setDraft({ ...draft, reviewed: e.target.checked }); setDirty(true); }}/> Revisé los registros, el acuse y los campos manuales de esta proyección.</label>
      <details className="f29-panel"><summary>Mensaje para el cliente</summary><pre>{message(active, draft)}</pre></details>
    </>}
    {editClient && <Modal title={editClient === 'new' ? 'Agregar cliente a F29' : 'Editar nombre en F29'} onClose={() => setEditClient(null)}><ClientForm client={editClient} save={saveClient}/></Modal>}
    {candidates && <Modal title="Revisar archivos encontrados" onClose={() => { if (!busy)
        setCandidates(null); }} wide><div className="f29-candidates">{candidates.map(c => <section key={c.client.id}><strong>{c.client.name} · {c.client.rut} · {period}</strong><ul>{c.files.map((f, i) => <li key={i}>{f.name}</li>)}</ul>{!c.files.length && <p>Sin RCV.</p>}</section>)}</div><label className="f29-check"><input type="checkbox" checked={identity} onChange={e => setIdentity(e.target.checked)}/> Confirmo que estos archivos pertenecen a los clientes y al período indicados.</label><label className="f29-check"><input type="checkbox" checked={acuse} onChange={e => setAcuse(e.target.checked)}/> Sí, realicé el acuse de recibo.</label><button disabled={!acuse || !identity || busy} className="f29-primary" onClick={() => attempt(process)}>{busy ? 'Procesando…' : 'Usar archivos encontrados'}</button></Modal>}
    {preview && active && draft && <Modal title="Informe para el cliente" wide onClose={() => setPreview(false)}><ReportPreview client={active} p={draft}/><button onClick={() => attempt(async () => { setNotice(await exportImage(active, draft, false)); })}>Descargar PNG</button><button onClick={() => attempt(async () => { setNotice(await exportImage(active, draft, true)); })}>Copiar informe</button></Modal>}
  </main>;
}
function NumberField({ label, value, change, rate = false }: {
    label: string;
    value: number;
    change: (v: number) => void;
    rate?: boolean;
}) {
    return <input aria-label={label} type="number" inputMode="decimal" min="0" max={rate ? 100 : 1e12} step={rate ? '0.01' : '1'} value={value || ''} placeholder="0" onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= 0 && n <= (rate ? 100 : 1e12) && (rate || Number.isInteger(n)))
        change(n); }}/>;
}
function Sheet({ p, onChange }: {
    p: Projection;
    onChange: (p: Projection) => void;
}) {
    const r = calculate(p);
    const saleGroups: [
        string,
        number[]
    ][] = [['Boleta electrónica', [39, 41]], ['Factura electrónica / exenta', [33, 34]], ['Nota de crédito emitida', [61]], ['Nota de débito emitida', [56]], ['Factura de compra recibida', [46]]];
    const purchaseGroups: [
        string,
        number[]
    ][] = [['Facturas recibidas', [33]], ['Factura de compra electrónica', [46]], ['Nota de crédito recibida', [61]], ['Nota de débito recibida', [56]], ['Facturas exentas', [34]]];
    function table(kind: Kind, groups: [
        string,
        number[]
    ][]) {
        const totals = kind === 'sales' ? { ...r.sales, net: r.sales.net + p.manual.voucherNet, iva: r.debit, total: r.sales.total + p.manual.voucherNet + r.voucherIva } : r.purchases;
        return <section className="f29-sheet"><h2>{kind === 'sales' ? 'Ventas' : 'Compras'}</h2><div className="f29-table-wrap"><table><thead><tr><th>Detalle</th><th>Exento</th><th>Neto</th><th>{kind === 'sales' ? 'IVA débito' : 'IVA recuperable'}</th><th>Total</th></tr></thead><tbody>{kind === 'sales' && <tr><th>Comprobante electrónico</th><td><Amount value={0}/></td><td><NumberField label={manualLabels.voucherNet} value={p.manual.voucherNet} change={v => onChange({ ...p, manual: { ...p.manual, voucherNet: v } })}/></td><td><Amount value={r.voucherIva}/></td><td><Amount value={p.manual.voucherNet + r.voucherIva}/></td></tr>}{groups.map(([label, codes]) => { const row = sumRows(p[kind]?.rows.filter(row => codes.includes(row.code)) ?? []); return <tr key={label}><th>{label}</th>{(['exempt', 'net', 'iva', 'total'] as const).map(k => <td key={k}><Amount value={row[k]}/></td>)}</tr>; })}</tbody><tfoot><tr><th>Totales</th>{(['exempt', 'net', 'iva', 'total'] as const).map(k => <td key={k}><Amount value={totals[k]}/></td>)}</tr></tfoot></table></div></section>;
    }
    const resultRow = (name: string, value: number) => <tr key={name}><th>{name}</th><td><Amount value={value}/></td></tr>;
    const inputRow = (key: ManualKey) => <tr key={key}><th>{manualLabels[key]}</th><td><NumberField label={manualLabels[key]} value={p.manual[key]} change={v => onChange({ ...p, manual: { ...p.manual, [key]: v } })}/></td></tr>;
    return <><div className="f29-results" aria-live="polite" aria-atomic="true"><div className="f29-result-main"><span>Determinación automática · IVA</span><h2>{!p.sales && !p.purchases && !Object.values(p.manual).some(Boolean) ? 'Sin datos ingresados' : r.remainder > 0 ? 'Remanente estimado' : r.ivaPayable > 0 ? 'IVA estimado a pagar' : 'Sin IVA por pagar ni remanente'}</h2><strong><Amount value={r.remainder || r.ivaPayable}/></strong></div><div><span>Otras obligaciones</span><strong><Amount value={r.other}/></strong></div><div><span>Total estimado a pagar</span><strong><Amount value={r.total}/></strong></div></div>{table('sales', saleGroups)}{table('purchases', purchaseGroups)}<section className="f29-sheet"><h2>Determinación estimada F29</h2><div className="f29-determination"><table><tbody>{saleGroups.map(([name, codes]) => resultRow(`IVA · ${name}`, sumRows(p.sales?.rows.filter(row => codes.includes(row.code)) ?? []).iva))}{resultRow('IVA comprobante electrónico', r.voucherIva)}{resultRow('IVA débito · ventas', r.debit)}{purchaseGroups.map(([name, codes]) => resultRow(`IVA · ${name}`, sumRows(p.purchases?.rows.filter(row => codes.includes(row.code)) ?? []).iva))}{inputRow('importation')}{inputRow('previousCredit')}{resultRow('IVA crédito · compras y remanente', r.credit)}{resultRow(r.remainder ? 'Remanente estimado' : 'IVA estimado a pagar', r.remainder || r.ivaPayable)}</tbody></table><table><tbody>{(['retained', 'singleTax', 'loanSalary', 'loanFees', 'withholding'] as ManualKey[]).map(inputRow)}<tr><th>Tasa PPM (%)</th><td><NumberField label="Tasa PPM (%)" value={p.ppmRate} rate change={v => onChange({ ...p, ppmRate: v })}/></td></tr><tr><th>PPM calculado sobre neto de ventas</th><td><Amount value={r.ppm}/><label className="f29-check"><input type="checkbox" checked={p.ppmOverride !== null} onChange={e => onChange({ ...p, ppmOverride: e.target.checked ? r.ppm : null })}/> Ajustar monto PPM</label>{p.ppmOverride !== null && <NumberField label="Monto PPM manual" value={p.ppmOverride} change={v => onChange({ ...p, ppmOverride: v })}/>}</td></tr>{resultRow('Impuesto estimado a pagar', r.taxes)}{inputRow('contributions')}{inputRow('fees')}</tbody><tfoot>{resultRow('Total estimado a pagar', r.total)}</tfoot></table></div></section></>;
}
function SourceDetail({ kind, source }: {
    kind: Kind;
    source?: Source;
}) { return <section><h3>{kind === 'sales' ? 'Ventas' : 'Compras'}</h3>{!source ? <p>Sin registros importados.</p> : <><p>{source.name} · {source.rows.length} documentos · importado {new Date(source.importedAt).toLocaleString('es-CL')}</p>{source.warnings.map(w => <p key={w} className="f29-error">{w}</p>)}<div className="f29-table-wrap"><table><thead><tr><th>RUT</th><th>Razón social</th><th>Docs.</th><th>Neto</th><th>IVA</th><th>Total</th></tr></thead><tbody>{associated(source.rows).map(row => <tr key={row.rut}><td>{row.rut}</td><td>{row.name}</td><td>{row.docs}</td><td><Amount value={row.net}/></td><td><Amount value={row.iva}/></td><td><Amount value={row.total}/></td></tr>)}</tbody></table></div><details><summary>Ver documentos originales importados</summary><div className="f29-table-wrap"><table><thead><tr><th>Tipo</th><th>Folio</th><th>Fecha</th><th>Razón social</th><th>Exento</th><th>Neto</th><th>IVA</th><th>Total</th></tr></thead><tbody>{source.rows.map((row: Row) => <tr key={`${row.code}|${row.rut}|${row.folio}`}><td>{row.code}</td><td>{row.folio}</td><td>{row.date}</td><td>{row.name}</td><td><Amount value={row.exempt}/></td><td><Amount value={row.net}/></td><td><Amount value={row.iva}/></td><td><Amount value={row.total}/></td></tr>)}</tbody></table></div></details></>}</section>; }
function ClientForm({ client, save }: {
    client: Client | 'new';
    save: (c: Client) => void;
}) { const [name, setName] = useState(client === 'new' ? '' : client.name), [rut, setRut] = useState(client === 'new' ? '' : client.rut), [error, setError] = useState(''); return <form className="f29" onSubmit={e => { e.preventDefault(); try {
    save({ id: client === 'new' ? crypto.randomUUID() : client.id, name, rut });
}
catch (e) {
    setError(String(e));
} }}><label>Contribuyente<input required maxLength={200} value={name} onChange={e => setName(e.target.value)}/></label><label>RUT<input required disabled={client !== 'new'} value={rut} onChange={e => setRut(e.target.value)} placeholder="78239603-K"/></label>{error && <p role="alert">{error}</p>}<button type="submit" className="f29-primary">Guardar cliente</button></form>; }
function ReportPreview({ client, p }: {
    client: Client;
    p: Projection;
}) { const ref = useRef<HTMLDivElement>(null), [error, setError] = useState(''); useEffect(() => { try {
    const canvas = reportCanvas(client, p);
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.setAttribute('aria-label', `Informe F29 de ${client.name}`);
    ref.current?.replaceChildren(canvas);
}
catch (e) {
    queueMicrotask(() => setError(String(e)));
} }, [client, p]); return <>{error && <p role="alert">{error}</p>}<div ref={ref} className="f29-report-preview"/></>; }

function Amount({value}: {value: number}) { return <span className={value < 0 ? "f29-negative" : undefined}>{money(value)}</span>; }

