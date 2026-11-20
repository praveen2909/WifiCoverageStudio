import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ProviderLookupService } from './provider-lookup.service';

describe('ProviderLookupService', () => {
  let service: ProviderLookupService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProviderLookupService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('returns the network organization from the local companion', () => {
    let provider: string | undefined;
    service.lookup().subscribe((value) => (provider = value));

    const request = http.expectOne('http://127.0.0.1:8765/api/v1/provider');
    expect(request.request.method).toBe('GET');
    request.flush({
      provider: 'Reliance Jio Infocomm Limited',
      asn: 'AS55836',
      domain: 'jio.com',
    });

    expect(provider).toBe('Reliance Jio Infocomm Limited');
  });

  it('reports missing companion response data', () => {
    let error: unknown;
    service.lookup().subscribe({ error: (value: unknown) => (error = value) });

    http.expectOne('http://127.0.0.1:8765/api/v1/provider').flush({});

    expect(error).toEqual(new Error('The provider was not included in the lookup response.'));
  });

  it('explains provider service rate limits', () => {
    let error: unknown;
    service.lookup().subscribe({ error: (value: unknown) => (error = value) });

    http.expectOne('http://127.0.0.1:8765/api/v1/provider').flush(
      { message: 'IPinfo Lite rate-limited the lookup. Wait a while before trying again.' },
      { status: 429, statusText: 'Too Many Requests' },
    );

    expect(error).toEqual(
      new Error('IPinfo Lite rate-limited the lookup. Wait a while before trying again.'),
    );
  });

  it('explains network and browser privacy failures', () => {
    let error: unknown;
    service.lookup().subscribe({ error: (value: unknown) => (error = value) });

    http.expectOne('http://127.0.0.1:8765/api/v1/provider').error(new ProgressEvent('error'));

    expect(error).toEqual(
      new Error('Could not reach the local companion. Start it and check your internet connection.'),
    );
  });

  it('explains when IPinfo is not configured in the companion', () => {
    let error: unknown;
    service.lookup().subscribe({ error: (value: unknown) => (error = value) });

    http.expectOne('http://127.0.0.1:8765/api/v1/provider').flush(
      { message: 'IPinfo is not configured. Set IPINFO_TOKEN and restart the companion.' },
      { status: 503, statusText: 'Service Unavailable' },
    );

    expect(error).toEqual(
      new Error('IPinfo is not configured. Set IPINFO_TOKEN and restart the companion.'),
    );
  });
});
