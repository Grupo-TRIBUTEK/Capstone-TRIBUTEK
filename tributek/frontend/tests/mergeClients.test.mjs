import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeClients} from '../app/components/ficha/mergeClients.ts';
const data={version:1,revision:'a',clients:[{id:'1',name:'Anterior',phone:'',note:'Conservar',documentUrl:'https://example.org'}],months:[{period:'2026-09'}],payments:[{id:'p'}]};
test('importa existentes y conserva notas períodos y abonos',()=>{const result=mergeClients(data,[{id:'1',nombreRazonSocial:'Nuevo'},{id:'2',nombreRazonSocial:'Segundo'}]);assert.equal(result.clients.length,2);assert.equal(result.clients[0].note,'Conservar');assert.equal(result.clients[0].documentUrl,'https://example.org');assert.equal(result.months,data.months);assert.equal(result.payments,data.payments);assert.equal(data.clients[0].name,'Anterior');});
test('repetir no duplica ni provoca otra escritura',()=>{const result=mergeClients(data,[{id:'1',nombreRazonSocial:'Anterior'}]);assert.equal(result,data);});
test('una lista vacía no borra fichas locales',()=>assert.equal(mergeClients(data,[]),data));
test('rechaza respuesta inválida antes de escribir',()=>{assert.throws(()=>mergeClients(data,[{id:'2',nombreRazonSocial:'Nuevo'},{id:'2',nombreRazonSocial:'Duplicado'}]));assert.equal(data.clients.length,1);});
