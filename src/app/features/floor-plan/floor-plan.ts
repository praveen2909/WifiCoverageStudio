import { Component, computed, inject, signal } from '@angular/core';
import { CoverageCanvas } from '../../shared/coverage-canvas/coverage-canvas';
import { FloorPlan as FloorPlanModel, Wall } from '../../core/models/wifi.models';
import { StorageService } from '../../core/services/storage.service';
import { WifiService } from '../../core/services/wifi.service';

@Component({
  imports: [CoverageCanvas],
  selector: 'app-floor-plan',
  styleUrl: './floor-plan.scss',
  templateUrl: './floor-plan.html',
})
export class FloorPlan {
  protected readonly wifi = inject(WifiService);
  private readonly storage = inject(StorageService);

  protected readonly tool = signal<'select' | 'wall'>('select');
  protected readonly wallType = signal<Wall['type']>('drywall');
  protected readonly status = signal('Drag the router to position it, or choose Draw wall to add an obstacle.');
  protected readonly floorPlan = computed<FloorPlanModel>(() => ({
    width: 800,
    height: 520,
    devices: this.wifi.devices(),
    walls: this.wifi.walls(),
    measurements: [],
  }));

  constructor() {
    try {
      const saved = this.storage.loadFloorPlan();
      if (saved) {
        this.wifi.setLayout(saved);
        this.status.set('Restored the saved floor plan.');
      }
    } catch (error) {
      this.status.set(
        `Could not load the saved layout: ${error instanceof Error ? error.message : 'unknown storage error'}`,
      );
    }
  }

  protected addMeshNode(): void {
    const meshCount = this.wifi.devices().filter((device) => device.type === 'mesh').length;
    this.wifi.addMeshNode(570 + (meshCount % 3) * 55, 260 + Math.floor(meshCount / 3) * 55);
    this.status.set('Mesh node added. Drag it to the desired position.');
  }

  protected onWallTypeChange(event: Event): void {
    if (!(event.target instanceof HTMLSelectElement)) return;
    const value = event.target.value;
    if (value === 'drywall' || value === 'wood' || value === 'brick' || value === 'concrete') {
      this.wallType.set(value);
    }
  }

  protected saveLayout(): void {
    try {
      this.storage.saveFloorPlan(this.floorPlan());
      this.status.set('Floor plan saved in this browser.');
    } catch (error) {
      this.status.set(
        `Could not save the floor plan: ${error instanceof Error ? error.message : 'unknown storage error'}`,
      );
    }
  }

  protected loadLayout(): void {
    try {
      const saved = this.storage.loadFloorPlan();
      if (!saved) {
        this.status.set('No saved floor plan was found in this browser.');
        return;
      }
      this.wifi.setLayout(saved);
      this.status.set('Saved floor plan loaded.');
    } catch (error) {
      this.status.set(
        `Could not load the saved layout: ${error instanceof Error ? error.message : 'unknown storage error'}`,
      );
    }
  }

  protected removeWall(id: string): void {
    this.wifi.removeWall(id);
    this.status.set('Wall removed.');
  }
}
