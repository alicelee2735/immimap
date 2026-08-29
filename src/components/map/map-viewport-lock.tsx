"use client";

import { useEffect } from "react";

const HTML_LOCK = ["overflow-hidden", "overscroll-none"] as const;
const BODY_LOCK = ["h-dvh", "overflow-hidden", "overscroll-none"] as const;

/**
 * Locks document scroll for the map viewport, then removes the lock on
 * unmount. These classes used to live on the persistent locale layout's
 * `<html>`/`<body>`, so leaving /map via client navigation left every
 * other page unscrollable until a hard refresh.
 */
export function MapViewportLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.classList.add(...HTML_LOCK);
    body.classList.add(...BODY_LOCK);
    return () => {
      html.classList.remove(...HTML_LOCK);
      body.classList.remove(...BODY_LOCK);
    };
  }, []);

  return null;
}
