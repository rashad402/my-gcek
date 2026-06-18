import * as Sentry from '@sentry/react-native';

/**
 * Observability helper for GCEK Mobile App.
 * Centralizes Sentry logging and performance monitoring.
 */

/**
 * Log a scraping network transaction, including its response latency and success state.
 */
export function logScraperTransaction(
  type: string,
  isSuccess: boolean,
  durationMs: number,
  error?: any
): void {
  // 1. Add Sentry breadcrumb for local session diagnostics
  Sentry.addBreadcrumb({
    category: 'scraper',
    message: `ETLAB ${type} fetch took ${durationMs}ms (success: ${isSuccess})`,
    level: isSuccess ? 'info' : 'warning',
    data: {
      type,
      durationMs,
      isSuccess,
      errorMsg: error?.message || (error ? String(error) : undefined),
    },
  });

  // 2. In development, log to console
  if (__DEV__) {
    console.log(`[Observability] Scraper: ${type} | Success: ${isSuccess} | Latency: ${durationMs}ms`);
  }

  // 3. If the network request failed, log the error to Sentry
  if (!isSuccess && error) {
    Sentry.captureException(error, {
      tags: {
        observability_type: 'scraper_network_failure',
        scraper_target: type,
      },
      extra: {
        durationMs,
      },
    });
  }
}

/**
 * Log a critical parser regex failure when the ETLAB portal HTML structure changes.
 * Attaches the first 1000 characters of the problematic HTML snippet to Sentry diagnostics.
 */
export function logParserError(
  parserName: string,
  error: any,
  htmlSnippet?: string
): void {
  const cleanError = error instanceof Error ? error : new Error(String(error));

  // 1. In development, log parser stack trace to console
  console.error(`[Observability] Critical Parser Failure [${parserName}]:`, cleanError);

  // 2. Upload parser crash stack trace and HTML snippet context to Sentry
  Sentry.captureException(cleanError, {
    tags: {
      observability_type: 'parser_layout_change',
      parser_name: parserName,
    },
    extra: {
      htmlSnippetSample: htmlSnippet ? htmlSnippet.substring(0, 1000) : 'No HTML snippet provided',
    },
  });
}
