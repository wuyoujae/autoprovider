import { RowDataPacket, ResultSetHeader } from "mysql2/promise";

export interface BaseEntity extends RowDataPacket {
  id: number;
  created_at: Date;
  updated_at?: Date;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export type InsertResult = {
  success: boolean;
  insertId?: number;
  affectedRows?: number;
  error?: string;
};

export type UpdateResult = {
  success: boolean;
  affectedRows?: number;
  changedRows?: number;
  error?: string;
};

export type DeleteResult = {
  success: boolean;
  affectedRows?: number;
  error?: string;
};

export { RowDataPacket, ResultSetHeader };

