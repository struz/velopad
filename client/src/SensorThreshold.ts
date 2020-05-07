import { NUM_SENSORS } from "./SensorConst";


const SENSOR_SEP_CHAR = ' ';
const THRESHOLD_SEP_CHAR = ',';


class SensorThreshold {
  private pressThreshold: number;
  private releaseThreshold: number;

  constructor(pressThreshold: number, releaseThreshold: number) {
    this.pressThreshold = pressThreshold;
    this.releaseThreshold = releaseThreshold;
  }

  getPressThreshold() { return this.pressThreshold; }
  getReleaseThreshold() { return this.releaseThreshold; }
  clone() { return new SensorThreshold(this.pressThreshold, this.releaseThreshold); }
  toSerialString() { return `${this.pressThreshold},${this.releaseThreshold}` ; }

  // Parse a raw data string into an LDUR array of SensorThresholds
  static parseRaw(rawData: string) {
    const sensorThresholds = new Array<SensorThreshold>();

    const dataBySensor = rawData.split(SENSOR_SEP_CHAR);
    if (dataBySensor.length !== NUM_SENSORS) {
      throw new Error(`unexpected length of sensors in sensor threshold data: expected 2, got ${dataBySensor.length}`)
    }
    dataBySensor.forEach(sensorStr => {
      const rawSensorThresholds = sensorStr.split(THRESHOLD_SEP_CHAR);
      if (rawSensorThresholds.length !== 2) {
        throw new Error(`unexpected length of thresholds in sensor threshold data: expected 2, got ${rawSensorThresholds.length}`);
      }
      sensorThresholds.push(new SensorThreshold(parseInt(rawSensorThresholds[0]), parseInt(rawSensorThresholds[1])))
    });
    return sensorThresholds;
  }
}

export default SensorThreshold;