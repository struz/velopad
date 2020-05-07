import WebSocket from 'websocket';
import MicrocontrollerEventDispatcher from './MicrocontrollerEventDispatcher';
import SensorThreshold from './SensorThreshold';

// Keep this in sync with how often the Arduino is giving out debug information
// so we can graph correctly.
export const DEBUG_REPORT_MILLIS_TICK = 50;

// Incoming message identifiers
const MESSAGE_IDENTIFIER_LENGTH = 3;
const SENSOR_DATA_ID_BYTES = "SD ";
const MESSAGE_ID_BYTES = "M: ";
const SENSOR_THRESHOLDS_ID_BYTES = "ST ";
const SENSOR_UPDATE_ID_BYTES = "SU ";

// Outgoing message identifiers
const SENSOR_THRESHOLD_REQUEST_BYTES = "sg";
const SENSOR_THRESHOLD_UPDATE_BYTES = "su";

class SensorDataConnection {
  private connectionUrl: string;
  private wsClient?: WebSocket.w3cwebsocket;
  private eventDispatcher: MicrocontrollerEventDispatcher;

  constructor(url: string, eventDispatcher: MicrocontrollerEventDispatcher) {
    this.eventDispatcher = eventDispatcher;
    this.connectionUrl = url;
  }

  connect(openCallbackFn?: () => void) {
    if (this.wsClient !== undefined) {
      return;
    }

    // Connect to the local web server via websockets
    const wsClient = new WebSocket.w3cwebsocket(this.connectionUrl, 'velopad');

    // Set up some event handlers
    wsClient.onerror = err => {
      console.log('Websocket error: ' + err.toString());
    };
    wsClient.onopen = () => {
      console.log('Websocket: connection successful');
      if (openCallbackFn) {
        openCallbackFn();
      }
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

  // Handle an incoming message from the microcontroller
  handleMessage(message: WebSocket.IMessageEvent) {
    const msgString = message.data.toString();
    // console.log(msgString);

    const msgId = msgString.substring(0, MESSAGE_IDENTIFIER_LENGTH);
    const msgContents = msgString.substring(MESSAGE_IDENTIFIER_LENGTH);
    switch (msgId) {
      case SENSOR_DATA_ID_BYTES:
        this.eventDispatcher.fireEventSensorDataReceived(msgContents);
        break;
      case SENSOR_THRESHOLDS_ID_BYTES:
        this.eventDispatcher.fireEventSensorThresholdsReceived(msgContents);
        break;
      case SENSOR_UPDATE_ID_BYTES:
        this.eventDispatcher.fireEventSensorThresholdsReceived(msgContents);
        break;
      case MESSAGE_ID_BYTES:
        this.eventDispatcher.fireEventMessageReceived(msgContents);
        break;      
      default:
        console.log(`unknown message format received: ${msgId}`);
        break;
    }
  }

  // Send a message to the microcontroller via the server
  sendMessage(message: string) {
    if (this.wsClient === undefined) {
      throw new Error("tried to send message before connection established: " + message)
    }

    // Do some message formatting to avoid errors. If a message doesn't end in a newline
    // then the Arduino won't process it immediately.
    let msgToSend = message;
    if (!message.endsWith("\n")) {
      msgToSend += "\n";
    }
    this.wsClient.send(msgToSend);
  }
  askSensorThresholds() {
    this.sendMessage(SENSOR_THRESHOLD_REQUEST_BYTES);
  }
  updateSensorThresholds(thresholds: Array<SensorThreshold>) {
    let msg = SENSOR_THRESHOLD_UPDATE_BYTES;
    thresholds.forEach(t => {
      msg += ` ${t.toSerialString()}`;
    });
    this.sendMessage(msg + "\n");
  }

  disconnect() {
    if (this.wsClient === undefined) {
      return;
    }
    this.wsClient.close();
    this.wsClient = undefined;
  }
}

export default SensorDataConnection;