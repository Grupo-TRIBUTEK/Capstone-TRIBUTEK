#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4ba31f9318f70b4f508861502d42928c9dbcf0494a7cb1b1fd1466f59eb5c5eb/contract';
import endContract from '../../snapshots/4ba31f9318f70b4f508861502d42928c9dbcf0494a7cb1b1fd1466f59eb5c5eb/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f1276e92860a884edb9b6fa4c7cda59bd673008087c8823800da08a4c567d111/contract';
import startContract from '../../snapshots/f1276e92860a884edb9b6fa4c7cda59bd673008087c8823800da08a4c567d111/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'gestiones',
        column: col('fecha', 'date', { codecRef: { codecId: 'pg/date-temporal@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'gestiones',
        column: col('orden', 'int2', { codecRef: { codecId: 'pg/int2@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'gestiones',
        column: col('parent_id', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'gestiones',
        index: 'gestiones_parent_id_idx_ab33b399',
        columns: ['parent_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'gestiones',
        foreignKey: {
          name: 'gestiones_parent_id_fkey',
          columns: ['parent_id'],
          references: { schema: 'public', table: 'gestiones', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
