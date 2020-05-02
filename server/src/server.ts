import http from 'http';
import WebSocket from 'websocket';
import SerialPort from 'serialport';
const Readline = require('@serialport/parser-readline');
import uuid from 'uuid-random';
import CommandLineArgs from 'command-line-args';

import Debug from './debug';
import DataMocker, { MOCK_TICK_RATE_MILLIS } from './mockdata';

const SERVER_PORT = 8080
const ARDUINO_VENDOR_ID = '2341';

let ArduinoPort: SerialPort | undefined = undefined;
const connectedClients = new Map<String, WebSocket.connection>();

// Set debug level
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
  connectedClients.forEach((connection) => {
    connection.send(data);
  })
}

// === MAIN START ====

// Parse command line arguments
const optionDefinitions = [
  { name: 'mockserial', alias: 'm', type: Boolean },
];
const options = CommandLineArgs(optionDefinitions);

// Do setup in a promise since there are asynchronous bits we want to finish
// before starting our server
new Promise((resolve) => {
  if (options.mockserial) {
    console.log('Mocking data to clients...')
    // Mock the serial data
    const dataMocker = new DataMocker();
    setInterval(() => {
      // Function call must be the same as the one used in the normal path for
      // mocking to work properly.
      forwardDataToClients(dataMocker.readNextLine());
    }, MOCK_TICK_RATE_MILLIS);
    
    // Tell execution to continue
    resolve();
  } else {
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

      // Release the outer promise now that we're done
      resolve();
    });
  }
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
    const connectionUuid = uuid();
    connectedClients.set(connectionUuid, connection);

    // Remove the client from connected clients once it's closed
    connection.on('close', () => {
      connectedClients.delete(connectionUuid);
    });
    // Setup message handling from client -> arduino
    connection.on('message', data => {
      if (data.type !== 'utf8') {
        return;
      }
      if (ArduinoPort !== undefined) {
        // Forward the command as we received it
        ArduinoPort.write(data.utf8Data as string);
      }
    });
  });
});

