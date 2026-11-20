import { Component, computed, inject, signal } from '@angular/core';
import { CoverageCanvas } from '../../shared/coverage-canvas/coverage-canvas';
import { FloorPlan as FloorPlanModel } from '../../core/models/wifi.models';
import { WifiService } from '../../core/services/wifi.service';

@Component({
  imports: [CoverageCanvas],
  selector: 'app-coverage-map',
  styleUrl: './coverage-map.scss',
  templateUrl: './coverage-map.html',
})
export class CoverageMap {
  private readonly wifi = inject(WifiService);
  protected readonly rangeMeters = signal(10);

  protected readonly floorPlan = computed<FloorPlanModel>(() => ({
    width: 800,
    height: 520,
    devices: this.wifi.devices(),
    walls: this.wifi.walls(),
    measurements: [],
  }));

  protected onRangeChange(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    const range = Number(event.target.value);
    if (Number.isFinite(range)) this.rangeMeters.set(range);
  }
}
