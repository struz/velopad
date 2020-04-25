import { SensorDirection } from "./SensorConst";

class RawSensorData {
  private data: number[];

  constructor(rawData: string) {
    const values = rawData.split(' ');
    if (values.length !== 4) {
      throw new Error(`expected 4 sensors of data, got ${values.length} in message ${rawData}`);
    }
    this.data = [Number.parseInt(values[0]), Number.parseInt(values[1]), Number.parseInt(values[2]), Number.parseInt(values[3])];
  }

  get(dir: SensorDirection) { return this.data[dir]; }
}

export default RawSensorData;