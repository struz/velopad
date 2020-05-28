# Velopad

A toolkit for working with a velostat "ghetto pad".

This hasn't yet been made generic enough to work on anyone's setup, and the [Arduino Code](https://github.com/struz/HID-Dancepad/blob/master/Dancepad/Dancepad.ino) hasn't been ported into this repo yet.

## Setup

1. [Download and install Node.js](https://nodejs.org/en/download/) for your operating system.
2. (Optional) If any of the `npm install` commands below give you a compilation error, and you are running on Windows, try running `npm install --global windows-build-tools` or otherwise following [this guide on fixing the issue](https://spin.atomicobject.com/2019/03/27/node-gyp-windows/).
  a. If you're on another platform, you're on your own for now but if you find a fix feel free to make a PR so others can benefit.

## Usage

1. Plug in your Arduino to your PC via USB.
   - Ensure it is running the velopad code as certain message formats are expected over the Serial connection.
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
