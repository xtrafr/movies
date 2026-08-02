import assert from 'node:assert/strict';
import postgres from 'postgres';

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!connectionString) throw new Error('Missing POSTGRES_URL_NON_POOLING or POSTGRES_URL');

const sql = postgres(connectionString, { max: 1, ssl: 'require' });
const ownedTables = ['user_library', 'user_preferences'];
const protectedTables = ['user_accounts', 'user_recovery_codes', 'auth_rate_limits'];
const appTables = [...ownedTables, ...protectedTables];
const expectedCommands = ['DELETE', 'INSERT', 'SELECT', 'UPDATE'];

try {
  const relations = await sql`
    select
      to_regclass('auth.users')::text as auth_users,
      to_regclass('public.user_library')::text as user_library,
      to_regclass('public.user_preferences')::text as user_preferences,
      to_regclass('public.user_accounts')::text as user_accounts,
      to_regclass('public.user_recovery_codes')::text as user_recovery_codes,
      to_regclass('public.auth_rate_limits')::text as auth_rate_limits,
      to_regclass('realtime.subscription')::text as realtime_subscription
  `;
  for (const name of ['auth_users', ...appTables]) {
    assert.ok(relations[0][name], `${name.replaceAll('_', '.')} is missing`);
  }

  const tableSecurity = await sql`
    select c.relname as table_name, c.relrowsecurity as rls_enabled
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = any(${appTables})
    order by c.relname
  `;
  assert.equal(tableSecurity.length, appTables.length, 'Could not inspect every application table');
  for (const table of tableSecurity) assert.equal(table.rls_enabled, true, `RLS is disabled on ${table.table_name}`);

  const policies = await sql`
    select tablename, cmd, roles, qual, with_check
    from pg_policies
    where schemaname = 'public' and tablename = any(${appTables})
    order by tablename, cmd
  `;
  for (const tableName of ownedTables) {
    const tablePolicies = policies.filter((policy) => policy.tablename === tableName);
    assert.deepEqual(tablePolicies.map((policy) => policy.cmd).sort(), expectedCommands, `${tableName} policy set is incomplete`);
    for (const policy of tablePolicies) {
      assert.ok(policy.roles.includes('authenticated'), `${tableName} ${policy.cmd} is not restricted to authenticated users`);
      if (policy.cmd !== 'INSERT') assert.match(policy.qual || '', /auth\.uid\(\).*user_id|user_id.*auth\.uid\(\)/, `${tableName} ${policy.cmd} does not enforce ownership`);
      if (policy.cmd === 'INSERT' || policy.cmd === 'UPDATE') assert.match(policy.with_check || '', /auth\.uid\(\).*user_id|user_id.*auth\.uid\(\)/, `${tableName} ${policy.cmd} does not validate ownership`);
    }
  }
  const accountPolicies = policies.filter((policy) => policy.tablename === 'user_accounts');
  assert.deepEqual(accountPolicies.map((policy) => policy.cmd), ['SELECT'], 'user_accounts must expose only an owned SELECT policy');
  assert.match(accountPolicies[0].qual || '', /auth\.uid\(\).*user_id|user_id.*auth\.uid\(\)/, 'user_accounts SELECT does not enforce ownership');
  for (const tableName of ['user_recovery_codes', 'auth_rate_limits']) {
    assert.equal(policies.some((policy) => policy.tablename === tableName), false, `${tableName} must not have client policies`);
  }

  const grants = await sql`
    select table_name, grantee, privilege_type
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = any(${appTables})
      and grantee in ('anon', 'authenticated')
  `;
  assert.equal(grants.some((grant) => grant.grantee === 'anon'), false, 'Anonymous role has application-table privileges');
  for (const tableName of ownedTables) {
    const privileges = grants.filter((grant) => grant.table_name === tableName && grant.grantee === 'authenticated').map((grant) => grant.privilege_type).sort();
    assert.deepEqual(privileges, expectedCommands, `${tableName} has unexpected authenticated grants`);
  }
  assert.deepEqual(
    grants.filter((grant) => grant.table_name === 'user_accounts' && grant.grantee === 'authenticated').map((grant) => grant.privilege_type),
    ['SELECT'],
    'user_accounts must grant authenticated users SELECT only',
  );
  for (const tableName of ['user_recovery_codes', 'auth_rate_limits']) {
    assert.equal(grants.some((grant) => grant.table_name === tableName && grant.grantee === 'authenticated'), false, `${tableName} is exposed to authenticated clients`);
  }

  const foreignKeys = await sql`
    select c.relname as table_name, pg_get_constraintdef(con.oid) as definition
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = any(${['user_library', 'user_preferences', 'user_accounts', 'user_recovery_codes']}) and con.contype = 'f'
  `;
  for (const tableName of ['user_library', 'user_preferences', 'user_accounts', 'user_recovery_codes']) {
    const userForeignKey = foreignKeys.find((key) => key.table_name === tableName);
    assert.ok(userForeignKey, `${tableName} is missing its auth.users foreign key`);
    assert.match(userForeignKey.definition, /REFERENCES auth\.users\(id\) ON DELETE CASCADE/, `${tableName} user cleanup is not cascading`);
  }

  const functionGrants = await sql`
    select routine_name, grantee, privilege_type
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name in ('consume_auth_rate_limit', 'consume_recovery_code')
  `;
  for (const functionName of ['consume_auth_rate_limit', 'consume_recovery_code']) {
    const routineGrants = functionGrants.filter((grant) => grant.routine_name === functionName);
    assert.equal(routineGrants.some((grant) => ['PUBLIC', 'anon', 'authenticated'].includes(grant.grantee)), false, `${functionName} is exposed to clients`);
    assert.ok(routineGrants.some((grant) => grant.grantee === 'service_role' && grant.privilege_type === 'EXECUTE'), `Service role cannot execute ${functionName}`);
  }

  console.log('Auth relations, protected grants, foreign keys, RLS policies, atomic recovery and rate limiting verified.');
  if (!relations[0].realtime_subscription) console.log('Notice: Realtime is absent; MovieFY does not depend on it.');
} finally {
  await sql.end();
}
