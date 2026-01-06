"use server";

import db from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";

interface ExampleRow extends RowDataPacket {
  id: number;
  name: string;
  created_at: Date;
}

export async function testDatabaseConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const result = await db.query<RowDataPacket[]>("SELECT 1 as test");
    if (Array.isArray(result) && result.length > 0) {
      return {
        success: true,
        message: "Database connection successful!",
      };
    }
    return {
      success: false,
      message: "Unexpected result from database",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Database connection failed",
    };
  }
}

export async function queryExample(): Promise<{
  success: boolean;
  data?: ExampleRow[];
  error?: string;
}> {
  try {
    const rows = await db.query<ExampleRow[]>(
      "SELECT * FROM example_table LIMIT 10"
    );
    return {
      success: true,
      data: rows,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Query failed",
    };
  }
}

export async function insertExample(
  name: string
): Promise<{
  success: boolean;
  insertId?: number;
  error?: string;
}> {
  try {
    const result = await db.execute(
      "INSERT INTO example_table (name, created_at) VALUES (?, NOW())",
      [name]
    );
    return {
      success: true,
      insertId: result.insertId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Insert failed",
    };
  }
}

export async function transactionExample(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await db.transaction(async (connection) => {
      await connection.execute(
        "INSERT INTO example_table (name, created_at) VALUES (?, NOW())",
        ["Transaction Test 1"]
      );
      await connection.execute(
        "INSERT INTO example_table (name, created_at) VALUES (?, NOW())",
        ["Transaction Test 2"]
      );
    });
    return {
      success: true,
      message: "Transaction completed successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Transaction failed",
    };
  }
}

