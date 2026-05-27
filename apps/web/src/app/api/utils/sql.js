import { neon } from '@neondatabase/serverless';
import postgres from 'postgres';

const NullishQueryFunction = () => {
  throw new Error(
    'No database connection string was provided. Perhaps process.env.DATABASE_URL has not been set'
  );
};
NullishQueryFunction.transaction = () => {
  throw new Error(
    'No database connection string was provided. Perhaps process.env.DATABASE_URL has not been set'
  );
};

let _sql;
function getSql() {
  if (!_sql) {
    if (process.env.DATABASE_URL) {
      if (process.env.DATABASE_URL.includes('neon.tech')) {
        _sql = neon(process.env.DATABASE_URL);
      } else {
        // For non-Neon PostgreSQL databases (like Supabase, Render, local postgres)
        // We parse connection options from the URL. Many cloud databases require SSL,
        // which can be configured via url query params or default options.
        _sql = postgres(process.env.DATABASE_URL, {
          ssl: process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1') ? false : 'require'
        });
      }
    } else {
      _sql = NullishQueryFunction;
    }
  }
  return _sql;
}

const sqlProxy = new Proxy(() => {}, {
  apply(target, thisArg, argumentsList) {
    return getSql().apply(thisArg, argumentsList);
  },
  get(target, prop) {
    return getSql()[prop];
  }
});

export default sqlProxy;