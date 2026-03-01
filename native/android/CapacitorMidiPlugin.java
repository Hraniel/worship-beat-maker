package app.lovable.glorypads.plugins;

import android.content.Context;
import android.media.midi.MidiDevice;
import android.media.midi.MidiDeviceInfo;
import android.media.midi.MidiInputPort;
import android.media.midi.MidiManager;
import android.media.midi.MidiOutputPort;
import android.media.midi.MidiReceiver;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "CapacitorMidi")
public class CapacitorMidiPlugin extends Plugin {

    private static final String TAG = "CapacitorMidi";
    private MidiManager midiManager;
    private final List<MidiDevice> openDevices = new ArrayList<>();
    private final List<MidiOutputPort> openPorts = new ArrayList<>();
    private MidiManager.DeviceCallback deviceCallback;

    @Override
    public void load() {
        midiManager = (MidiManager) getContext().getSystemService(Context.MIDI_SERVICE);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (midiManager == null) {
            call.reject("MIDI not supported on this device");
            return;
        }

        // Register device callback
        deviceCallback = new MidiManager.DeviceCallback() {
            @Override
            public void onDeviceAdded(MidiDeviceInfo device) {
                connectToDevice(device);
                notifyDeviceChange();
            }

            @Override
            public void onDeviceRemoved(MidiDeviceInfo device) {
                notifyDeviceChange();
            }
        };

        midiManager.registerDeviceCallback(deviceCallback, new Handler(Looper.getMainLooper()));

        // Connect to already-present devices
        MidiDeviceInfo[] infos = midiManager.getDevices();
        for (MidiDeviceInfo info : infos) {
            connectToDevice(info);
        }

        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (deviceCallback != null && midiManager != null) {
            midiManager.unregisterDeviceCallback(deviceCallback);
            deviceCallback = null;
        }
        for (MidiOutputPort port : openPorts) {
            try { port.close(); } catch (IOException ignored) {}
        }
        openPorts.clear();
        for (MidiDevice device : openDevices) {
            try { device.close(); } catch (IOException ignored) {}
        }
        openDevices.clear();
        call.resolve();
    }

    @PluginMethod
    public void getDevices(PluginCall call) {
        if (midiManager == null) {
            call.resolve(new JSObject().put("devices", new JSArray()));
            return;
        }

        JSArray arr = new JSArray();
        MidiDeviceInfo[] infos = midiManager.getDevices();
        for (MidiDeviceInfo info : infos) {
            JSObject obj = deviceInfoToJS(info);
            arr.put(obj);
        }

        JSObject result = new JSObject();
        result.put("devices", arr);
        call.resolve(result);
    }

    private void connectToDevice(MidiDeviceInfo info) {
        // Only connect to devices that have output ports (they send MIDI data to us)
        if (info.getOutputPortCount() == 0) return;

        midiManager.openDevice(info, device -> {
            if (device == null) {
                Log.w(TAG, "Failed to open MIDI device");
                return;
            }
            openDevices.add(device);

            for (int i = 0; i < info.getOutputPortCount(); i++) {
                MidiOutputPort port = device.openOutputPort(i);
                if (port != null) {
                    openPorts.add(port);
                    port.connect(new MidiReceiver() {
                        @Override
                        public void onSend(byte[] data, int offset, int count, long timestamp) {
                            for (int j = offset; j < offset + count; ) {
                                int status = data[j] & 0xFF;
                                int type = status & 0xF0;
                                int channel = (status & 0x0F) + 1;

                                // Only process 3-byte messages (Note On, Note Off, CC)
                                if ((type == 0x90 || type == 0x80 || type == 0xB0) && j + 2 < offset + count) {
                                    int data1 = data[j + 1] & 0xFF;
                                    int data2 = data[j + 2] & 0xFF;

                                    JSObject event = new JSObject();
                                    event.put("status", status);
                                    event.put("data1", data1);
                                    event.put("data2", data2);
                                    event.put("channel", channel);

                                    notifyListeners("midiMessage", event);
                                    j += 3;
                                } else {
                                    j++; // skip unknown bytes
                                }
                            }
                        }
                    });
                }
            }
        }, new Handler(Looper.getMainLooper()));
    }

    private void notifyDeviceChange() {
        if (midiManager == null) return;
        JSArray arr = new JSArray();
        MidiDeviceInfo[] infos = midiManager.getDevices();
        for (MidiDeviceInfo info : infos) {
            arr.put(deviceInfoToJS(info));
        }
        JSObject event = new JSObject();
        event.put("devices", arr);
        notifyListeners("deviceChange", event);
    }

    private JSObject deviceInfoToJS(MidiDeviceInfo info) {
        JSObject obj = new JSObject();
        obj.put("id", String.valueOf(info.getId()));
        android.os.Bundle props = info.getProperties();
        obj.put("name", props.getString(MidiDeviceInfo.PROPERTY_NAME, "Unknown"));
        obj.put("manufacturer", props.getString(MidiDeviceInfo.PROPERTY_MANUFACTURER, ""));
        return obj;
    }
}
