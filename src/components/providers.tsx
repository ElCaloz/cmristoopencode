"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      offset={{ bottom: 20, right: 20 }}
      mobileOffset={{ bottom: 84, left: 16, right: 16 }}
      richColors
      closeButton
      theme="system"
      toastOptions={{
        style: {
          borderRadius: "10px",
          fontSize: "13px",
        },
      }}
    />
  );
}
