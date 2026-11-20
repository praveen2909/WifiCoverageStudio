import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { FloorPlan, WifiDevice, Wall } from '../models/wifi.models';
import { WifiReading } from '../models/wifi-reading.model';
import { catchError, EMPTY, switchMap, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WifiService {
  private readonly http = inject(HttpClient);
  private readonly readingUrl = 'http://127.0.0.1:8765/api/v1/wifi/current';

  readonly reading = signal<WifiReading | null>(null);
  readonly companionConnected = signal(false);
  readonly companionError = signal<string | null>('Waiting for the local Wi-Fi companion.');
  readonly devices = signal<WifiDevice[]>([
    {
      id: 'router-1',
      name: 'Router',
      type: 'router',
      x: 400,
      y: 260,
      signalStrength: -40,
      frequency: '5GHz',
      power: 100,
    },
  ]);
  readonly walls = signal<Wall[]>([]);

  constructor() {
    timer(0, 2000)
      .pipe(
        switchMap(() =>
          this.http.get<unknown>(this.readingUrl).pipe(
            switchMap((value) => {
              if (!this.isWifiReading(value)) {
                this.reading.set(null);
                this.companionConnected.set(false);
                this.companionError.set('The Wi-Fi companion returned an invalid reading.');
                return EMPTY;
              }

              this.reading.set(value);
              this.companionConnected.set(true);
              this.companionError.set(null);
              return EMPTY;
            }),
            catchError(() => {
              this.reading.set(null);
              this.companionConnected.set(false);
              this.companionError.set(
                'Cannot reach the local Wi-Fi companion. Start it to view live network data.',
              );
              return EMPTY;
            }),
          ),
        ),
      )
      .subscribe();
  }

  addMeshNode(x: number, y: number): void {
    const mesh: WifiDevice = {
      id: crypto.randomUUID(),
      name: 'Mesh Node',
      type: 'mesh',
      x,
      y,
      signalStrength: -40,
      frequency: '5GHz',
      power: 100,
    };

    this.devices.update((devices) => [...devices, mesh]);
  }

  moveDevice(id: string, x: number, y: number): void {
    this.devices.update((devices) =>
      devices.map((device) => (device.id === id ? { ...device, x, y } : device)),
    );
  }

  addWall(wall: Omit<Wall, 'id'>): void {
    this.walls.update((walls) => [...walls, { ...wall, id: crypto.randomUUID() }]);
  }

  removeWall(id: string): void {
    this.walls.update((walls) => walls.filter((wall) => wall.id !== id));
  }

  setLayout(layout: Pick<FloorPlan, 'devices' | 'walls'>): void {
    this.devices.set(layout.devices);
    this.walls.set(layout.walls);
  }

  private isWifiReading(value: unknown): value is WifiReading {
    if (typeof value !== 'object' || value === null) return false;
    const reading = value as Record<string, unknown>;

    return (
      typeof reading['connected'] === 'boolean' &&
      (typeof reading['ssid'] === 'string' || reading['ssid'] === null) &&
      (typeof reading['rssiDbm'] === 'number' || reading['rssiDbm'] === null) &&
      (typeof reading['channel'] === 'number' || reading['channel'] === null) &&
      (typeof reading['timestamp'] === 'string' || reading['timestamp'] === null) &&
      (typeof reading['error'] === 'string' || reading['error'] === null)
    );
  }
}
