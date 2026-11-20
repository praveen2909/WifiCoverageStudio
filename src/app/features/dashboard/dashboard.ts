import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CoverageService } from '../../core/services/coverage.service';
import { WifiService } from '../../core/services/wifi.service';
import { DistanceCalibration } from '../../core/models/wifi.models';
import { StorageService } from '../../core/services/storage.service';
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
  private readonly storage = inject(StorageService);
  protected readonly provider = signal<string | null>(null);
  protected readonly providerLookupInProgress = signal(false);
  protected readonly providerLookupStatus = signal<string | null>(null);
  protected readonly distanceCalibration = signal<DistanceCalibration | null>(null);
  protected readonly knownDistanceMeters = signal('20');
  protected readonly distanceCalibrationStatus = signal<string | null>(null);
  protected readonly routerName = computed(() => {
    const reading = this.wifi.reading();
    if (!reading?.connected) return null;

    return reading.routerIp === '192.168.31.1'
      ? 'Likely Xiaomi / Mi Router'
      : 'Router / gateway';
  });
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
    return rssi === null || rssi === undefined
      ? null
      : this.coverage.getEstimatedDistance(rssi, this.distanceCalibration());
  });

  constructor() {
    try {
      const calibration = this.storage.loadDistanceCalibration();
      this.distanceCalibration.set(calibration);
      if (calibration) {
        this.knownDistanceMeters.set(String(calibration.distanceMeters));
      }
    } catch (error) {
      this.distanceCalibrationStatus.set(
        error instanceof Error ? error.message : 'Could not load saved distance calibration.',
      );
    }
  }

  protected onKnownDistanceInput(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.knownDistanceMeters.set(event.target.value);
    }
  }

  protected calibrateDistance(): void {
    const reading = this.wifi.reading();
    const distanceMeters = Number(this.knownDistanceMeters());
    if (!reading?.connected || reading.rssiDbm === null) {
      this.distanceCalibrationStatus.set('A live Wi-Fi signal reading is required to calibrate.');
      return;
    }

    if (!Number.isFinite(distanceMeters) || distanceMeters <= 0 || distanceMeters > 1000) {
      this.distanceCalibrationStatus.set('Enter a known distance greater than 0 and no more than 1000 meters.');
      return;
    }

    const calibration: DistanceCalibration = {
      distanceMeters,
      rssiDbm: reading.rssiDbm,
    };

    try {
      this.storage.saveDistanceCalibration(calibration);
      this.distanceCalibration.set(calibration);
      this.distanceCalibrationStatus.set(
        `Calibrated at ${distanceMeters} m using the current ${reading.rssiDbm} dBm reading.`,
      );
    } catch (error) {
      this.distanceCalibrationStatus.set(
        error instanceof Error ? error.message : 'Could not save distance calibration.',
      );
    }
  }

  protected resetDistanceCalibration(): void {
    try {
      this.storage.clearDistanceCalibration();
      this.distanceCalibration.set(null);
      this.distanceCalibrationStatus.set('Distance calibration reset to the default model.');
    } catch (error) {
      this.distanceCalibrationStatus.set(
        error instanceof Error ? error.message : 'Could not reset distance calibration.',
      );
    }
  }
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
