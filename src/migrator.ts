import * as path from 'path';
import * as fs from 'fs';

import { DatabasePool, createSqlTag } from 'slonik';
import { raw } from 'slonik-sql-tag-raw';
import { z } from 'zod';

type MigratorOptions = {
  pool: DatabasePool;
  migrationsPath: string;
};

type MigrationFile = {
  id: string;
  path: string;
};

type Migration = {
  id: string;
  query: string;
};

const sql = createSqlTag({
  typeAliases: { count: z.object({ count: z.number() }) },
});

class Migrator {
  protected pool: DatabasePool;
  protected migrationsPath: string;

  constructor(options: MigratorOptions) {
    this.pool = options.pool;
    this.migrationsPath = options.migrationsPath;
  }

  async migrate(): Promise<void> {
    await this.createMigrationsTable();
    const migrations = await this.pendingMigrations();

    for (const migration of migrations) {
      await this.runMigration(migration);
    }
  }

  private async createMigrationsTable(): Promise<void> {
    await this.pool.query(sql.unsafe`
      CREATE TABLE IF NOT EXISTS migrations (
        id CHAR(3) NOT NULL PRIMARY KEY,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`);
  }

  private migrationFiles(): MigrationFile[] {
    const pattern = /^(?<id>[0-9]{3})(?:\S+)\.sql$/;
    const files = fs.readdirSync(this.migrationsPath);

    return files
      .filter((file) => file.match(pattern))
      .map((file) => {
        const match = file.match(pattern)!;
        const { id } = match.groups!;

        return { id, path: path.resolve(this.migrationsPath, file) };
      })
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  private async pendingMigrations(): Promise<Migration[]> {
    const pending: Migration[] = [];

    for (const migrationFile of this.migrationFiles()) {
      const hasMigrationBeenRun = await this.hasMigrationBeenRun(
        migrationFile.id
      );

      if (!hasMigrationBeenRun) {
        pending.push({
          id: migrationFile.id,
          query: fs.readFileSync(migrationFile.path).toString(),
        });
      }
    }

    return pending;
  }

  private async hasMigrationBeenRun(id: string): Promise<boolean> {
    const query = sql.typeAlias(
      'count'
    )`SELECT COUNT(*) AS count FROM migrations WHERE id = ${id}`;

    const count = await this.pool.oneFirst(query);

    return count !== 0;
  }

  private async runMigration(migration: Migration): Promise<void> {
    await this.pool.transaction(async (transaction) => {
      await transaction.query(sql.unsafe`${raw(migration.query)}`);
      await transaction.query(
        sql.unsafe`INSERT INTO migrations (id) VALUES (${migration.id})`
      );
    });
  }
}

export { MigratorOptions, Migrator };
