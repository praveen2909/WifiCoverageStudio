import { CoverageService } from './coverage.service';
import { WifiDevice, Wall } from '../models/wifi.models';

describe('CoverageService', () => {
  const service = new CoverageService();
  const router: WifiDevice = {
    id: 'router',
    name: 'Router',
    type: 'router',
    x: 0,
    y: 0,
    signalStrength: -40,
    frequency: '5GHz',
    power: 100,
  };

  it('calculates distance loss and clamps the signal range', () => {
    expect(service.getSignalStrength(10, 0, router, [])).toBe(-60);
    expect(service.getSignalStrength(0, 0, router, [])).toBe(-40);
  });

  it('supports scaling floor-plan pixels to meters', () => {
    expect(service.getSignalStrength(200, 0, router, [], 0.05)).toBe(-60);
  });

  it('estimates distance from RSSI using the indoor path-loss model', () => {
    expect(service.getEstimatedDistance(-40)).toBe(1);
    expect(service.getEstimatedDistance(-55)).toBeCloseTo(3.59, 2);
    expect(service.getEstimatedDistance(Number.NaN)).toBeNull();
  });

  it('anchors estimated distance to a user-provided calibration point', () => {
    const calibration = { distanceMeters: 20, rssiDbm: -56 };

    expect(service.getEstimatedDistance(-56, calibration)).toBe(20);
    expect(service.getEstimatedDistance(-56 - 27, calibration)).toBeCloseTo(200, 8);
    expect(
      service.getEstimatedDistance(-56, { distanceMeters: 0, rssiDbm: -56 }),
    ).toBeNull();
  });

  it('checks whether a point is within range of any access point', () => {
    expect(service.isWithinRange(100, 0, [router], 5, 0.05)).toBe(true);
    expect(service.isWithinRange(101, 0, [router], 5, 0.05)).toBe(false);
    expect(service.isWithinRange(0, 0, [], 5, 0.05)).toBe(false);
  });

  it('subtracts attenuation for walls crossed by the signal path', () => {
    const wall: Wall = {
      id: 'wall',
      x1: 5,
      y1: -1,
      x2: 5,
      y2: 1,
      type: 'brick',
      attenuation: 8,
    };

    expect(service.getSignalStrength(10, 0, router, [wall])).toBe(-68);
  });

  it('maps signal strengths to quality labels and colors', () => {
    expect(service.getSignalQuality(-48)).toBe('excellent');
    expect(service.getSignalQuality(-56)).toBe('good');
    expect(service.getSignalQuality(-66)).toBe('fair');
    expect(service.getSignalQuality(-76)).toBe('weak');
    expect(service.getSignalQuality(-86)).toBe('poor');
    expect(service.getSignalColor(-86)).toBe('#ef4444');
  });
});
