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
    <html>
      <body style={{ backgroundColor: "#0f0e17", color: "#e0dfe8" }}>
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
              border: "2px solid #ff2975",
              borderRadius: "4px",
              padding: "2rem",
              maxWidth: "400px",
              width: "100%",
              textAlign: "center",
              background: "#1a1830",
            }}
          >
            <h1
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "14px",
                color: "#ff2975",
                marginBottom: "1rem",
              }}
            >
              UNEXPECTED ERROR
            </h1>
            <p
              style={{
                fontFamily: "monospace",
                fontSize: "14px",
                color: "#a0a0b8",
                lineHeight: 1.6,
                marginBottom: "1.5rem",
              }}
            >
              Something went wrong. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "12px",
                color: "#0f0e17",
                backgroundColor: "#00f5d4",
                border: "2px solid #00f5d4",
                borderRadius: "4px",
                padding: "0.5rem 1.5rem",
                cursor: "pointer",
              }}
            >
              [ TRY AGAIN ]
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
