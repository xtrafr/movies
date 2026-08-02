import assert from 'node:assert/strict';
import postgres from 'postgres';

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!connectionString) throw new Error('Missing POSTGRES_URL_NON_POOLING or POSTGRES_URL');

const sql = postgres(connectionString, { max: 1, ssl: 'require' });
const appTables = ['user_library', 'user_preferences'];
const expectedCommands = ['DELETE', 'INSERT', 'SELECT', 'UPDATE'];

try {
  const relations = await sql`
    select
      to_regclass('auth.users')::text as auth_users,
      to_regclass('public.user_library')::text as user_library,
      to_regclass('public.user_preferences')::text as user_preferences,
      to_regclass('realtime.subscription')::text as realtime_subscription
  `;

  assert.equal(relations[0].auth_users, 'auth.users', 'Supabase Auth users table is missing');
  assert.equal(relations[0].user_library, 'user_library', 'public.user_library is missing');
  assert.equal(relations[0].user_preferences, 'user_preferences', 'public.user_preferences is missing');

  const tableSecurity = await sql`
    select c.relname as table_name, c.relrowsecurity as rls_enabled
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('user_library', 'user_preferences')
    order by c.relname
  `;
  assert.equal(tableSecurity.length, appTables.length, 'Could not inspect every application table');
  for (const table of tableSecurity) assert.equal(table.rls_enabled, true, `RLS is disabled on ${table.table_name}`);

  const policies = await sql`
    select tablename, cmd, roles, qual, with_check
    from pg_policies
    where schemaname = 'public' and tablename in ('user_library', 'user_preferences')
    order by tablename, cmd
  `;

  for (const tableName of appTables) {
    const tablePolicies = policies.filter((policy) => policy.tablename === tableName);
    assert.deepEqual(
      tablePolicies.map((policy) => policy.cmd).sort(),
      expectedCommands,
      `${tableName} does not have the expected RLS policy set`,
    );
    for (const policy of tablePolicies) {
      assert.ok(policy.roles.includes('authenticated'), `${tableName} ${policy.cmd} is not restricted to authenticated users`);
      if (policy.cmd !== 'INSERT') assert.match(policy.qual || '', /auth\.uid\(\).*user_id|user_id.*auth\.uid\(\)/, `${tableName} ${policy.cmd} does not enforce ownership`);
      if (policy.cmd === 'INSERT' || policy.cmd === 'UPDATE') assert.match(policy.with_check || '', /auth\.uid\(\).*user_id|user_id.*auth\.uid\(\)/, `${tableName} ${policy.cmd} does not validate ownership`);
    }
  }

  const grants = await sql`
    select table_name, grantee, privilege_type
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('user_library', 'user_preferences')
      and grantee in ('anon', 'authenticated')
  `;
  assert.equal(grants.some((grant) => grant.grantee === 'anon'), false, 'Anonymous role has direct application-table privileges');
  for (const tableName of appTables) {
    const authenticatedPrivileges = grants
      .filter((grant) => grant.table_name === tableName && grant.grantee === 'authenticated')
      .map((grant) => grant.privilege_type)
      .sort();
    assert.deepEqual(authenticatedPrivileges, expectedCommands, `${tableName} has unexpected authenticated grants`);
  }

  const foreignKeys = await sql`
    select c.relname as table_name, pg_get_constraintdef(con.oid) as definition
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('user_library', 'user_preferences')
      and con.contype = 'f'
  `;
  for (const tableName of appTables) {
    const userForeignKey = foreignKeys.find((key) => key.table_name === tableName);
    assert.ok(userForeignKey, `${tableName} is missing its auth.users foreign key`);
    assert.match(userForeignKey.definition, /REFERENCES auth\.users\(id\) ON DELETE CASCADE/, `${tableName} user cleanup is not cascading`);
  }

  console.log('Application tables, Auth relation, grants, foreign keys and RLS policies verified.');
  if (!relations[0].realtime_subscription) {
    console.log('Notice: Supabase-managed realtime.subscription is absent; MovieFY does not use Realtime and does not depend on it.');
  }
} finally {
  await sql.end();
}
