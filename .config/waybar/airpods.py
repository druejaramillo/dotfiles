#!/usr/bin/env python3
"""
AirPods battery monitor for Waybar using Apple's AAP protocol.
Registers a BlueZ Profile1 to receive the L2CAP socket, then reads
battery notifications and outputs JSON for Waybar's custom module.

Click-to-connect/disconnect is handled via SIGUSR1.

Based on protocol from:
https://github.com/maniacx/Bluetooth-Battery-Meter
"""

import argparse
import json
import os
import signal
import socket
import subprocess
import sys
import threading
import time
import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning)

import gi
gi.require_version("Gio", "2.0")
gi.require_version("GLib", "2.0")
from gi.repository import Gio, GLib

# Apple Accessory Protocol (AAP) constants
AIRPODS_UUID = "74ec2172-0bad-4d01-8f77-997b2be0722a"
PROFILE_PATH = "/com/airpods/waybar/profile"

HANDSHAKE = bytes([
    0x00, 0x00, 0x04, 0x00, 0x01, 0x00, 0x02, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
])
REQUEST_NOTIFICATIONS = bytes([
    0x04, 0x00, 0x04, 0x00, 0x0f, 0x00, 0xff, 0xff, 0xff, 0xff,
])
BATTERY_PREFIX = bytes([0x04, 0x00, 0x04, 0x00, 0x04, 0x00])

BATT_SINGLE = 0x01
BATT_RIGHT  = 0x02
BATT_LEFT   = 0x04
BATT_CASE   = 0x08

CONNECT_TIMEOUT = 15  # seconds

PROFILE_XML = """
<node>
  <interface name="org.bluez.Profile1">
    <method name="Release"/>
    <method name="NewConnection">
      <arg type="o" name="device" direction="in"/>
      <arg type="h" name="fd" direction="in"/>
      <arg type="a{sv}" name="fd_properties" direction="in"/>
    </method>
    <method name="RequestDisconnection">
      <arg type="o" name="device" direction="in"/>
    </method>
  </interface>
</node>
"""

# --- Global state ---

mac = None
device_path = None

state = {
    "left": None, "right": None, "case": None,
    "left_charging": False, "right_charging": False, "case_charging": False,
    "connected": False,
    "connecting": False,
}

_bus = None
_connecting_timer = None


# --- Waybar output ---

