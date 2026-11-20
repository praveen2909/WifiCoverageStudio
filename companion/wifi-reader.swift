import CoreWLAN
import CoreLocation
import Foundation

final class LocationPermissionRequester: NSObject, CLLocationManagerDelegate {
    let manager = CLLocationManager()

    override init() {
        super.init()
        manager.delegate = self
        requestPermissionIfNeeded()
    }

    func requestPermissionIfNeeded() {
        switch manager.authorizationStatus {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .restricted, .denied:
            break
        case .authorized, .authorizedAlways:
            break
        @unknown default:
            break
        }
    }

    var isAuthorized: Bool {
        switch manager.authorizationStatus {
        case .authorized, .authorizedAlways:
            return true
        default:
            return false
        }
    }

    var permissionError: String? {
        switch manager.authorizationStatus {
        case .denied:
            return "Location access is disabled for WiFi Coverage Studio Companion. Enable it in System Settings > Privacy & Security > Location Services."
        case .restricted:
            return "Location access is restricted by macOS for WiFi Coverage Studio Companion."
        case .notDetermined:
            return "Waiting for Location Services permission. Allow access when macOS prompts."
        case .authorized, .authorizedAlways:
            return nil
        @unknown default:
            return "macOS returned an unknown Location Services authorization state."
        }
    }
}

let locationPermissionRequester = LocationPermissionRequester()

func currentReading() -> [String: Any] {
    let timestamp = ISO8601DateFormatter().string(from: Date())

    guard let wifi = CWWiFiClient.shared().interface() else {
        return [
            "connected": false,
            "ssid": NSNull(),
            "rssiDbm": NSNull(),
            "channel": NSNull(),
            "timestamp": timestamp,
            "error": "No macOS Wi-Fi interface was found."
        ]
    }

    guard wifi.powerOn(), let channel = wifi.wlanChannel() else {
        return [
            "connected": false,
            "ssid": NSNull(),
            "rssiDbm": NSNull(),
            "channel": NSNull(),
            "timestamp": timestamp,
            "error": "No active Wi-Fi connection."
        ]
    }

    let networkName = wifi.ssid()
    let error: Any
    if networkName != nil {
        error = NSNull()
    } else if let permissionError = locationPermissionRequester.permissionError {
        error = permissionError
    } else {
        error = "Wi-Fi name is unavailable. Restart the companion after enabling Location Services."
    }

    return [
        "connected": true,
        "ssid": networkName ?? NSNull() as Any,
        "rssiDbm": wifi.rssiValue(),
        "channel": Int(channel.channelNumber),
        "timestamp": timestamp,
        "error": error
    ]
}

while true {
    do {
        let data = try JSONSerialization.data(withJSONObject: currentReading(), options: [.sortedKeys])
        if let line = String(data: data, encoding: .utf8) {
            print(line)
            fflush(stdout)
        }
    } catch {
        fputs("Unable to encode Wi-Fi reading: \(error)\n", stderr)
    }

    RunLoop.current.run(until: Date(timeIntervalSinceNow: 1))
}
