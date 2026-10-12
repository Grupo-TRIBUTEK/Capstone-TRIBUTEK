#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/133c29c377e212851318dae6fb924a259bf755f950b55fa3a40739559e34673a/contract';
import endContract from '../../snapshots/133c29c377e212851318dae6fb924a259bf755f950b55fa3a40739559e34673a/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f45e32ff1341dba7ce3eaba21c82e5c7f32e5a5f22b716848015e6717b66f6e3/contract';
import startContract from '../../snapshots/f45e32ff1341dba7ce3eaba21c82e5c7f32e5a5f22b716848015e6717b66f6e3/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'abonos_mes',
        columns: [
          col('concepto', 'character varying(60)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 60 } },
          }),
          col('creado_en', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('fecha', 'date', { notNull: true, codecRef: { codecId: 'pg/date-temporal@1' } }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('mes_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('monto', 'numeric(14,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('nota', 'character varying(300)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 300 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'meses_cliente',
        columns: [
          col('actualizado_en', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('creado_en', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('enviado', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('periodo_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('seguimiento_fecha', 'date', { codecRef: { codecId: 'pg/date-temporal@1' } }),
          col('seguimiento_hecho', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('seguimiento_nota', 'character varying(500)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'montos_concepto',
        columns: [
          col('concepto', 'character varying(60)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 60 } },
          }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('mes_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('monto', 'numeric(14,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'pasos_mes',
        columns: [
          col('hecho', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('mes_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('orden', 'int2', { notNull: true, codecRef: { codecId: 'pg/int2@1' } }),
          col('texto', 'character varying(180)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 180 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'meses_cliente',
        constraint: 'meses_cliente_periodo_id_key',
        columns: ['periodo_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'montos_concepto',
        constraint: 'montos_concepto_mes_id_concepto_key',
        columns: ['mes_id', 'concepto'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'abonos_mes',
        index: 'abonos_mes_mes_id_idx_321dd52e',
        columns: ['mes_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'montos_concepto',
        index: 'montos_concepto_mes_id_idx_321dd52e',
        columns: ['mes_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'pasos_mes',
        index: 'pasos_mes_mes_id_idx_321dd52e',
        columns: ['mes_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'abonos_mes',
        foreignKey: {
          name: 'abonos_mes_mes_id_fkey',
          columns: ['mes_id'],
          references: { schema: 'public', table: 'meses_cliente', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'meses_cliente',
        foreignKey: {
          name: 'meses_cliente_periodo_id_fkey',
          columns: ['periodo_id'],
          references: { schema: 'public', table: 'periodos_cliente', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'montos_concepto',
        foreignKey: {
          name: 'montos_concepto_mes_id_fkey',
          columns: ['mes_id'],
          references: { schema: 'public', table: 'meses_cliente', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'pasos_mes',
        foreignKey: {
          name: 'pasos_mes_mes_id_fkey',
          columns: ['mes_id'],
          references: { schema: 'public', table: 'meses_cliente', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
