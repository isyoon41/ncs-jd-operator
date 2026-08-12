"use client";

import { useMemo } from "react";
import { usePDF } from "@react-pdf/renderer";
import { Download, LoaderCircle } from "lucide-react";
import { JdDocument, type JdPdfData } from "@/lib/pdf/jd-document";
import { safeFileName } from "@/lib/jd/text-utils";

export function JdPdfDownloadButtonClient({ data }: { data: JdPdfData }) {
  const document = useMemo(() => <JdDocument data={data} />, [data]);
  const [instance] = usePDF({ document });
  const fileName = safeFileName(`${data.organizationName}_${data.roleTitle}_JD.pdf`);

  if (instance.loading) {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-400">
        <LoaderCircle className="h-4 w-4 animate-spin" />PDF 준비 중…
      </span>
    );
  }

  if (instance.error || !instance.url) return null;

  return (
    <a
      href={instance.url}
      download={fileName}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-blue-200 hover:text-blue-700"
    >
      <Download className="h-4 w-4" />PDF 다운로드
    </a>
  );
}
