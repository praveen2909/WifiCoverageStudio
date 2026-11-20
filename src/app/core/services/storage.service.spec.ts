import { FloorPlan } from '../models/wifi.models';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  const service = new StorageService();
  const key = 'wifi-coverage-studio.floor-plan';
  const layout: FloorPlan = {
    width: 800,
    height: 520,
    devices: [
      {
        id: 'router',
        name: 'Router',
        type: 'router',
        x: 400,
        y: 260,
        signalStrength: -40,
        frequency: '5GHz',
        power: 100,
      },
    ],
    walls: [
      {
        id: 'wall',
        x1: 200,
        y1: 100,
        x2: 300,
        y2: 100,
        type: 'drywall',
        attenuation: 3,
      },
    ],
    measurements: [
      {
        id: 'reading',
        x: 450,
        y: 250,
        signalStrength: -55,
        timestamp: new Date('2026-01-01T00:00:00.000Z'),
      },
    ],
  };

  beforeEach(() => localStorage.clear());

  it('round-trips layout, walls, and measurement timestamps', () => {
    service.saveFloorPlan(layout);

    expect(service.loadFloorPlan()).toEqual(layout);
  });

  it('rejects invalid saved layout data', () => {
    localStorage.setItem(
      key,
      JSON.stringify({
        width: 800,
        height: 520,
        devices: [{ id: 'router', x: 'bad' }],
        walls: [],
        measurements: [],
      }),
    );

    expect(() => service.loadFloorPlan()).toThrow('Saved floor plan data is invalid.');
  });

  it('saves and restores distance calibration locally', () => {
    const calibration = { distanceMeters: 20, rssiDbm: -56 };

    service.saveDistanceCalibration(calibration);

    expect(service.loadDistanceCalibration()).toEqual(calibration);
    service.clearDistanceCalibration();
    expect(service.loadDistanceCalibration()).toBeNull();
  });

  it('rejects unsupported calibration values', () => {
    expect(() => service.saveDistanceCalibration({ distanceMeters: 0, rssiDbm: -56 })).toThrow(
      'Distance calibration values are outside the supported range.',
    );
    expect(() => service.saveDistanceCalibration({ distanceMeters: 20, rssiDbm: -121 })).toThrow(
      'Distance calibration values are outside the supported range.',
    );
  });
});
