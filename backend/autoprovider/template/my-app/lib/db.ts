import mysql from "mysql2/promise";

const dbUrl = process.env.DB_URL;

if (!dbUrl) {
  console.warn(
    "[DB] Warning: DB_URL environment variable is not set. Database connections will fail."
  );
}

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    if (!dbUrl) {
      throw new Error(
        "DB_URL is not configured. Please set the DB_URL environment variable."
      );
    }

    pool = mysql.createPool({
      uri: dbUrl,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 30000,
    });

    pool.on("error", (err) => {
      console.error("[DB Pool Error]", err.message);
    });
  }

  return pool;
}

export async function query<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T> {
  const connection = getPool();
  const [rows] = await connection.execute(sql, params);
  return rows as T;
}

export async function execute(
  sql: string,
  params?: unknown[]
): Promise<mysql.ResultSetHeader> {
  const connection = getPool();
  const [result] = await connection.execute<mysql.ResultSetHeader>(sql, params);
  return result;
}

export async function getConnection(): Promise<mysql.PoolConnection> {
  const connection = getPool();
  return connection.getConnection();
}

export async function transaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await getConnection();
  await connection.beginTransaction();

  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default {
  getPool,
  query,
  execute,
  getConnection,
  transaction,
};
