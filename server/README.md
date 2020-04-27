# Server

We have to split the server out from the client in order to access the serial port, as we can't access the serial port via the browser because it is runs in a sandbox.

The server is responsible for parsing the raw serial data from the server and both saving it for later, and forwarding it to the client.

## Usage

```
npm install
npm run start
```

## Development without an Arduino

You can run with dummy data by using a different start script. This means you don't have to have the Arduino connected to develop against.

```
npm run start-dev
```
