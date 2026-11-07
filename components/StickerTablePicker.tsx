"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, QrCode, X } from "lucide-react";

import { useIsMobile } from "~/contexts/device-context";
import { useLanguage } from "~/contexts/language-context";
import { useStore } from "~/contexts/store-context";
import { API_BASE_URL, apiHeaders } from "~/lib/api";
import { cn } from "~/lib/utils";

type PickerArea = {
  areaId: string;
  areaName: string;
  tables: { tableId: number; tableNumber: number }[];
};

/**
 * "An welchem Tisch sitzt du?" (web shop 0005, server 0056).
 *
 * A QR sticker belongs to the restaurant, not to a table: when the table it
 * led to was deleted, the sticker leads to the shop with `?s=<code>` until the
 * restaurant gives it a table again. The guest picks the table here; the
 * server hands out that table's token and the shop goes on exactly as after
 * a normal table QR (`?t=<token>`). "Ohne Tisch weiter" leaves the guest in the
 * ordinary shop.
 *
 * The list comes without tokens; only the chosen table's token is handed out
 * (POST …/sticker-tables/choose).
 */
export default function StickerTablePicker({ code }: { code: string }) {
  const storeInfo = useStore();
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const slug = storeInfo?.slug || "";

  const [areas, setAreas] = useState<PickerArea[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [areaId, setAreaId] = useState("");
  const [tableId, setTableId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [chooseError, setChooseError] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!slug || !code) return;
    let cancelled = false;
    fetch(
      `${API_BASE_URL}/slugs/${encodeURIComponent(slug)}/sticker-tables?s=${encodeURIComponent(code)}`,
      {
        headers: apiHeaders(),
        cache: "no-store",
      },
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const body = await res.json();
        const list: PickerArea[] = body?.data?.areas ?? [];
        if (cancelled) return;
        setAreas(list);
        if (list.length) setAreaId(list[0].areaId);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, code]);

  const area = useMemo(
    () => areas?.find((a) => a.areaId === areaId),
    [areas, areaId],
  );
  const chosen = area?.tables.find((tb) => tb.tableId === tableId);

  /** Drop `?s=` from the address, keep the rest. */
  const leave = () => {
    setOpen(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("s");
      window.history.replaceState(
        null,
        "",
        url.pathname + (url.search || "") + url.hash,
      );
    } catch {}
  };

  const confirm = async () => {
    if (!chosen || busy) return;
    setBusy(true);
    setChooseError(false);
    try {
      const res = await fetch(
        `${API_BASE_URL}/slugs/${encodeURIComponent(slug)}/sticker-tables/choose`,
        {
          method: "POST",
          headers: apiHeaders(),
          body: JSON.stringify({ s: code, areaId, tableId: chosen.tableId }),
        },
      );
      if (!res.ok) throw new Error(String(res.status));
      const token = (await res.json())?.data?.token;
      if (!token) throw new Error("no token");
      // A full load: the store is fetched again with the table, as after a table QR.
      const url = new URL(window.location.href);
      url.searchParams.delete("s");
      url.searchParams.set("t", token);
      window.location.replace(url.pathname + url.search + url.hash);
    } catch {
      setChooseError(true);
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex justify-center bg-black/60",
        isMobile ? "items-end" : "items-center p-6",
      )}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sticker-picker-title"
        className={cn(
          "anim-fade flex max-h-[calc(100dvh-2rem)] w-full flex-col gap-4 overflow-y-auto border border-border-strong bg-surface-1 p-5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)]",
          isMobile
            ? "rounded-t-[24px] pb-[calc(20px+env(safe-area-inset-bottom))]"
            : "max-w-[460px] rounded-[22px]",
        )}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-3">
            <QrCode className="h-5 w-5 text-white" strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2
              id="sticker-picker-title"
              className="text-[18px] font-extrabold leading-tight text-white"
            >
              {t.tablePickerTitle}
            </h2>
            <p className="mt-1 text-[13px] font-medium leading-snug text-muted-foreground">
              {t.tablePickerSub}
            </p>
          </div>
          <button
            type="button"
            onClick={leave}
            aria-label={t.close}
            className="-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-white transition active:scale-90">
              <X className="h-4 w-4" strokeWidth={2.2} />
            </span>
          </button>
        </div>

        {!areas && !failed && (
          <div className="flex items-center justify-center gap-3 py-8 text-sm font-semibold text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {(failed || (areas && areas.length === 0)) && (
          <div className="rounded-2xl border border-border bg-surface-2 px-4 py-4 text-[13.5px] font-semibold leading-snug text-white">
            {t.tablePickerNone}
          </div>
        )}

        {areas && areas.length > 0 && (
          <>
            {areas.length > 1 && (
              <div className="flex flex-col gap-2">
                <span className="text-[12px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground">
                  {t.tablePickerArea}
                </span>
                <div
                  role="radiogroup"
                  aria-label={t.tablePickerArea}
                  className="flex flex-wrap gap-2"
                >
                  {areas.map((a) => {
                    const selected = a.areaId === areaId;
                    return (
                      <button
                        key={a.areaId}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => {
                          setAreaId(a.areaId);
                          setTableId(null);
                        }}
                        className={cn(
                          "h-11 rounded-full border-[1.5px] px-4 text-[14px] font-bold transition",
                          selected
                            ? "border-primary bg-primary text-selected-text"
                            : "border-border-strong bg-surface-2 text-white",
                        )}
                      >
                        {a.areaName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-[12px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground">
                {t.tablePickerTable}
              </span>
              <div
                role="radiogroup"
                aria-label={t.tablePickerTable}
                className="grid grid-cols-[repeat(auto-fill,minmax(60px,1fr))] gap-2"
              >
                {area?.tables.map((tb) => {
                  const selected = tb.tableId === tableId;
                  return (
                    <button
                      key={tb.tableId}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setTableId(tb.tableId)}
                      className={cn(
                        "h-14 rounded-[14px] border-[1.5px] text-[19px] font-extrabold tabular-nums transition active:scale-[0.97]",
                        selected
                          ? "border-primary bg-primary text-selected-text"
                          : "border-border-strong bg-surface-2 text-white",
                      )}
                    >
                      {tb.tableNumber}
                    </button>
                  );
                })}
              </div>
            </div>

            {chooseError && (
              <div className="rounded-2xl border border-border bg-surface-2 px-4 py-3 text-[13px] font-semibold leading-snug text-brand-red">
                {t.tablePickerError}
              </div>
            )}

            <button
              type="button"
              disabled={!chosen || busy}
              onClick={confirm}
              className="flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15.5px] font-extrabold text-selected-text transition active:scale-[0.98] disabled:opacity-40"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {chosen
                ? t.tablePickerConfirm.replace(
                    "{n}",
                    String(chosen.tableNumber),
                  )
                : t.tablePickerChoose}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={leave}
          className="h-12 w-full rounded-2xl text-[14.5px] font-bold text-muted-foreground transition hover:bg-surface-hover"
        >
          {t.tablePickerSkip}
        </button>
      </div>
    </div>
  );
}
