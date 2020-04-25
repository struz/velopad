import WebSocket from 'websocket';
import RawSensorData from './RawSensorData';
import { SensorDirection } from './SensorConst';
import SensorDataStorage from './SensorDataStorage';

// Keep this in sync with how often the Arduino is giving out debug information
// so we can graph correctly.
export const DEBUG_REPORT_MILLIS_TICK = 50;

class SensorDataConnection {
  private wsClient: WebSocket.w3cwebsocket;
  private storage: SensorDataStorage;
  // Millis of current sensor reading, relative to connection opening time
  private currentMillis = 0;

  constructor(url: string, storage: SensorDataStorage) {
    this.storage = storage;
    
    // Connect to the local web server via websockets
    const wsClient = new WebSocket.w3cwebsocket(url, 'velopad');

    // Set up some event handlers
    wsClient.onerror = err => {
      console.log('Websocket error: ' + err.toString());
    };
    wsClient.onopen = () => {
      console.log('Websocket: connection successful');
    };
    wsClient.onmessage = message => {
      //console.log(`Received message: '${message.data}'`);
      this.handleMessage(message);
    };
    wsClient.onclose = () => {
      console.log('Websocket: connection closed');
    }

    this.wsClient = wsClient;
  }

  handleMessage(message: WebSocket.IMessageEvent) {
    // Store sensor data for this tick
    const sensorData = new RawSensorData(message.data.toString());
    this.storage.putSensorData(sensorData, this.currentMillis);
    this.currentMillis += DEBUG_REPORT_MILLIS_TICK;
  }

  storeSensorData(rawSensorData: RawSensorData, dir: SensorDirection) {
    this.storage.putSensorData(rawSensorData, this.currentMillis);
  }
}

export default SensorDataConnection;