#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/f1276e92860a884edb9b6fa4c7cda59bd673008087c8823800da08a4c567d111/contract';
import endContract from '../../snapshots/f1276e92860a884edb9b6fa4c7cda59bd673008087c8823800da08a4c567d111/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'auditoria',
        columns: [
          col('accion', 'character varying(80)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 80 } },
          }),
          col('creado_en', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('detalle', 'character varying(1000)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 1000 } },
          }),
          col('entidad', 'character varying(80)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 80 } },
          }),
          col('entidad_id', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('usuario_id', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'cliente_servicio',
        columns: [
          col('cliente_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('estado', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('fecha_inicio', 'date', { codecRef: { codecId: 'pg/date-temporal@1' } }),
          col('fecha_termino', 'date', { codecRef: { codecId: 'pg/date-temporal@1' } }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('servicio_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'clientes',
        columns: [
          col('actualizado_en', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('contacto_principal', 'character varying(120)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 120 } },
          }),
          col('creado_en', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('direccion', 'character varying(250)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 250 } },
          }),
          col('email_contacto', 'character varying(150)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 150 } },
          }),
          col('estado', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('nombre_razon_social', 'character varying(180)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 180 } },
          }),
          col('rut', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('telefono', 'character varying(30)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('tipo_cliente', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'documentos',
        columns: [
          col('cargado_en', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('cargado_por', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('cliente_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('estado', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('mime_type', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('nombre_archivo', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('observacion', 'character varying(1000)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 1000 } },
          }),
          col('periodo_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('tamano_bytes', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('tipo_documento_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('url_archivo', 'character varying(500)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
          }),
          col('visible_cliente', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'gestiones',
        columns: [
          col('actualizado_en', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('cliente_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('creado_en', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('creado_por', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
          col('descripcion', 'character varying(1000)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 1000 } },
          }),
          col('estado', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('fecha_vencimiento', 'date', { codecRef: { codecId: 'pg/date-temporal@1' } }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('periodo_id', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
          col('responsable_id', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
          col('servicio_id', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
          col('tipo', 'character varying(80)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 80 } },
          }),
          col('titulo', 'character varying(180)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 180 } },
          }),
          col('visible_cliente', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'periodos_cliente',
        columns: [
          col('anio', 'int2', { notNull: true, codecRef: { codecId: 'pg/int2@1' } }),
          col('cerrado', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('cliente_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('creado_en', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('estado_contable', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('fecha_vencimiento', 'date', { codecRef: { codecId: 'pg/date-temporal@1' } }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('mes', 'int2', { notNull: true, codecRef: { codecId: 'pg/int2@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'proyecciones_f29',
        columns: [
          col('documento_generado', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
          col('estado', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('generado_en', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('generado_por', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('impuesto_estimado', 'numeric(14,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('iva_credito', 'numeric(14,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('iva_debito', 'numeric(14,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('periodo_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('ppm', 'numeric(14,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('remanente_anterior', 'numeric(14,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('retenciones', 'numeric(14,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('revisado_por', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
          col('total_estimado', 'numeric(14,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('version', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'roles',
        columns: [
          col('descripcion', 'character varying(150)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 150 } },
          }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('nombre', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'servicios',
        columns: [
          col('activo', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('descripcion', 'character varying(250)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 250 } },
          }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('nombre', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'tipos_documento',
        columns: [
          col('activo', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('area', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('descripcion', 'character varying(250)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 250 } },
          }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('nombre', 'character varying(140)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 140 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'trabajadores',
        columns: [
          col('cargo', 'character varying(120)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 120 } },
          }),
          col('cliente_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('creado_en', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('estado', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('fecha_ingreso', 'date', {
            notNull: true,
            codecRef: { codecId: 'pg/date-temporal@1' },
          }),
          col('fecha_termino', 'date', { codecRef: { codecId: 'pg/date-temporal@1' } }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('nombre', 'character varying(150)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 150 } },
          }),
          col('rut', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'transacciones',
        columns: [
          col('categoria', 'character varying(100)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('cliente_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('creado_en', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('creado_por', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
          col('descripcion', 'character varying(300)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 300 } },
          }),
          col('direccion', 'character varying(15)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 15 } },
          }),
          col('estado_revision', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('fecha', 'date', { notNull: true, codecRef: { codecId: 'pg/date-temporal@1' } }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('iva', 'numeric(14,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('monto_exento', 'numeric(14,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('monto_neto', 'numeric(14,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('monto_total', 'numeric(14,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('observacion', 'character varying(1000)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 1000 } },
          }),
          col('periodo_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('revisado_en', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('revisado_por', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'usuario_cliente',
        columns: [
          col('cliente_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('es_principal', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('usuario_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
        ],
        constraints: [primaryKey(['usuario_id', 'cliente_id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'usuarios',
        columns: [
          col('activo', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('actualizado_en', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('creado_en', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('email', 'character varying(150)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 150 } },
          }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('nombre', 'character varying(120)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 120 } },
          }),
          col('nombre_usuario', 'character varying(80)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 80 } },
          }),
          col('password_hash', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('rol_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'cliente_servicio',
        constraint: 'cliente_servicio_cliente_id_servicio_id_key',
        columns: ['cliente_id', 'servicio_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'clientes',
        constraint: 'clientes_rut_key',
        columns: ['rut'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'periodos_cliente',
        constraint: 'periodos_cliente_cliente_id_anio_mes_key',
        columns: ['cliente_id', 'anio', 'mes'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'roles',
        constraint: 'roles_nombre_key',
        columns: ['nombre'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'servicios',
        constraint: 'servicios_nombre_key',
        columns: ['nombre'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'tipos_documento',
        constraint: 'tipos_documento_nombre_key',
        columns: ['nombre'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'usuarios',
        constraint: 'usuarios_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'usuarios',
        constraint: 'usuarios_nombre_usuario_key',
        columns: ['nombre_usuario'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditoria',
        index: 'auditoria_usuario_id_idx_65b6616a',
        columns: ['usuario_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'cliente_servicio',
        index: 'cliente_servicio_cliente_id_idx_9196b84e',
        columns: ['cliente_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'cliente_servicio',
        index: 'cliente_servicio_servicio_id_idx_857c9d89',
        columns: ['servicio_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'documentos',
        index: 'documentos_cargado_por_idx_895d3a3b',
        columns: ['cargado_por'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'documentos',
        index: 'documentos_cliente_id_idx_9196b84e',
        columns: ['cliente_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'documentos',
        index: 'documentos_periodo_id_idx_0aa2ba5e',
        columns: ['periodo_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'documentos',
        index: 'documentos_tipo_documento_id_idx_73afd756',
        columns: ['tipo_documento_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'gestiones',
        index: 'gestiones_cliente_id_idx_9196b84e',
        columns: ['cliente_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'gestiones',
        index: 'gestiones_creado_por_idx_c3810b44',
        columns: ['creado_por'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'gestiones',
        index: 'gestiones_periodo_id_idx_0aa2ba5e',
        columns: ['periodo_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'gestiones',
        index: 'gestiones_responsable_id_idx_24040e21',
        columns: ['responsable_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'gestiones',
        index: 'gestiones_servicio_id_idx_857c9d89',
        columns: ['servicio_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'periodos_cliente',
        index: 'periodos_cliente_cliente_id_idx_9196b84e',
        columns: ['cliente_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'proyecciones_f29',
        index: 'proyecciones_f29_documento_generado_idx_5af819a0',
        columns: ['documento_generado'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'proyecciones_f29',
        index: 'proyecciones_f29_generado_por_idx_abeb8a78',
        columns: ['generado_por'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'proyecciones_f29',
        index: 'proyecciones_f29_periodo_id_idx_0aa2ba5e',
        columns: ['periodo_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'proyecciones_f29',
        index: 'proyecciones_f29_revisado_por_idx_d61c6583',
        columns: ['revisado_por'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'trabajadores',
        index: 'trabajadores_cliente_id_idx_9196b84e',
        columns: ['cliente_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'transacciones',
        index: 'transacciones_cliente_id_idx_9196b84e',
        columns: ['cliente_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'transacciones',
        index: 'transacciones_periodo_id_idx_0aa2ba5e',
        columns: ['periodo_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'transacciones',
        index: 'transacciones_revisado_por_idx_d61c6583',
        columns: ['revisado_por'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'usuario_cliente',
        index: 'usuario_cliente_cliente_id_idx_9196b84e',
        columns: ['cliente_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'usuario_cliente',
        index: 'usuario_cliente_usuario_id_idx_65b6616a',
        columns: ['usuario_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'usuarios',
        index: 'usuarios_rol_id_idx_369fac19',
        columns: ['rol_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'auditoria',
        foreignKey: {
          name: 'auditoria_usuario_id_fkey',
          columns: ['usuario_id'],
          references: { schema: 'public', table: 'usuarios', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'cliente_servicio',
        foreignKey: {
          name: 'cliente_servicio_cliente_id_fkey',
          columns: ['cliente_id'],
          references: { schema: 'public', table: 'clientes', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'cliente_servicio',
        foreignKey: {
          name: 'cliente_servicio_servicio_id_fkey',
          columns: ['servicio_id'],
          references: { schema: 'public', table: 'servicios', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'documentos',
        foreignKey: {
          name: 'documentos_cliente_id_fkey',
          columns: ['cliente_id'],
          references: { schema: 'public', table: 'clientes', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'documentos',
        foreignKey: {
          name: 'documentos_periodo_id_fkey',
          columns: ['periodo_id'],
          references: { schema: 'public', table: 'periodos_cliente', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'documentos',
        foreignKey: {
          name: 'documentos_tipo_documento_id_fkey',
          columns: ['tipo_documento_id'],
          references: { schema: 'public', table: 'tipos_documento', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'documentos',
        foreignKey: {
          name: 'documentos_cargado_por_fkey',
          columns: ['cargado_por'],
          references: { schema: 'public', table: 'usuarios', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'gestiones',
        foreignKey: {
          name: 'gestiones_cliente_id_fkey',
          columns: ['cliente_id'],
          references: { schema: 'public', table: 'clientes', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'gestiones',
        foreignKey: {
          name: 'gestiones_servicio_id_fkey',
          columns: ['servicio_id'],
          references: { schema: 'public', table: 'servicios', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'gestiones',
        foreignKey: {
          name: 'gestiones_periodo_id_fkey',
          columns: ['periodo_id'],
          references: { schema: 'public', table: 'periodos_cliente', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'gestiones',
        foreignKey: {
          name: 'gestiones_responsable_id_fkey',
          columns: ['responsable_id'],
          references: { schema: 'public', table: 'usuarios', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'gestiones',
        foreignKey: {
          name: 'gestiones_creado_por_fkey',
          columns: ['creado_por'],
          references: { schema: 'public', table: 'usuarios', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'periodos_cliente',
        foreignKey: {
          name: 'periodos_cliente_cliente_id_fkey',
          columns: ['cliente_id'],
          references: { schema: 'public', table: 'clientes', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'proyecciones_f29',
        foreignKey: {
          name: 'proyecciones_f29_periodo_id_fkey',
          columns: ['periodo_id'],
          references: { schema: 'public', table: 'periodos_cliente', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'proyecciones_f29',
        foreignKey: {
          name: 'proyecciones_f29_generado_por_fkey',
          columns: ['generado_por'],
          references: { schema: 'public', table: 'usuarios', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'proyecciones_f29',
        foreignKey: {
          name: 'proyecciones_f29_revisado_por_fkey',
          columns: ['revisado_por'],
          references: { schema: 'public', table: 'usuarios', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'proyecciones_f29',
        foreignKey: {
          name: 'proyecciones_f29_documento_generado_fkey',
          columns: ['documento_generado'],
          references: { schema: 'public', table: 'documentos', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'trabajadores',
        foreignKey: {
          name: 'trabajadores_cliente_id_fkey',
          columns: ['cliente_id'],
          references: { schema: 'public', table: 'clientes', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'transacciones',
        foreignKey: {
          name: 'transacciones_cliente_id_fkey',
          columns: ['cliente_id'],
          references: { schema: 'public', table: 'clientes', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'transacciones',
        foreignKey: {
          name: 'transacciones_periodo_id_fkey',
          columns: ['periodo_id'],
          references: { schema: 'public', table: 'periodos_cliente', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'transacciones',
        foreignKey: {
          name: 'transacciones_revisado_por_fkey',
          columns: ['revisado_por'],
          references: { schema: 'public', table: 'usuarios', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'usuario_cliente',
        foreignKey: {
          name: 'usuario_cliente_usuario_id_fkey',
          columns: ['usuario_id'],
          references: { schema: 'public', table: 'usuarios', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'usuario_cliente',
        foreignKey: {
          name: 'usuario_cliente_cliente_id_fkey',
          columns: ['cliente_id'],
          references: { schema: 'public', table: 'clientes', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'usuarios',
        foreignKey: {
          name: 'usuarios_rol_id_fkey',
          columns: ['rol_id'],
          references: { schema: 'public', table: 'roles', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
