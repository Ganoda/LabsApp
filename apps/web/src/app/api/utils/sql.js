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

let sql;
if (process.env.DATABASE_URL) {
  if (process.env.DATABASE_URL.includes('neon.tech')) {
    sql = neon(process.env.DATABASE_URL);
  } else {
    // For non-Neon PostgreSQL databases (like Supabase, Render, local postgres)
    // We parse connection options from the URL. Many cloud databases require SSL,
    // which can be configured via url query params or default options.
    sql = postgres(process.env.DATABASE_URL, {
      ssl: process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1') ? false : 'require'
    });
  }
} else {
  sql = NullishQueryFunction;
}

export default sql;