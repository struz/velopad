import { SensorDirection, NUM_SENSORS } from "./SensorConst";

class RawSensorData {
  // Sensor data in LDUR order
  private sensorReading: number[];
  private sensorPressed: boolean[];
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
    const millis = RawSensorData.parseMillis(Number.parseInt(values[0]));
    const sensorReading: number[] = [];
    const sensorPressed: boolean[] = [];
    for (let i = 1; i < NUM_SENSORS + 1; i++) {
      const sensorData = values[i].split(',');
      if (sensorData.length !== 2) {
        throw new Error(`expected 2 comma separated elements per sensor, got ${sensorData} for sensor direction index=${i-1}`);
      }
      sensorReading.push(Number.parseInt(sensorData[0]));
      if (sensorData[1] === "T") {
        sensorPressed.push(true);
      } else if (sensorData[1] === "F") {
        sensorPressed.push(false);
      } else {
        throw new Error(`sensor state received must be T or F, but received '${sensorData[1]}'`);
      }
    }

    this.millis = millis;
    this.sensorReading = sensorReading;
    this.sensorPressed = sensorPressed;
  }

  getSensorReading(dir: SensorDirection) { return this.sensorReading[dir]; }
  getTimestampMillis() { return this.millis; }
  getPressedState(dir: SensorDirection) { return this.sensorPressed[dir]; }
}

export default RawSensorData;