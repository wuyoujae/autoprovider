// 由于本页使用了 React Hooks（useActionState），标记为客户端组件
"use client";

import { useActionState } from "react";
import { pingDatabase } from "./actions";

// 定义初始状态结构
const initialState = {
  success: false,
  message: "尚未测试",
  data: [] as any[],
};

function PingDbForm() {
  const [state, formAction, pending] = useActionState(
    async () => pingDatabase(),
    initialState
  );

  return (
    <div className="space-y-4 w-full">
      <form action={formAction}>
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60 w-full"
          disabled={pending}
        >
          {pending ? "查询中..." : "查询 demo 表数据"}
        </button>
      </form>

      <div className="rounded border p-4 text-sm">
        <p
          className={`font-medium ${
            state.success ? "text-green-600" : "text-gray-700"
          }`}
        >
          状态: {state.message}
        </p>

        {state.data && state.data.length > 0 && (
          <div className="mt-2">
            <p className="font-semibold mb-1">数据列表:</p>
            <ul className="list-disc pl-5 space-y-1">
              {state.data.map((item: any, i) => (
                <li key={i}>
                  ID: {item.id}, Name: {item.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">数据库测试</h1>
        <p className="text-sm text-gray-600">
          点击下方按钮，测试从 test.demo 表读取数据
        </p>
      </div>
      <PingDbForm />
    </main>
  );
}
