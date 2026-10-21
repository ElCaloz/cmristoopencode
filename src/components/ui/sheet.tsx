"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

type SheetContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: "right" | "left" | "bottom";
};

export function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-zinc-950/50 backdrop-blur-[1px]" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col bg-white shadow-2xl focus:outline-none dark:bg-zinc-900",
          side === "right" &&
            "inset-y-0 right-0 w-full max-w-md animate-sheet-in-right border-l border-zinc-200 dark:border-zinc-800",
          side === "left" &&
            "inset-y-0 left-0 w-full max-w-md animate-sheet-in-left border-r border-zinc-200 dark:border-zinc-800",
          side === "bottom" &&
            "inset-x-0 bottom-0 max-h-[88vh] animate-sheet-in-bottom rounded-t-2xl border-t border-zinc-200 dark:border-zinc-800",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
          <X className="size-4" />
          <span className="sr-only">Chiudi</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "shrink-0 space-y-1 border-b border-zinc-100 px-5 py-4 pr-12 dark:border-zinc-800",
        className,
      )}
      {...props}
    />
  );
}

export function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-base font-semibold text-zinc-900 dark:text-zinc-100", className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-xs text-zinc-500 dark:text-zinc-400", className)}
      {...props}
    />
  );
}

export function SheetBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto px-5 py-4", className)}
      {...props}
    />
  );
}

export function SheetFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-zinc-100 px-5 py-3 dark:border-zinc-800",
        className,
      )}
      {...props}
    />
  );
}
