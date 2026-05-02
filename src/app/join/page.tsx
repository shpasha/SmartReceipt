"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <main className="mx-auto max-w-md px-5 pt-24">
      <div className="card p-6">
        <h1 className="text-xl font-semibold mb-1">Присоединиться к комнате</h1>
        <p className="text-mute text-sm mb-5">Введи код из 5 символов</p>
        <input
          className="input w-full text-center text-2xl tracking-[0.4em] uppercase font-medium"
          maxLength={5}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABCDE"
        />
        <button
          onClick={() => code.length === 5 && router.push(`/room/${code}`)}
          disabled={code.length !== 5}
          className="btn btn-primary w-full mt-4"
        >
          Войти
        </button>
      </div>
    </main>
  );
}
