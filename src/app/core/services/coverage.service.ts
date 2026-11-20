import { Injectable } from '@angular/core';
import { WifiDevice, Wall, SignalQuality } from '../models/wifi.models';

@Injectable({
  providedIn: 'root',
})
export class CoverageService {
  getEstimatedDistance(rssiDbm: number): number | null {
    if (!Number.isFinite(rssiDbm)) return null;

    const referenceRssiAtOneMeter = -40;
    const indoorPathLossExponent = 2.7;
    return 10 ** ((referenceRssiAtOneMeter - rssiDbm) / (10 * indoorPathLossExponent));
  }

  isWithinRange(
    x: number,
    y: number,
    devices: WifiDevice[],
    rangeMeters: number,
    metersPerPlanPixel: number,
  ): boolean {
    if (devices.length === 0 || !Number.isFinite(rangeMeters) || rangeMeters < 0) return false;

    return devices.some(
      (device) => Math.hypot(x - device.x, y - device.y) * metersPerPlanPixel <= rangeMeters,
    );
  }

  getSignalStrength(
    x: number,
    y: number,
    router: WifiDevice,
    walls: Wall[],
    distanceScale = 1,
  ): number {
    const distance = Math.hypot(x - router.x, y - router.y) * distanceScale;
    const distanceLoss = 20 * Math.log10(Math.max(distance, 1));
    const wallLoss = this.calculateWallLoss(x, y, router, walls);
    const signal = router.signalStrength - distanceLoss - wallLoss;

    return Math.max(-100, Math.min(-20, signal));
  }

  getSignalQuality(signal: number): SignalQuality {
    if (signal >= -50) return 'excellent';
    if (signal >= -60) return 'good';
    if (signal >= -70) return 'fair';
    if (signal >= -80) return 'weak';
    return 'poor';
  }

  getSignalColor(signal: number): string {
    if (signal >= -50) return '#22c55e';
    if (signal >= -60) return '#84cc16';
    if (signal >= -70) return '#facc15';
    if (signal >= -80) return '#fb923c';
    return '#ef4444';
  }

  private calculateWallLoss(x: number, y: number, router: WifiDevice, walls: Wall[]): number {
    return walls.reduce(
      (totalLoss, wall) =>
        this.lineIntersects(
          router.x,
          router.y,
          x,
          y,
          wall.x1,
          wall.y1,
          wall.x2,
          wall.y2,
        )
          ? totalLoss + wall.attenuation
          : totalLoss,
      0,
    );
  }

  private lineIntersects(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
  ): boolean {
    const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denominator === 0) return false;

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }
}
