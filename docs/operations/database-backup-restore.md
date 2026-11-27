# Database backup and restore operations

This application uses PostgreSQL. Configure backups in the deployment environment; this repository does not select a hosting provider or set a recovery point/recovery time objective.

## Backup

Schedule `pg_dump` through the managed database service or deployment scheduler. Store the output in encrypted, access-controlled storage outside the database host, retain backups according to the organization’s policy, and alert on failed or stale backups. Supply connection values through the scheduler’s secret store rather than placing credentials in scripts or command history.

Example for an operator with `DATABASE_URL` available from a secret store:

```sh
pg_dump --format=custom --no-owner --file="cityrider-$(date -u +%Y%m%dT%H%M%SZ).dump" "$DATABASE_URL"
```

## Restore

Restore into a separate/replacement database first, using credentials supplied by the secret store. A restore overwrites objects in the target database; verify the target before running it.

```sh
pg_restore --clean --if-exists --no-owner --dbname="$RESTORE_DATABASE_URL" backup.dump
```

After restoring, apply any pending Prisma migrations with the deployment’s normal migration process, verify application connectivity and a representative order/package/invoice record, and record the restore time and backup identifier. Do not use production credentials for a rehearsal restore.

## Deployment decisions

The service owner must set backup frequency, retention, encryption/key ownership, restore testing frequency, and recovery objectives for the selected hosting environment. Record those values in the deployment runbook; they cannot be guaranteed by application code alone.