def output():
    if state["connecting"]:
        data = {
            "text": "",
            "tooltip": "AirPods connecting\u2026",
            "class": "connecting",
            "alt": "connecting",
        }
    elif not state["connected"]:
        data = {
            "text": "",
            "tooltip": "AirPods disconnected",
            "class": "disconnected",
            "alt": "disconnected",
        }
    else:
        levels = []
        tooltip_parts = []

        left, right, case = state["left"], state["right"], state["case"]

        if left is not None and right is not None:
            levels.append((left + right) // 2)
            lc = " \u26a1" if state["left_charging"] else ""
            rc = " \u26a1" if state["right_charging"] else ""
            tooltip_parts.append(f"L: {left}%{lc}  R: {right}%{rc}")
        elif left is not None:
            levels.append(left)
            c = " \u26a1" if state["left_charging"] else ""
            tooltip_parts.append(f"L: {left}%{c}")
        elif right is not None:
            levels.append(right)
            c = " \u26a1" if state["right_charging"] else ""
            tooltip_parts.append(f"R: {right}%{c}")

        if case is not None:
            c = " \u26a1" if state["case_charging"] else ""
            tooltip_parts.append(f"Case: {case}%{c}")

        if levels:
            avg = levels[0]
            cls = "critical" if avg <= 20 else "warning" if avg <= 40 else "good"
            data = {
                "text": f"{avg}%",
                "tooltip": "AirPods\n" + "\n".join(tooltip_parts),
                "class": cls,
                "alt": "connected",
            }
        else:
            data = {
                "text": "",
                "tooltip": "AirPods connected (waiting for battery)",
                "class": "good",
                "alt": "connected",
            }

    print(json.dumps(data), flush=True)


# --- AAP battery parsing ---

def parse_battery(data):
    if len(data) < 12 or data[:6] != BATTERY_PREFIX:
        return
    count = data[6]
    if count < 1 or count > 3:
        return
    pos = 7
    for _ in range(count):
        if pos + 4 >= len(data):
            break
        btype = data[pos]
        raw_level = data[pos + 2]
        status = data[pos + 3]
        charging = (status & 0x01) != 0
        disconnected = (status & 0x04) != 0

        level = None if raw_level > 100 or disconnected else raw_level

        if btype in (BATT_SINGLE, BATT_LEFT) and level is not None:
            state["left"] = level
            state["left_charging"] = charging
        elif btype == BATT_RIGHT and level is not None:
            state["right"] = level
            state["right_charging"] = charging
        elif btype == BATT_CASE and level is not None:
            state["case"] = level
            state["case_charging"] = charging
        pos += 5
    output()


def socket_reader(fd):
    owned_fd = os.dup(fd)
    sock = socket.socket(fileno=owned_fd)
    sock.setblocking(True)
    sock.settimeout(30)
    try:
        sock.sendall(HANDSHAKE)
        time.sleep(0.3)
        sock.sendall(REQUEST_NOTIFICATIONS)

        while True:
            try:
                data = sock.recv(1024)
                if not data:
                    break
                parse_battery(data)
            except socket.timeout:
                try:
                    sock.sendall(REQUEST_NOTIFICATIONS)
                except Exception:
                    break
    except Exception as e:
        sys.stderr.write(f"airpods: socket error: {e}\n")
    finally:
        try:
            sock.shutdown(socket.SHUT_RDWR)
        except Exception:
            pass
        sock.close()
        state.update(connected=False, left=None, right=None, case=None)
        output()


# --- BlueZ Profile1 server ---

class ProfileServer:
    def __init__(self, bus):
        self._bus = bus
        self._reg_id = 0
        self._iface = Gio.DBusNodeInfo.new_for_xml(PROFILE_XML).interfaces[0]

    def register(self):
        self._reg_id = self._bus.register_object(
            PROFILE_PATH, self._iface, self._on_method_call, None, None,
        )
        proxy = Gio.DBusProxy.new_sync(
            self._bus, Gio.DBusProxyFlags.NONE, None,
            "org.bluez", "/org/bluez", "org.bluez.ProfileManager1", None,
        )
        proxy.call_sync(
            "RegisterProfile",
            GLib.Variant.new_tuple(
                GLib.Variant("o", PROFILE_PATH),
                GLib.Variant("s", AIRPODS_UUID),
                GLib.Variant("a{sv}", {
                    "Name": GLib.Variant("s", "AirPods Waybar"),
                    "Role": GLib.Variant("s", "client"),
                    "AutoConnect": GLib.Variant("b", True),
                }),
            ),
            Gio.DBusCallFlags.NONE, -1, None,
        )

    def unregister(self):
        if self._reg_id:
            self._bus.unregister_object(self._reg_id)
            self._reg_id = 0
        try:
            proxy = Gio.DBusProxy.new_sync(
                self._bus, Gio.DBusProxyFlags.NONE, None,
                "org.bluez", "/org/bluez", "org.bluez.ProfileManager1", None,
            )
            proxy.call_sync(
                "UnregisterProfile",
                GLib.Variant.new_tuple(GLib.Variant("o", PROFILE_PATH)),
                Gio.DBusCallFlags.NONE, -1, None,
            )
        except Exception:
            pass

    def _on_method_call(self, conn, sender, path, iface, method, params, invocation):
        if method == "NewConnection":
            _, fd_index, _ = params.unpack()
            fd = invocation.get_message().get_unix_fd_list().get(fd_index)
            state["connected"] = True
            output()
            threading.Thread(target=socket_reader, args=(fd,), daemon=True).start()
        elif method == "RequestDisconnection":
            state.update(connected=False, left=None, right=None, case=None)
            output()
        invocation.return_value(None)


# --- BlueZ helpers ---

def check_connected(bus):
    try:
        proxy = Gio.DBusProxy.new_sync(
            bus, Gio.DBusProxyFlags.NONE, None,
            "org.bluez", device_path, "org.bluez.Device1", None,
        )
        val = proxy.get_cached_property("Connected")
        return val.get_boolean() if val else False
    except Exception:
        return False


def connect_profile(bus):
    proxy = Gio.DBusProxy.new_sync(
        bus, Gio.DBusProxyFlags.NONE, None,
        "org.bluez", device_path, "org.bluez.Device1", None,
    )
    for attempt in range(4):
        try:
            proxy.call_sync(
                "ConnectProfile",
                GLib.Variant.new_tuple(GLib.Variant("s", AIRPODS_UUID)),
                Gio.DBusCallFlags.NONE, 5000, None,
            )
            return
        except Exception as e:
            if "InProgress" in str(e) or "busy" in str(e):
                time.sleep(1 + attempt)
                continue
            sys.stderr.write(f"airpods: ConnectProfile: {e}\n")
            return


# --- Click-to-toggle via SIGUSR1 ---

def _on_toggle():
    global _connecting_timer

    if state["connecting"]:
        return True

    if state["connected"]:
        threading.Thread(target=_do_disconnect, daemon=True).start()
    else:
        state["connecting"] = True
        output()
        _connecting_timer = threading.Timer(CONNECT_TIMEOUT, _on_connect_timeout)
        _connecting_timer.daemon = True
        _connecting_timer.start()
        threading.Thread(target=_do_connect, daemon=True).start()

    return True  # keep the signal handler registered


def _do_connect():
    try:
        subprocess.run(["rfkill", "unblock", "bluetooth"], stderr=subprocess.DEVNULL)
        subprocess.run(
            ["bluetoothctl", "connect", mac],
            timeout=CONNECT_TIMEOUT, capture_output=True,
        )
    except Exception as e:
        sys.stderr.write(f"airpods: connect error: {e}\n")


def _do_disconnect():
    try:
        subprocess.run(
            ["bluetoothctl", "disconnect", mac],
            timeout=10, capture_output=True,
        )
    except Exception as e:
        sys.stderr.write(f"airpods: disconnect error: {e}\n")


def _on_connect_timeout():
    if state["connecting"] and not state["connected"]:
        state["connecting"] = False
        output()
        sys.stderr.write("airpods: connection timed out\n")


# --- Main ---

def main():
    global mac, device_path, _bus, _connecting_timer

    parser = argparse.ArgumentParser(description="AirPods battery monitor for Waybar")
    parser.add_argument("mac", nargs="?", default=os.environ.get("AIRPODS_MAC"),
                        help="Bluetooth MAC address (or set AIRPODS_MAC env var)")
    args = parser.parse_args()

    if not args.mac:
        print("Usage: airpods.py <MAC> or set AIRPODS_MAC", file=sys.stderr)
        sys.exit(1)

    mac = args.mac
    device_path = "/org/bluez/hci0/dev_" + mac.replace(":", "_")

    _bus = Gio.bus_get_sync(Gio.BusType.SYSTEM, None)

    server = ProfileServer(_bus)
    try:
        server.register()
    except Exception as e:
        print(json.dumps({
            "text": "err", "tooltip": f"Profile registration failed: {e}",
            "class": "critical",
        }), flush=True)
        sys.exit(1)

    if check_connected(_bus):
        state["connected"] = True
        output()
        threading.Thread(target=connect_profile, args=(_bus,), daemon=True).start()

    def on_props_changed(conn, sender, path, iface, signal_name, params):
        global _connecting_timer
        if path != device_path:
            return
        iface_name, changed, _ = params.unpack()
        if iface_name != "org.bluez.Device1" or "Connected" not in changed:
            return
        connected = bool(changed["Connected"])
        state["connected"] = connected
        if connected:
            state["connecting"] = False
            if _connecting_timer:
                _connecting_timer.cancel()
            threading.Thread(target=connect_profile, args=(_bus,), daemon=True).start()
        else:
            state.update(left=None, right=None, case=None)
        output()

    _bus.signal_subscribe(
        "org.bluez", "org.freedesktop.DBus.Properties", "PropertiesChanged",
        device_path, None, Gio.DBusSignalFlags.NONE, on_props_changed,
    )

    output()

    loop = GLib.MainLoop()
    GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGUSR1, _on_toggle)
    GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGTERM, loop.quit)
    GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGINT, loop.quit)

    try:
        loop.run()
    finally:
        server.unregister()


if __name__ == "__main__":
    main()
