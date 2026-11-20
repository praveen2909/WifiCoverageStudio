export type SignalQuality = 'excellent' | 'good' | 'fair' | 'weak' | 'poor';

export type WifiFrequency = '2.4GHz' | '5GHz' | '6GHz';

export type DeviceType = 'router' | 'mesh';

export interface WifiDevice {
  id: string;
  name: string;
  type: DeviceType;
  x: number;
  y: number;
  signalStrength: number;
  frequency: WifiFrequency;
  power: number;
}

export interface Wall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: 'drywall' | 'brick' | 'concrete' | 'wood';
  attenuation: number;
}

export interface MeasurementPoint {
  id: string;
  x: number;
  y: number;
  signalStrength: number;
  timestamp: Date;
}

export interface DistanceCalibration {
  distanceMeters: number;
  rssiDbm: number;
}

export interface FloorPlan {
  width: number;
  height: number;
  devices: WifiDevice[];
  walls: Wall[];
  measurements: MeasurementPoint[];
}
