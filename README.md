# Slonik Migrator

Run sequential migration files against a PostgreSQL database.

## Installation

Create a [personal access token][token] with at least `read:packages`
permissions and configure NPM:

```
cat <<EOF >> .npmrc
@reagent:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=\${GITHUB_TOKEN}
EOF
```

Using your token, install the package:

```
$ GITHUB_TOKEN=<your token> yarn add @reagent/migrator
```

## Usage

Migration files need to start with 3 digits and end with a `.sql` suffix:

```
001_create_users.sql
```

Place your migrations in a directory and then build a runner that executes them:

```typescript
//
// src/db/migrator.ts
//
import path from 'path';
import { createPool } from 'slonik';
import { Migrator } from '@reagent/migrator';

const { DATABASE_URL } = process.env;

(async () => {
  const migrationsPath = path.resolve(__dirname, 'migrations');
  const pool = await createPool(DATABASE_URL);

  const migrator = new Migrator({ migrationsPath, pool });
  await migrator.migrate();
})();
```

You can run them with `ts-node` or tie them into your build process:

```
$ yarn ts-node src/db/migrator.ts
```

The migrator also supports logging with [`@reagent/logging`][@reagent/logging]
or a compatible logging interface:

```typescript
import { createLogger } from '@reagent/logging';

(async () => {
  // ...
  const logger = createLogger({ stdout: true });

  const migrator = new Migrator({ migrationsPath, pool, logger });
  await migrator.migrate();
})();
```

[token]: https://github.com/settings/tokens
[@reagent/logging]: https://github.com/reagent/logging
