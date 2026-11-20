import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

interface ProviderLookupResponse {
  provider: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProviderLookupService {
  private readonly http = inject(HttpClient);
  private readonly lookupUrl = 'http://127.0.0.1:8765/api/v1/provider';

  lookup(): Observable<string> {
    return this.http.get<unknown>(this.lookupUrl).pipe(
      map((response) => this.readProvider(response)),
      catchError((error: unknown) => throwError(() => this.toLookupError(error))),
    );
  }

  private readProvider(response: unknown): string {
    if (typeof response !== 'object' || response === null) {
      throw new Error('The provider lookup returned an invalid response.');
    }

    const result = response as Partial<ProviderLookupResponse>;
    if (typeof result.provider !== 'string' || result.provider.trim().length === 0) {
      throw new Error('The provider was not included in the lookup response.');
    }

    return result.provider.trim();
  }

  private toLookupError(error: unknown): Error {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 429) {
        return new Error(
          'IPinfo Lite rate-limited the lookup. Wait a while before trying again.',
        );
      }

      if (error.status === 0) {
        return new Error(
          'Could not reach the local companion. Start it and check your internet connection.',
        );
      }

      const message =
        typeof error.error === 'object' &&
        error.error !== null &&
        typeof (error.error as Record<string, unknown>)['message'] === 'string'
          ? ((error.error as Record<string, string>)['message'] ?? '').trim()
          : '';
      if (message) return new Error(message);
      if (error.status === 503) {
        return new Error('IPinfo is not configured. Set IPINFO_TOKEN and restart the companion.');
      }

      return new Error(
        `Provider lookup failed with HTTP ${error.status}. Please try again later.`,
      );
    }

    return error instanceof Error
      ? error
      : new Error('The provider lookup failed. Please try again later.');
  }
}
