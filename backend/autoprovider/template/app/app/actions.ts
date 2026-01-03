"use server";

import { query } from "@/lib/db";

export async function pingDatabase() {
  try {
    // 1. 查询 demo 表
    const result = await query("SELECT * FROM demo LIMIT 10");
    // 2. 返回结果
    return {
      success: true,
      message: `查询成功，发现 ${result.rows.length} 条记录`,
      data: result.rows,
    };
  } catch (error: any) {
    console.error(error);
    return {
      success: false,
      message: `查询失败: ${error.message}`,
      data: [],
    };
  }
}
