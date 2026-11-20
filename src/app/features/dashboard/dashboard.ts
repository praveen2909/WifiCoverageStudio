import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CoverageService } from '../../core/services/coverage.service';
import { WifiService } from '../../core/services/wifi.service';
import { ProviderLookupService } from '../../core/services/provider-lookup.service';
import { firstValueFrom } from 'rxjs';
import { DistanceGraphic } from '../../shared/distance-graphic/distance-graphic';

@Component({
  imports: [DatePipe, DistanceGraphic, RouterLink],
  selector: 'app-dashboard',
  styleUrl: './dashboard.scss',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  protected readonly wifi = inject(WifiService);
  protected readonly coverage = inject(CoverageService);
  private readonly providerLookup = inject(ProviderLookupService);
  protected readonly provider = signal<string | null>(null);
  protected readonly providerLookupInProgress = signal(false);
  protected readonly providerLookupStatus = signal<string | null>(null);
  protected readonly signalQuality = computed(() => {
    const rssi = this.wifi.reading()?.rssiDbm;
    return rssi === null || rssi === undefined ? null : this.coverage.getSignalQuality(rssi);
  });
  protected readonly signalPercent = computed(() => {
    const rssi = this.wifi.reading()?.rssiDbm;
    return rssi === null || rssi === undefined ? 0 : Math.max(0, Math.min(100, ((rssi + 100) / 80) * 100));
  });
  protected readonly estimatedDistance = computed(() => {
    const rssi = this.wifi.reading()?.rssiDbm;
    return rssi === null || rssi === undefined ? null : this.coverage.getEstimatedDistance(rssi);
  });
  protected async lookupProvider(): Promise<void> {
    if (this.providerLookupInProgress()) return;

    this.providerLookupInProgress.set(true);
    this.providerLookupStatus.set(null);

    try {
      this.provider.set(await firstValueFrom(this.providerLookup.lookup()));
      this.providerLookupStatus.set('Provider identified from your public IP address.');
    } catch (error) {
      this.provider.set(null);
      this.providerLookupStatus.set(
        error instanceof Error ? error.message : 'The provider lookup failed. Please try again.',
      );
    } finally {
      this.providerLookupInProgress.set(false);
    }
  }

}
