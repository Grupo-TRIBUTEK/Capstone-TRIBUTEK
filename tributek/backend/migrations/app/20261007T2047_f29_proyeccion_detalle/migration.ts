#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4ba31f9318f70b4f508861502d42928c9dbcf0494a7cb1b1fd1466f59eb5c5eb/contract';
import startContract from '../../snapshots/4ba31f9318f70b4f508861502d42928c9dbcf0494a7cb1b1fd1466f59eb5c5eb/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f45e32ff1341dba7ce3eaba21c82e5c7f32e5a5f22b716848015e6717b66f6e3/contract';
import endContract from '../../snapshots/f45e32ff1341dba7ce3eaba21c82e5c7f32e5a5f22b716848015e6717b66f6e3/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  primaryKey,
} from '@prisma/orm-postgres/migration';
import postgresStatic from '@prisma/orm-postgres/static';

// Builder offline (sin conexión) ligado al contrato final. Los closures de
// `dataTransform` construyen sus query-plans contra `endContract`, y el
// framework valida que `plan.meta.storageHash` coincida con el del contrato.
const { sql, contract: staticContract } = postgresStatic({ contractJson: endContract });
const proyeccionesF29 = sql['public']['proyecciones_f29'];

// Backfill genérico para una columna nueva NOT NULL: `check` marca las filas
// aún NULL (el runner lo envuelve en EXISTS/NOT EXISTS, así que debe devolver
// un rowset, nunca un agregado) y `run` las rellena con `value`.
const backfillColumn = (column: string, value: string) => ({
  check: () =>
    proyeccionesF29.select('id').where((f, fns) => fns.eq(f[column], null)).limit(1),
  run: () =>
    proyeccionesF29
      .update({ [column]: value })
      .where((f, fns) => fns.eq(f[column], null)),
});

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropIndex({
        schema: 'public',
        table: 'proyecciones_f29',
        index: 'proyecciones_f29_periodo_id_idx_0aa2ba5e',
      }),
      this.createTable({
        schema: 'public',
        table: 'f29_movimientos',
        columns: [
          col('codigo_documento', 'int2', { notNull: true, codecRef: { codecId: 'pg/int2@1' } }),
          col('exento', 'numeric(14,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('fecha', 'character varying(10)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 10 } },
          }),
          col('folio', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('iva', 'numeric(14,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('neto', 'numeric(14,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('nombre', 'character varying(200)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 200 } },
          }),
          col('orden', 'int2', { notNull: true, codecRef: { codecId: 'pg/int2@1' } }),
          col('proyeccion_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('rut', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('tipo', 'character varying(10)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 10 } },
          }),
          col('total', 'numeric(14,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'proyecciones_f29',
        column: col('compras_fuente', 'character varying(255)', {
          codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'proyecciones_f29',
        column: col('ppm_monto_manual', 'numeric(14,2)', {
          codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'proyecciones_f29',
        column: col('ventas_fuente', 'character varying(255)', {
          codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'proyecciones_f29',
        column: col('cotizaciones', 'numeric(14,2)', {
          codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
        }),
      }),
      this.dataTransform(
        staticContract,
        'backfill-proyecciones_f29-cotizaciones',
        backfillColumn('cotizaciones', '0.00'),
      ),
      this.setNotNull({ schema: 'public', table: 'proyecciones_f29', column: 'cotizaciones' }),
      this.addColumn({
        schema: 'public',
        table: 'proyecciones_f29',
        column: col('honorarios', 'numeric(14,2)', {
          codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
        }),
      }),
      this.dataTransform(
        staticContract,
        'backfill-proyecciones_f29-honorarios',
        backfillColumn('honorarios', '0.00'),
      ),
      this.setNotNull({ schema: 'public', table: 'proyecciones_f29', column: 'honorarios' }),
      this.addColumn({
        schema: 'public',
        table: 'proyecciones_f29',
        column: col('impuesto_unico', 'numeric(14,2)', {
          codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
        }),
      }),
      this.dataTransform(
        staticContract,
        'backfill-proyecciones_f29-impuesto_unico',
        backfillColumn('impuesto_unico', '0.00'),
      ),
      this.setNotNull({ schema: 'public', table: 'proyecciones_f29', column: 'impuesto_unico' }),
      this.addColumn({
        schema: 'public',
        table: 'proyecciones_f29',
        column: col('iva_importacion', 'numeric(14,2)', {
          codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
        }),
      }),
      this.dataTransform(
        staticContract,
        'backfill-proyecciones_f29-iva_importacion',
        backfillColumn('iva_importacion', '0.00'),
      ),
      this.setNotNull({ schema: 'public', table: 'proyecciones_f29', column: 'iva_importacion' }),
      this.addColumn({
        schema: 'public',
        table: 'proyecciones_f29',
        column: col('neto_voucher', 'numeric(14,2)', {
          codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
        }),
      }),
      this.dataTransform(
        staticContract,
        'backfill-proyecciones_f29-neto_voucher',
        backfillColumn('neto_voucher', '0.00'),
      ),
      this.setNotNull({ schema: 'public', table: 'proyecciones_f29', column: 'neto_voucher' }),
      this.addColumn({
        schema: 'public',
        table: 'proyecciones_f29',
        column: col('ppm_tasa', 'numeric(6,3)', {
          codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 6, scale: 3 } },
        }),
      }),
      this.dataTransform(
        staticContract,
        'backfill-proyecciones_f29-ppm_tasa',
        backfillColumn('ppm_tasa', '0.000'),
      ),
      this.setNotNull({ schema: 'public', table: 'proyecciones_f29', column: 'ppm_tasa' }),
      this.addColumn({
        schema: 'public',
        table: 'proyecciones_f29',
        column: col('prestamo_honorarios', 'numeric(14,2)', {
          codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
        }),
      }),
      this.dataTransform(
        staticContract,
        'backfill-proyecciones_f29-prestamo_honorarios',
        backfillColumn('prestamo_honorarios', '0.00'),
      ),
      this.setNotNull({
        schema: 'public',
        table: 'proyecciones_f29',
        column: 'prestamo_honorarios',
      }),
      this.addColumn({
        schema: 'public',
        table: 'proyecciones_f29',
        column: col('prestamo_remuneraciones', 'numeric(14,2)', {
          codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
        }),
      }),
      this.dataTransform(
        staticContract,
        'backfill-proyecciones_f29-prestamo_remuneraciones',
        backfillColumn('prestamo_remuneraciones', '0.00'),
      ),
      this.setNotNull({
        schema: 'public',
        table: 'proyecciones_f29',
        column: 'prestamo_remuneraciones',
      }),
      this.addColumn({
        schema: 'public',
        table: 'proyecciones_f29',
        column: col('retencion_honorarios', 'numeric(14,2)', {
          codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
        }),
      }),
      this.dataTransform(
        staticContract,
        'backfill-proyecciones_f29-retencion_honorarios',
        backfillColumn('retencion_honorarios', '0.00'),
      ),
      this.setNotNull({
        schema: 'public',
        table: 'proyecciones_f29',
        column: 'retencion_honorarios',
      }),
      this.addUnique({
        schema: 'public',
        table: 'proyecciones_f29',
        constraint: 'proyecciones_f29_periodo_id_key',
        columns: ['periodo_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'f29_movimientos',
        index: 'f29_movimientos_proyeccion_id_idx_c31ed0ff',
        columns: ['proyeccion_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'f29_movimientos',
        foreignKey: {
          name: 'f29_movimientos_proyeccion_id_fkey',
          columns: ['proyeccion_id'],
          references: { schema: 'public', table: 'proyecciones_f29', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
