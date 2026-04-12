import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? "https://9e0c68fef3cc1b5ecb7b6eca221315b8@o158570.ingest.us.sentry.io/4511208009039872",

  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});
