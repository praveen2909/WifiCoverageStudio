import { Injectable } from '@angular/core';
import { DistanceCalibration, FloorPlan, MeasurementPoint } from '../models/wifi.models';

const FLOOR_PLAN_STORAGE_KEY = 'wifi-coverage-studio.floor-plan';
const DISTANCE_CALIBRATION_STORAGE_KEY = 'wifi-coverage-studio.distance-calibration';

interface StoredFloorPlan extends Omit<FloorPlan, 'measurements'> {
  measurements: Array<Omit<MeasurementPoint, 'timestamp'> & { timestamp: string }>;
}

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  saveFloorPlan(floorPlan: FloorPlan): void {
    const stored: StoredFloorPlan = {
      ...floorPlan,
      measurements: floorPlan.measurements.map((measurement) => ({
        ...measurement,
        timestamp: measurement.timestamp.toISOString(),
      })),
    };

    localStorage.setItem(FLOOR_PLAN_STORAGE_KEY, JSON.stringify(stored));
  }

  loadFloorPlan(): FloorPlan | null {
    const value = localStorage.getItem(FLOOR_PLAN_STORAGE_KEY);
    if (value === null) return null;

    const stored: unknown = JSON.parse(value);
    if (!this.isStoredFloorPlan(stored)) {
      throw new Error('Saved floor plan data is invalid.');
    }

    return {
      ...stored,
      measurements: stored.measurements.map((measurement) => ({
        ...measurement,
        timestamp: new Date(measurement.timestamp),
      })),
    };
  }

  clearFloorPlan(): void {
    localStorage.removeItem(FLOOR_PLAN_STORAGE_KEY);
  }

  saveDistanceCalibration(calibration: DistanceCalibration): void {
    if (
      !Number.isFinite(calibration.distanceMeters) ||
      calibration.distanceMeters <= 0 ||
      calibration.distanceMeters > 1000 ||
      !Number.isFinite(calibration.rssiDbm) ||
      calibration.rssiDbm < -120 ||
      calibration.rssiDbm > 0
    ) {
      throw new Error('Distance calibration values are outside the supported range.');
    }

    localStorage.setItem(DISTANCE_CALIBRATION_STORAGE_KEY, JSON.stringify(calibration));
  }

  loadDistanceCalibration(): DistanceCalibration | null {
    const value = localStorage.getItem(DISTANCE_CALIBRATION_STORAGE_KEY);
    if (value === null) return null;

    const calibration: unknown = JSON.parse(value);
    if (
      typeof calibration !== 'object' ||
      calibration === null ||
      !this.isFiniteNumber((calibration as Record<string, unknown>)['distanceMeters']) ||
      !this.isFiniteNumber((calibration as Record<string, unknown>)['rssiDbm'])
    ) {
      throw new Error('Saved distance calibration data is invalid.');
    }

    const validCalibration = calibration as DistanceCalibration;
    if (
      validCalibration.distanceMeters <= 0 ||
      validCalibration.distanceMeters > 1000 ||
      validCalibration.rssiDbm < -120 ||
      validCalibration.rssiDbm > 0
    ) {
      throw new Error('Saved distance calibration data is outside the supported range.');
    }

    return validCalibration;
  }

  clearDistanceCalibration(): void {
    localStorage.removeItem(DISTANCE_CALIBRATION_STORAGE_KEY);
  }

  private isStoredFloorPlan(value: unknown): value is StoredFloorPlan {
    if (typeof value !== 'object' || value === null) return false;
    const plan = value as Record<string, unknown>;

    const width = plan['width'];
    const height = plan['height'];
    return (
      this.isFiniteNumber(width) &&
      this.isFiniteNumber(height) &&
      width > 0 &&
      height > 0 &&
      Array.isArray(plan['devices']) &&
      plan['devices'].every((device) => this.isStoredDevice(device, width, height)) &&
      Array.isArray(plan['walls']) &&
      plan['walls'].every((wall) => this.isStoredWall(wall, width, height)) &&
      Array.isArray(plan['measurements']) &&
      plan['measurements'].every((measurement) =>
        this.isStoredMeasurement(measurement, width, height),
      )
    );
  }

  private isStoredDevice(value: unknown, width: number, height: number): value is FloorPlan['devices'][number] {
    if (typeof value !== 'object' || value === null) return false;
    const device = value as Record<string, unknown>;
    return (
      typeof device['id'] === 'string' &&
      typeof device['name'] === 'string' &&
      (device['type'] === 'router' || device['type'] === 'mesh') &&
      this.isCoordinate(device['x'], width) &&
      this.isCoordinate(device['y'], height) &&
      this.isFiniteNumber(device['signalStrength']) &&
      (device['frequency'] === '2.4GHz' ||
        device['frequency'] === '5GHz' ||
        device['frequency'] === '6GHz') &&
      this.isFiniteNumber(device['power'])
    );
  }

  private isStoredWall(value: unknown, width: number, height: number): value is FloorPlan['walls'][number] {
    if (typeof value !== 'object' || value === null) return false;
    const wall = value as Record<string, unknown>;
    return (
      typeof wall['id'] === 'string' &&
      this.isCoordinate(wall['x1'], width) &&
      this.isCoordinate(wall['x2'], width) &&
      this.isCoordinate(wall['y1'], height) &&
      this.isCoordinate(wall['y2'], height) &&
      (wall['type'] === 'drywall' ||
        wall['type'] === 'brick' ||
        wall['type'] === 'concrete' ||
        wall['type'] === 'wood') &&
      this.isFiniteNumber(wall['attenuation']) &&
      wall['attenuation'] >= 0
    );
  }

  private isStoredMeasurement(
    value: unknown,
    width: number,
    height: number,
  ): value is StoredFloorPlan['measurements'][number] {
    if (typeof value !== 'object' || value === null) return false;
    const measurement = value as Record<string, unknown>;
    return (
      typeof measurement['id'] === 'string' &&
      this.isCoordinate(measurement['x'], width) &&
      this.isCoordinate(measurement['y'], height) &&
      this.isFiniteNumber(measurement['signalStrength']) &&
      typeof measurement['timestamp'] === 'string' &&
      Number.isFinite(Date.parse(measurement['timestamp']))
    );
  }

  private isCoordinate(value: unknown, limit: number): value is number {
    return this.isFiniteNumber(value) && value >= 0 && value <= limit;
  }

  private isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }
}
