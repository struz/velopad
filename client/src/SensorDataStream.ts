import { SensorData } from "./SensorDataStorage";

class SensorDataStream {
  private data: Array<SensorData>;
  private lastIndexAccessed = -1;

  // 5MB since JavaScript "number" is always 64 bits
  private readonly CLEANUP_THRESHOLD = ((1024 * 1024) * 5) / 64;

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
    this.maybeCleanup();
    return newData;
  }

  maybeCleanup() {
    if (this.lastIndexAccessed < this.CLEANUP_THRESHOLD) {
      return;
    }
    // Do a cleanup if there's a lot of data in the system
    // We have to modify in-place because we have a reference to a stream
    // that is being pushed to from elsewhere.
    this.data.splice(0, this.lastIndexAccessed);
    this.lastIndexAccessed = -1;
  }
}

export default SensorDataStream;