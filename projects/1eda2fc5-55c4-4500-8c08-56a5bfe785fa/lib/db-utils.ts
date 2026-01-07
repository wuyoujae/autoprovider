import { RowDataPacket, ResultSetHeader } from "mysql2/promise";

export interface QueryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function buildPaginationQuery(
  baseQuery: string,
  { page, pageSize }: PaginationParams
): { query: string; countQuery: string; offset: number } {
  const offset = (page - 1) * pageSize;
  const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as count_table`;
  const query = `${baseQuery} LIMIT ${pageSize} OFFSET ${offset}`;

  return { query, countQuery, offset };
}

export function isRowDataPacket(obj: unknown): obj is RowDataPacket[] {
  return Array.isArray(obj);
}

export function isResultSetHeader(obj: unknown): obj is ResultSetHeader {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "affectedRows" in obj &&
    "insertId" in obj
  );
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export function escapeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }
  if (value instanceof Date) {
    return `'${formatDate(value)}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function buildInsertQuery(
  tableName: string,
  data: Record<string, unknown>
): { query: string; values: unknown[] } {
  const columns = Object.keys(data);
  const placeholders = columns.map(() => "?").join(", ");
  const values = Object.values(data);

  const query = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;

  return { query, values };
}

export function buildUpdateQuery(
  tableName: string,
  data: Record<string, unknown>,
  whereColumn: string,
  whereValue: unknown
): { query: string; values: unknown[] } {
  const columns = Object.keys(data);
  const setClause = columns.map((col) => `${col} = ?`).join(", ");
  const values = [...Object.values(data), whereValue];

  const query = `UPDATE ${tableName} SET ${setClause} WHERE ${whereColumn} = ?`;

  return { query, values };
}

