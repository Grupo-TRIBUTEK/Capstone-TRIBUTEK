#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/133c29c377e212851318dae6fb924a259bf755f950b55fa3a40739559e34673a/contract';
import startContract from '../../snapshots/133c29c377e212851318dae6fb924a259bf755f950b55fa3a40739559e34673a/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d8445047d45ca198adf184c27a3a780c021cf626a55e17470ef1f7372a447582/contract';
import endContract from '../../snapshots/d8445047d45ca198adf184c27a3a780c021cf626a55e17470ef1f7372a447582/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'facturas',
        columns: [
          col('anio', 'int2', { notNull: true, codecRef: { codecId: 'pg/int2@1' } }),
          col('cliente_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('creado_en', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('descripcion', 'character varying(300)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 300 } },
          }),
          col('fecha', 'date', { codecRef: { codecId: 'pg/date-temporal@1' } }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('mes', 'int2', { notNull: true, codecRef: { codecId: 'pg/int2@1' } }),
          col('monto', 'numeric(14,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('nombre', 'character varying(180)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 180 } },
          }),
          col('nota', 'character varying(1000)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 1000 } },
          }),
          col('numero', 'character varying(30)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('rut', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('tipo', 'character varying(10)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 10 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'postergaciones_mes',
        columns: [
          col('anio', 'int2', { notNull: true, codecRef: { codecId: 'pg/int2@1' } }),
          col('cliente_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('concepto', 'character varying(60)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 60 } },
          }),
          col('creado_en', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('mes', 'int2', { notNull: true, codecRef: { codecId: 'pg/int2@1' } }),
          col('monto', 'numeric(14,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('nota', 'character varying(500)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
          }),
          col('vencimiento', 'date', {
            notNull: true,
            codecRef: { codecId: 'pg/date-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'abonos_mes',
        column: col('cuenta_destino', 'character varying(200)', {
          codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 200 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'abonos_mes',
        column: col('cuenta_origen', 'character varying(200)', {
          codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 200 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'abonos_mes',
        column: col('destino', 'character varying(20)', {
          codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'abonos_mes',
        column: col('metodo', 'character varying(30)', {
          codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'abonos_mes',
        column: col('postergacion_id', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'abonos_mes',
        column: col('transfer_id', 'character varying(255)', {
          codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'abonos_mes',
        index: 'abonos_mes_postergacion_id_idx_b60c6cc9',
        columns: ['postergacion_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'facturas',
        index: 'facturas_cliente_id_idx_9196b84e',
        columns: ['cliente_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'postergaciones_mes',
        index: 'postergaciones_mes_cliente_id_idx_9196b84e',
        columns: ['cliente_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'facturas',
        foreignKey: {
          name: 'facturas_cliente_id_fkey',
          columns: ['cliente_id'],
          references: { schema: 'public', table: 'clientes', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'postergaciones_mes',
        foreignKey: {
          name: 'postergaciones_mes_cliente_id_fkey',
          columns: ['cliente_id'],
          references: { schema: 'public', table: 'clientes', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'abonos_mes',
        foreignKey: {
          name: 'abonos_mes_postergacion_id_fkey',
          columns: ['postergacion_id'],
          references: { schema: 'public', table: 'postergaciones_mes', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
