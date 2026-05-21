"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ backgroundColor: "#0d0f14", color: "#e8dfd0", fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              border: "1px solid rgba(201, 168, 76, 0.35)",
              borderRadius: "12px",
              padding: "2rem",
              maxWidth: "400px",
              width: "100%",
              textAlign: "center",
              background: "linear-gradient(180deg, #1e2c22 0%, #0d0f14 100%)",
            }}
          >
            <h1
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "#e8c55a",
                marginBottom: "1rem",
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                fontSize: "0.9375rem",
                color: "#a89b8c",
                lineHeight: 1.6,
                marginBottom: "1.5rem",
              }}
            >
              Please try again. If the problem continues, reload the page.
            </p>
            <button
              onClick={reset}
              type="button"
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#1a1208",
                backgroundColor: "#c9a84c",
                border: "none",
                borderRadius: "8px",
                padding: "0.625rem 1.5rem",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
