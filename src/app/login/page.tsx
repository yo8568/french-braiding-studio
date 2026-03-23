"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { INPUT_CLASS } from "@/lib/constants";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (login(username, password)) {
      router.push("/");
    } else {
      setError("帳號或密碼錯誤");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-card border border-border rounded-xl p-8 w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">法式編織工作室</h1>
          <p className="text-muted text-sm mt-1">請登入以繼續</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">帳號</label>
            <input
              className={INPUT_CLASS}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="帳號"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">密碼</label>
            <input
              type="password"
              className={INPUT_CLASS}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密碼"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-accent transition-colors"
          >
            登入
          </button>
        </form>
      </div>
    </div>
  );
}
