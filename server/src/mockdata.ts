import { SENSOR_DATA_START_BYTES } from "./const";

// Streams over and over again to simulate sensor data
export const MOCK_DATA = `600,F 600,F 600,F 600,F
602,F 601,F 599,F 598,F
602,F 601,F 599,F 598,F
606,F 600,F 590,F 600,F
602,F 601,F 599,F 598,F
600,F 600,F 600,F 600,F`

// How fast to send lines of mock data. Should match the Arduino rate for development
// purposes.
export const MOCK_TICK_RATE_MILLIS = 50;

class DataMocker {
  private currentLine = 0;
  private mockDataLines: Array<string>;
  // Random start number that isn't 0, for edge case testing
  private accumulatedMillis = 32;

  constructor() {
    this.mockDataLines = MOCK_DATA.split('\n');
  }

  readNextLine() {
    const line = this.mockDataLines[this.currentLine];
    this.currentLine++;
    if (this.currentLine >= this.mockDataLines.length) {
      this.currentLine = 0;
    }
    const outputLine = `${SENSOR_DATA_START_BYTES}${this.accumulatedMillis} ${line}`;
    this.accumulatedMillis += MOCK_TICK_RATE_MILLIS;
    return outputLine;
  }
}

export default DataMocker;