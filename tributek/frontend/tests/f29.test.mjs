import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const code = ts.transpileModule(readFileSync(new URL('../app/components/f29/model.ts', import.meta.url), 'utf8'), {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText;
const m = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const header = kind => `Tipo Doc;${kind === 'sales' ? 'Rut cliente' : 'RUT Proveedor'};Razon Social;Folio;Fecha Docto;Monto Exento;Monto Neto;${kind === 'sales' ? 'Monto IVA' : 'Monto IVA Recuperable'};Monto Total`;
const sample = (kind, lines) => m.parseRcv(header(kind) + '\r\n' + lines.join('\r\n'), kind, '2026-09');
const row = (code=33, net=50000, iva=9500, total=59500, folio='1') => `${code};77424695-9;Empresa de ejemplo;${folio};03/09/2026;0;${net};${iva};${total}`;
const source = result => ({...result, name:'prueba.csv', importedAt:'2026-09-26T12:00:00.000Z'});
test('referencia MARSEP: conserva netos exactos, remanente 26442 y otras obligaciones 150', () => {
 const p=m.newProjection('a','2026-09'); p.sales=source(sample('sales',[row()])); p.purchases=source(sample('purchases',[row(33,5437,1033,6470,'1'),row(33,183734,34909,218643,'2')]));
 const r=m.calculate(p); assert.equal(r.purchases.net,189171); assert.equal(r.credit,35942); assert.equal(r.remainder,26442); assert.equal(r.ppm,150); assert.equal(r.total,150);
 assert.match(m.message({name:'Ejemplo',rut:'78239603-K'},p),/Otras obligaciones estimadas a pagar:\*\n\$ 150/);
});
test('nota de crédito resta una vez tanto si CSV viene positivo como negativo',()=>{ for(const sign of [1,-1]) {const rows=sample('sales',[row(),row(61,10000*sign,1900*sign,11900*sign,'2')]).rows;assert.equal(m.sumRows(rows).iva,7600);assert.equal(m.sumRows(rows).net,40000);} });
test('débito, factura exenta, boleta y factura de compra se incluyen en los totales',()=>{const s=sample('sales',[row(56),row(34,0,0,5000,'2'),row(39,100,19,119,'3'),row(46,200,38,238,'4')]); assert.equal(m.sumRows(s.rows).iva,9557);});
test('rechaza duplicados, montos inválidos, columnas faltantes y tipos no soportados sin importar parcialmente',()=>{ assert.throws(()=>sample('sales',[row(),row()]),/duplicado/);assert.throws(()=>sample('sales',[row(33,'oops')]),/Monto inválido/);assert.throws(()=>m.parseRcv('Tipo Doc;Folio\n33;1','sales','2026-09'),/Falta la columna/);assert.throws(()=>sample('sales',[row(999)]),/no contemplado/); });
test('parser preserva delimitadores, saltos y comillas dentro de una razón social',()=>{assert.deepEqual(m.csvRows('a;b\r\n"Empresa; \"\"Sur\"\"\nSpA";2'),[['a','b'],['Empresa; "Sur"\nSpA','2']]);assert.throws(()=>m.csvRows('a;b\n"hola;2'),/comillas/);});
test('acuse/fechas de otro mes se informan sin confundir fecha de emisión con período RCV',()=>{assert.equal(sample('sales',[row().replace('03/09/2026','03/08/2026')]).warnings.length,1); assert.throws(()=>sample('sales',[row().replace('03/09/2026','31/02/2026')]),/Fecha inválida/);});
test('PPM recalcula por tasa y comprobante; ajuste manual cero es válido',()=>{const p=m.newProjection('a','2026-09');p.manual.voucherNet=100000;p.ppmRate=1;let r=m.calculate(p);assert.equal(r.debit,19000);assert.equal(r.ppm,1000);p.ppmOverride=0;assert.equal(m.calculate(p).ppm,0);p.ppmOverride=null;assert.equal(m.calculate(p).ppm,1000);});
test('remanente no cancela honorarios, cotizaciones u otras obligaciones',()=>{const p=m.newProjection('a','2026-09');p.manual.previousCredit=1093832;p.purchases=source(sample('purchases',[row(33,203374,38641,242015)]));p.manual.fees=15000;const r=m.calculate(p);assert.equal(r.remainder,1132473);assert.equal(r.total,15000);});
test('asocia por RUT/período completo o cuerpo; jamás por razón social o substring',()=>{const c={id:'a',name:'Renombrado',rut:'78239603-K'};assert.equal(m.matchesFile('RCV_VENTA_78239603-K_202609.csv',c,'2026-09'),true);assert.equal(m.matchesFile('RCV_VENTA_78239603_202609.csv',c,'2026-09'),true);assert.equal(m.matchesFile('RCV_VENTA_78239603-K_202608.csv',c,'2026-09'),false);assert.equal(m.matchesFile('RCV_VENTA_178239603-K_202609.csv',c,'2026-09'),false);});
test('nuevo mes limpia importes y conserva el anterior; respaldo valida referencias y duplicados',()=>{const c={id:'a',name:'Prueba',rut:'78239603-K'},old=m.newProjection('a','2026-09');old.manual.fees=15000;const next=m.newProjection('a','2026-10');const db={version:1,revision:'r',clients:[c],projections:[old,next]};assert.equal(m.validateDatabase(JSON.parse(JSON.stringify(db))).projections[0].manual.fees,15000);assert.equal(next.manual.fees,0);assert.throws(()=>m.validateDatabase({...db,projections:[old,old]}),/inválida/);assert.throws(()=>m.validateDatabase({...db,clients:[c,c]}),/duplicado/);});
test('agrupa por RUT y no mezcla empresas con igual nombre',()=>{const rows=sample('sales',[row(),row(33,100,19,119,'2').replace('77424695-9','96792430-K')]).rows;assert.equal(m.associated(rows).length,2);});
test('líneas adicionales de otros impuestos no duplican un documento RCV',()=>{const text='Nro;'+header('purchases')+';Valor Otro Impuesto\n1;'+row(33,42718,8116,52373,'58605887')+';660\n;33;77424695-9;Empresa de ejemplo;58605887;03/09/2026;;;;;879'; const p=m.parseRcv(text,'purchases','2026-09');assert.equal(p.rows.length,1);assert.equal(m.sumRows(p.rows).iva,8116);assert.equal(m.sumRows(p.rows).total,52373);assert.ok(p.warnings.some(w=>w.includes('línea adicional')));});
test('respaldo rechaza montos de texto y signos que cambiarían una nota de crédito',()=>{const p=m.newProjection('a','2026-09');p.sales=source(sample('sales',[row()]));const db={version:1,revision:'',clients:[{id:'a',name:'Ejemplo',rut:'78239603-K'}],projections:[p]};p.sales.rows[0].net='50000';assert.throws(()=>m.validateDatabase(db),/inválido/);p.sales.rows[0].net=-50000;assert.throws(()=>m.validateDatabase(db),/inválido/);});
test('persistencia verifica revisión entre pestañas y conserva todos los meses',async()=>{const modelUrl='data:text/javascript;base64,'+Buffer.from(code).toString('base64');const storageCode=ts.transpileModule(readFileSync(new URL('../app/components/f29/storage.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace('from \'./model\'',`from '${modelUrl}'`);const storage=await import('data:text/javascript;base64,'+Buffer.from(storageCode).toString('base64'));const values=new Map();globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}; const first=storage.writeDatabase({...m.emptyDatabase},'');assert.equal(storage.readDatabase().revision,first.revision);assert.throws(()=>storage.writeDatabase(first,''),/otra pestaña/);delete globalThis.localStorage;});

const modelUrl = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
const rcvCode = ts.transpileModule(readFileSync(new URL('../app/components/f29/rcv.ts', import.meta.url), 'utf8'), {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace("from './model'", `from '${modelUrl}'`);
const { importRcv } = await import('data:text/javascript;base64,' + Buffer.from(rcvCode).toString('base64'));
const client = {id:'a', name:'Cliente de prueba', rut:'78239603-K'};
const file = (kind, content, period='202609') => new File([content], `RCV_${kind === 'sales' ? 'VENTA' : 'COMPRA_REGISTRO'}_${client.rut}_${period}.csv`);
test('importar compras desde un borrador conserva manuales, PPM y ventas sin duplicar', async()=>{
 const p=m.newProjection('a','2026-09');p.sales=source(sample('sales',[row()]));p.manual.previousCredit=1234;p.manual.fees=15000;p.ppmOverride=0;p.reviewed=true;
 const csv=file('purchases',header('purchases')+'\n'+row(33,10000,1900,11900));
 const result=await importRcv(p,client,[csv]);assert.equal(result.manual.fees,15000);assert.equal(result.manual.previousCredit,1234);assert.equal(result.ppmOverride,0);assert.deepEqual(result.sales,p.sales);assert.equal(result.reviewed,false);assert.equal(p.purchases,undefined);
 const again=await importRcv(result,client,[csv]);assert.equal(again.purchases.rows.length,1);
});
test('RCV inválido o de otro período no modifica el borrador aunque ventas sean válidas',async()=>{
 const p=m.newProjection('a','2026-09');p.manual.fees=15000;const before=JSON.stringify(p);
 await assert.rejects(importRcv(p,client,[file('sales',header('sales')+'\n'+row()),file('purchases','inválido')]),/columna/);
 assert.equal(JSON.stringify(p),before);
 await assert.rejects(importRcv(p,client,[file('sales',header('sales')+'\n'+row(),'202608')]),/período/);
 assert.equal(JSON.stringify(p),before);
});
test('mensaje de impuesto replica la estructura solicitada sin identidad y usa compras netas',()=>{
 const p=m.newProjection('a','2026-09');p.manual.voucherNet=800000;p.manual.previousCredit=127910;p.manual.fees=15000;
 const value=m.message(client,p);assert.match(value,/\*Valor aproximado a pagar el próximo mes:\*\n\$ 41.490/);assert.match(value,/\$ 126.789/);assert.ok(!value.includes(client.name));assert.ok(!value.includes(client.rut));assert.ok(!value.includes('septiembre'));
});
test('mensaje de remanente no recomienda compras y conserva obligaciones; cero no promete devolución',()=>{
 const p=m.newProjection('a','2026-09');p.manual.previousCredit=20000;p.manual.fees=15000;let value=m.message(client,p);
 assert.match(value,/remanente de crédito fiscal/);assert.match(value,/Otras obligaciones estimadas a pagar:\*\n\$ 15.000/);assert.ok(!value.includes('compras con factura recomendado'));
 p.manual.previousCredit=0;value=m.message(client,p);assert.match(value,/No se genera IVA a pagar/);assert.ok(!value.includes('remanente de crédito fiscal'));
});
