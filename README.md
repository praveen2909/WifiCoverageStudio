# WiFi Coverage Studio

An Angular standalone application for monitoring Wi-Fi signal and planning home coverage. Angular Material provides the UI theme and component foundation.

## Development

```bash
npm install
npm start
```

Open `http://localhost:4200/`. Routes are available for the dashboard, coverage map, Wi-Fi monitor, floor plan, mesh simulator, and settings.

The dashboard reads signal strength in dBm and the local default gateway IP from the macOS companion. It labels the gateway as the router; macOS does not reliably expose the router's hardware/model name. The SSID is not shown. When RSSI is available, the dashboard also shows a rough access-point distance estimate assuming -40 dBm at 1 m and typical indoor signal loss. This is not a measured distance: walls, router transmit power, and the connected access point can significantly affect the result.

The optional **Look up provider** dashboard action calls the local companion, which sends the request to [IPinfo Lite](https://ipinfo.io/lite) only after you click. IPinfo receives the public IP address and returns ASN organization data; this is an estimate of the network owner, not the Wi-Fi SSID or always the retail ISP. The Angular app never receives the IPinfo token.

The dashboard distance graphic uses a rough indoor RSSI model by default. To calibrate it, enter a known access-point distance (for example, 20 m) while at that location and select **Calibrate from current signal**. The browser stores that distance and current RSSI locally. Future distance values are estimates anchored to that point; changing rooms, band, router power, or obstacles can still affect accuracy.

Create a free IPinfo account and provide its token to the companion process as an environment variable:

Set the token when starting the companion with `IPINFO_TOKEN="your-ipinfo-token" npm start`. Provider lookup remains unavailable when no token is configured, but live Wi-Fi readings continue to work.

Do not put the token in Angular source, browser storage, or a committed file. If no token is configured, the companion reports that explicitly and does not send an IPinfo request. See [IPinfo Lite API documentation](https://ipinfo.io/developers/lite-api) for fields, account setup, and current plan details.

## Live Wi-Fi readings (macOS)

In one terminal, build and start the companion:

```bash
cd companion
npm run build
npm start
```

In another terminal, start the Angular app with `npm start`. The dashboard polls the companion every two seconds at `127.0.0.1:8765`. The companion binds to loopback, reads the local default gateway using macOS's route table, and accepts browser requests only from the local Angular development origin. The gateway IP is local network information and is not sent to an external provider. Rebuilding an unsigned app with a new ad-hoc signature can reset macOS permissions; for a permanent installation, sign the app with one stable Developer ID or Apple Development identity before distribution. The current native reader supports macOS; Windows and Linux readers are not implemented yet.

The build ad-hoc signs the complete app bundle if `CODESIGN_IDENTITY` is not set. Ad-hoc signatures are tied to the build's code hash, so rebuilding can make macOS disable/forget the Location Services grant. For a stable grant, install an Apple Development or Developer ID signing certificate in the login keychain, then build with its exact identity:

```bash
cd companion
security find-identity -v -p codesigning
CODESIGN_IDENTITY="Apple Development: Your Name (TEAMID)" npm run build
```

Use the identity exactly as printed by `security find-identity`. Rebuilds signed with the same identity and bundle identifier preserve a stable macOS code requirement. After signing, restart the companion and enable **WiFi Coverage Studio Companion** under **System Settings → Privacy & Security → Location Services**.

## Core services

- `WifiService` stores reactive device, wall, and signal state.
- `CoverageService` estimates signal strength using distance loss and wall attenuation.
- `StorageService` persists floor-plan data in browser local storage.

Coverage results are estimates, not measured guarantees.

## Version 1 layout editor

Open **Floor plan** to drag the router or mesh nodes, add mesh nodes, and draw walls with material-specific attenuation. Save/load stores the device and wall layout in browser local storage. **Coverage map** displays the same layout as a read-only heatmap and includes an adjustable 1–50 m modeled range. Areas outside that radius from every access point are shaded; the range is a planning control, not a measured router specification. The floor-plan editor currently uses a fixed 800 × 520 coordinate space and estimates distance at 20 pixels per meter.

## Development roadmap

**Version 1:** Architecture, data models, coverage engine, Wi-Fi service, dashboard, interactive heatmap, draggable devices, walls, mesh nodes, and browser layout save/load are implemented.

**Version 2:** Live macOS RSSI reading is implemented in the companion. Automatic walk-test recording, floor-plan measurement capture, desktop packaging, and coverage report export remain planned.

## Build and tests

```bash
npm run build
npm test -- --watch=false
```
