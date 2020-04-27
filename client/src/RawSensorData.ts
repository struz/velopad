import { SensorDirection } from "./SensorConst";

class RawSensorData {
  // Sensor data in LDUR order
  private data: number[];
  // Millisecond reading of data, for ordering and graphing
  private millis: number;

  // The first time we get data into a sensor data class we will initialize our
  // base millis, and report millis drift from that in order to get "real time"
  // data. If a report is received from the past, assume the device restarted
  // and reconfigure.
  private static baseMillis = -1;
  private static parseMillis(millis: number) {
    if (this.baseMillis === -1 || millis < this.baseMillis) {
      this.baseMillis = millis;
    }
    return millis - this.baseMillis;
  }

  constructor(rawData: string) {
    const values = rawData.split(' ');
    if (values.length !== 5) {
      throw new Error(`expected 1 millisecond reading and 4 sensors of data, got ${values.length} in message ${rawData}`);
    }
    this.millis = RawSensorData.parseMillis(Number.parseInt(values[0]));
    this.data = [Number.parseInt(values[1]), Number.parseInt(values[2]), Number.parseInt(values[3]), Number.parseInt(values[4])];
  }

  getSensorReading(dir: SensorDirection) { return this.data[dir]; }
  getTimestampMillis() { return this.millis; }
}

export default RawSensorData;