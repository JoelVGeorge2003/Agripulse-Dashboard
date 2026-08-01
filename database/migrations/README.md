# Prisma migrations

The schema lives at `database/schema.prisma`, and the committed initial SQL
migration is in `20260723000000_init/`.

Apply all committed migrations to a local or production database with:

```bash
npm run db:deploy
```

After changing the Prisma schema during development, create and apply a new
migration with a descriptive name:

```bash
npm run db:migrate -- --name describe_the_change
```
