import { SensorData } from "./SensorDataStorage";

class SensorDataStream {
  private data: Array<SensorData>;
  private lastIndexAccessed = -1;

  constructor(dataStream: Array<SensorData>) {
    this.data = dataStream;
  }

  getNewData() {
    // No data
    if (this.data.length === 0) {
      return [];
    }
    // Possibly new data since last access - slice from the last index + 1,
    // which is empty if there is no new data
    const newData = this.data.slice(this.lastIndexAccessed + 1);
    this.lastIndexAccessed = this.data.length - 1;
    return newData;
  }
}

export default SensorDataStream;