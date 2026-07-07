"use client";

import { useEffect } from "react";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

export default function KeepAlive() {
  useEffect(() => {
    const ping = async () => {
      try {
        await fetch(API_BASE_URL+"/health", {
          cache: "no-store",
        });
      } catch (err) {
        console.error("Keep-alive failed:", err);
      }
    };

    
    ping();

    const interval = setInterval(ping, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
}