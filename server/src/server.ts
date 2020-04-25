import http from 'http';
import WebSocket from 'websocket';
import SerialPort from 'serialport';
const Readline = require('@serialport/parser-readline');
import uuid from 'uuid-random';

import Debug from './debug';

const SERVER_PORT = 8080
const ARDUINO_VENDOR_ID = '2341';

let ArduinoPort: SerialPort | undefined = undefined;
const connectedClients = new Map<String, WebSocket.connection>();

// Enable debugging outputs
Debug.enabled = false;

function setupSignalHandlers() {
  process.on('SIGTERM', () => {
    Debug.log('SIGTERM signal received.');
    if (ArduinoPort && ArduinoPort.isOpen) {
      ArduinoPort.close();
    }
    process.exit(0);
  });
  process.on('SIGINT', () => {
    Debug.log('SIGINT signal received.');
    if (ArduinoPort && ArduinoPort.isOpen) {
      ArduinoPort.close();
    }
    process.exit(0);
  });
}

function forwardDataToClients(data: string) {
  // First work out if this data is meaningful
  if (!data.startsWith("SD:")) {
    return;
  }
  data = data.substring(3).trimRight();

  connectedClients.forEach((connection) => {
    connection.send(data);
  })
}

// Identify the Arduino - assumes only one is plugged in at once
SerialPort.list().then(portInfos => {
  let arduinoPortInfo: SerialPort.PortInfo | undefined = undefined;
  for (const portInfo of portInfos) {
    Debug.log(portInfo);
    if (portInfo.vendorId == ARDUINO_VENDOR_ID) {
      arduinoPortInfo = portInfo;
      break;
    }
  }
  if (!arduinoPortInfo) {
    console.error('ERROR: could not find Arduino serial port connection.');
    process.exit(1);
  } else {
    console.log('Arduino found on port ' + arduinoPortInfo.path);
  }

  // Connect to the Arduino
  ArduinoPort = new SerialPort(arduinoPortInfo.path, {baudRate: 9600}, (err) => {
    if (err) {
      console.log('ERROR: could not open serial port connection to Arduino.', err);
      process.exit(1);
    } else {
      console.log('Connected to Arduino');
    }
  });
  // See for events: https://serialport.io/docs/api-stream
  ArduinoPort.on('close', (err) => {
    if (err) {
      console.log('Arduino serial port disconnected');
      process.exit(1);
    }
    console.log('Arduino connection closed')
  });

  // Stream data from the port to console
  const lineParser = new Readline();
  ArduinoPort.pipe(lineParser);
  lineParser.on('data', forwardDataToClients);

  // Set up some signal handling now that we have a port open
  setupSignalHandlers();
})
.then(() => {
  const requestHandler = (request: http.IncomingMessage, response: http.ServerResponse) => {
    // TODO: turn this into debugging info
    console.log(request.url);
    response.end('Hello from the Node.js Server!');
  }
  
  const server = http.createServer(requestHandler);
  server.listen(SERVER_PORT, () => {
    console.log(`HTTP server is listening on ${SERVER_PORT}`);
  });
  const wsServer = new WebSocket.server({
    httpServer: server
  });
  wsServer.on('request', request => {
    Debug.log(`Received connection from origin ${request.origin}`);
    // Accept the connection and give it an ID
    const connection = request.accept('velopad', request.origin);
    connectedClients.set(uuid(), connection);
  });
});

