export interface WifiReading {
  connected: boolean;
  ssid: string | null;
  rssiDbm: number | null;
  channel: number | null;
  timestamp: string | null;
  error: string | null;
}
