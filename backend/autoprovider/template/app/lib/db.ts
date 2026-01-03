import mysql, {
  FieldPacket,
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";

type DbConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

// 支持 mysql://user:pass@host:port/db 形式，也兼容单独的环境变量
const buildConfig = (): DbConfig => {
  const url = process.env.DB_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      return {
        host: parsed.hostname || "localhost",
        port: parsed.port ? parseInt(parsed.port, 10) : 3306,
        database: parsed.pathname.replace("/", "") || "myapp",
        user: decodeURIComponent(parsed.username || "root"),
        password: decodeURIComponent(parsed.password || ""),
      };
    } catch (err) {
      console.warn("解析 DB_URL 失败，回退到单项环境变量:", err);
    }
  }

  return {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    database: process.env.DB_NAME || "myapp",
    user: process.env.DB_USER || "autoprovider_db",
    password: process.env.DB_PASSWORD || "autoprovider",
  };
};

const cfg = buildConfig();

// MySQL 连接配置
const pool: Pool = mysql.createPool({
  host: cfg.host,
  port: cfg.port,
  database: cfg.database,
  user: cfg.user,
  password: cfg.password,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

type QueryResult<T = RowDataPacket> = {
  rows: T[];
  rowCount: number;
  fields: FieldPacket[];
};

// 测试数据库连接
export const testConnection = async () => {
  try {
    const client = await pool.getConnection();
    const [rows] = await client.query<RowDataPacket[]>(
      "SELECT NOW() AS now_str"
    );
    client.release();
    console.log("MySQL 连接成功:", rows[0]);
    return true;
  } catch (error) {
    console.error("MySQL 连接失败:", error);
    return false;
  }
};

// 执行查询
export const query = async <T = RowDataPacket>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  try {
    const [rows, fields] = await pool.query<RowDataPacket[] | ResultSetHeader>(
      text,
      params
    );
    const isArrayResult = Array.isArray(rows);
    const normalizedRows = (isArrayResult ? rows : []) as T[];
    const rowCount = isArrayResult
      ? normalizedRows.length
      : (rows as ResultSetHeader).affectedRows ?? 0;

    return {
      rows: normalizedRows,
      rowCount,
      fields: (fields || []) as FieldPacket[],
    };
  } catch (error) {
    console.error("数据库查询错误:", error);
    throw error;
  }
};

// 获取客户端（用于事务）
export const getClient = async (): Promise<PoolConnection> => {
  return await pool.getConnection();
};

export default pool;
