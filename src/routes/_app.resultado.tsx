import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { EconomiaGerada } from "@/components/EconomiaGerada";

export const Route = createFileRoute("/_app/resultado")({
  ssr: false,
  component: Page,
  head: () => ({
    meta: [
      { title: "Economia Gerada — Usina dos Irmãos" },
      { name: "description", content: "Economia gerada por cliente e período." },
    ],
  }),
});

function Page() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <div className="mx-auto max-w-5xl">
        <EconomiaGerada />
      </div>
    </Suspense>
  );
}
