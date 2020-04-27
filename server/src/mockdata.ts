// Streams over and over again to simulate sensor data
export const MOCK_DATA = `SD:600 600 600 600 
SD:602 601 599 598 
SD:602 601 599 598 
SD:606 600 590 600 
SD:602 601 599 598 
SD:600 600 600 600 `

// How fast to send lines of mock data. Should match the Arduino rate for development
// purposes.
export const MOCK_TICK_RATE_MILLIS = 50;

class DataMocker {
  private currentLine = 0;
  private mockDataLines: Array<string>;

  constructor() {
    this.mockDataLines = MOCK_DATA.split('\n');
  }

  readNextLine() {
    const line = this.mockDataLines[this.currentLine];
    this.currentLine++;
    if (this.currentLine >= this.mockDataLines.length) {
      this.currentLine = 0;
    }
    return line;
  }
}

export default DataMocker;