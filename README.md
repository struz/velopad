# Velopad

A toolkit for working with a velostat "ghetto pad".

This hasn't yet been made generic enough to work on anyone's setup, and the Arduino code hasn't been ported into this repo yet.

## Usage

1. Plug in your Arduino to your PC via USB.
   - Ensure it is running the velopad code as certain message formats are expected over the Serial connection..
2. In one terminal, run the server. This will find and connect to the Arduino and begin streaming data over the serial port.
```
cd server
npm install
npm run start
```
3. In another terminal, run the client. This hosts a webserver to serve the single page react application that will connect to the server and use it retrieve serial data from the Arduino.
```
cd client
npm install
npm run start
```
4. Open a web browser and visit `http://localhost:3000/`

5. Get a Claire to sit on the stepladder bar

## Planned features

- sensor weight profiles saved to browser local cache that can be applied for different players
- some more stats over a session
- streaming the raw sensor data to a file
- analysis tools to work on raw sensor data dumps to suggest better trigger thresholds