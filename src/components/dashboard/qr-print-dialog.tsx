"use client";

import { Download, Printer, QrCode } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  url: string;
  title: string;
  subtitle?: string;
  fileName: string;
};

type QrImages = {
  svg: string;
  png: string;
};

/**
 * Anteprima, download PNG e stampa del QR di un link pubblico. L'immagine è
 * generata interamente nel browser con la libreria qrcode: nessun dato esce
 * dal dispositivo e nessun servizio esterno è coinvolto.
 */
export function QrPrintDialog({ url, title, subtitle, fileName }: Props) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<QrImages | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setImages(null);
    setError(null);
    try {
      const QRCode = await import("qrcode");
      const [svg, png] = await Promise.all([
        QRCode.toString(url, {
          type: "svg",
          margin: 1,
          width: 260,
          errorCorrectionLevel: "M",
          color: { dark: "#18181b", light: "#ffffff" },
        }),
        QRCode.toDataURL(url, {
          margin: 2,
          width: 1200,
          errorCorrectionLevel: "H",
          color: { dark: "#18181b", light: "#ffffff" },
        }),
      ]);
      setImages({ svg, png });
    } catch {
      setError("Generazione del QR non riuscita. Riprova.");
    }
  }, [url]);

  useEffect(() => {
    if (!open) return;
    // Classe di scope per le regole di stampa in globals.css: solo il foglio
    // QR viene stampato, il resto della pagina resta escluso.
    document.body.classList.add("qr-print-open");
    return () => document.body.classList.remove("qr-print-open");
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) void generate();
  };

  const handleDownload = () => {
    if (!images) return;
    const anchor = document.createElement("a");
    anchor.href = images.png;
    anchor.download = `${fileName}.png`;
    anchor.click();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <QrCode />
          QR
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Codice QR</DialogTitle>
          <DialogDescription>
            Scarica l&apos;immagine PNG oppure stampala da appendere al tavolo o
            alla vetrina: il QR apre direttamente il link pubblico.
          </DialogDescription>
        </DialogHeader>

        <div className="qr-print-sheet flex flex-col items-center gap-4 rounded-xl border border-zinc-200 bg-white p-8 text-zinc-900">
          <p className="text-center text-lg font-semibold tracking-tight">
            {title}
          </p>
          {subtitle ? (
            <p className="text-center text-sm text-zinc-600">{subtitle}</p>
          ) : null}
          <div
            className="flex size-56 items-center justify-center [&_svg]:size-full"
            aria-label="Codice QR del link pubblico"
          >
            {images ? (
              <div
                className="size-full"
                dangerouslySetInnerHTML={{ __html: images.svg }}
              />
            ) : (
              <div className="size-full animate-pulse rounded-lg bg-zinc-100" />
            )}
          </div>
          <p className="text-center text-sm font-medium">
            Inquadra il codice per aprire il link
          </p>
          <p className="max-w-xs break-all text-center font-mono text-[11px] text-zinc-500">
            {url}
          </p>
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-xs text-red-600">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            disabled={!images}
          >
            <Printer />
            Stampa
          </Button>
          <Button type="button" onClick={handleDownload} disabled={!images}>
            <Download />
            Scarica PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
