"use client";

import dynamic from "next/dynamic";
import { LoaderCircle } from "lucide-react";
import type { JdPdfData } from "@/lib/pdf/jd-document";

const ClientPdfDownloadButton = dynamic(
  () => import("./jd-pdf-download-button-client").then((module) => module.JdPdfDownloadButtonClient),
  {
    ssr: false,
    loading: () => <PdfLoading />,
  },
);

function PdfLoading() {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-400">
      <LoaderCircle className="h-4 w-4 animate-spin" />PDF 준비 중…
    </span>
  );
}

export function JdPdfDownloadButton({ data }: { data: JdPdfData }) {
  return <ClientPdfDownloadButton data={data} />;
}
