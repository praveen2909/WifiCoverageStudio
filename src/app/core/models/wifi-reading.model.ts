export interface WifiReading {
  connected: boolean;
  ssid: string | null;
  rssiDbm: number | null;
  channel: number | null;
  routerIp?: string | null;
  routerIpError?: string | null;
  timestamp: string | null;
  error: string | null;
}
