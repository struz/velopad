import { SensorDirection } from "./SensorConst";
import RawSensorData from "./RawSensorData";
import { DEBUG_REPORT_MILLIS_TICK } from "./SensorDataConnection";
import uuid from 'uuid-random';
import SensorDataStream from "./SensorDataStream";
import SensorThreshold from "./SensorThreshold";

export const DEBUG_REPORTS_PER_SECOND = (1000 / DEBUG_REPORT_MILLIS_TICK);
// To save memory we garbage collect data storage when we are more than 1.5x this retention value
export const SPIKE_GRAPH_RETENTION_SECONDS = 60;
export const SPIKE_GRAPH_RETENTION_ENTRIES = SPIKE_GRAPH_RETENTION_SECONDS * DEBUG_REPORTS_PER_SECOND;

export type SensorDataArray = Array<SensorData>;
// SensorData = [Milliseconds that reading was taken at, reading value, currently pressed true/false]
export type SensorData = [number, number, boolean];

export interface ISensorDataStreamSubscription {
  uuid: string;
  dataStream: SensorDataStream;
}

export interface ISensorValuesEvent {
  // LDUR order
  sensorPressThresholds: Array<number>;
  sensorReleaseThresholds: Array<number>;
}

class SensorDataStorage {
  // Difference in time between the microcontroller and us
  private timeDifferenceMillis?: number;

  // One array of sensor data per direction, initialised in constructor
  // TODO: periodically clean up the big sensor data array, and support dumping to file
  private sensorData = new Array<SensorDataArray>();
  // Consumers subscribe and get their own data stream which is updated
  // as new data comes in. This allows for streaming data to graphs.
  // Separate per-consumer to stop write tampering.
  private consumerDataStreams = new Array<Map<string, SensorDataArray>>();
  // Last sensor threshold values we were told about from the Microcontroller
  private sensorThresholds = new Array<SensorThreshold>();

  constructor() {
    // Initialise all our storage structures for all directions
    for (let i = 0; i <= SensorDirection.Right; i++) {
      this.sensorData.push(new Array<SensorData>());
      this.consumerDataStreams.push(new Map<string, SensorDataArray>());
      this.sensorThresholds.push(new SensorThreshold(-1, -1));
    }
  }

  putSensorData(rawSensorData: RawSensorData) {
    const currentTimeMillis = Date.now();

    // Store the time difference between us and the microcontroller the first time we get
    // sensor data from it. This will break the graphs if the microcontroller restarts.
    if (this.timeDifferenceMillis === undefined) {
      // TODO: make this robust by having a synchronisation message we can send to periodically
      // keep it in sync
      this.timeDifferenceMillis = currentTimeMillis - rawSensorData.getTimestampMillis();
    }
    const graphTimeMillis = rawSensorData.getTimestampMillis() + this.timeDifferenceMillis;

    for (let i = 0; i <= SensorDirection.Right; i++) {
      const dirSensorData = rawSensorData.getSensorReading(i);
      const dirSensorState = rawSensorData.getPressedState(i);
      // Add data to main storage
      this.sensorData[i].push([rawSensorData.getTimestampMillis(), dirSensorData, dirSensorState]);
      // Add data to consumer streams
      this.consumerDataStreams[i].forEach((dataStream) => {
        dataStream.push([graphTimeMillis, dirSensorData, dirSensorState]);
      });
    }
  }

  // range is specified in milliseconds
  getSensorData(dir: SensorDirection, rangeStart?: number, rangeEnd?: number) {
    const data = this.sensorData[dir];

    if (rangeStart === undefined && rangeEnd === undefined) {
      // A copy of the data, no searching overhead
      return data.slice();
    }
    if ((rangeStart === undefined && rangeEnd !== undefined) || (rangeStart !== undefined && rangeEnd === undefined)) {
      throw new Error('rangeStart and rangeEnd must be specified together')
    }

    // Arrays are always ordered, so find the start element for the range and the end element
    // for the range and slice between them
    const first = data.findIndex(elem => elem[0] >= (rangeStart as number));
    if (!first) {
      throw new Error(`rangeStart ${rangeStart} is higher than any data stored`);
    }
    let last = data.findIndex(elem => elem[0] > (rangeEnd as number));
    if (last === -1) {
      // The range extends beyond the data set, just give the whole data set
      last = data.length - 1;
    } else {
      // We found the first element beyond the range, subtract one to give the range
      last = last - 1;
    }

    return data.slice(first, last);
  }

  // Get a subscription to an array of sensor data that will be updated automatically
  // when new data for that sensor direction comes in.
  newSensorDataSubscription(dir: SensorDirection): ISensorDataStreamSubscription {
    const subscriptionUuid = uuid();
    const dataSubscription = new Array<SensorData>();
    // Add an empty data array - new data will be appended to it, thus streamed to the subscriber
    this.consumerDataStreams[dir].set(subscriptionUuid, dataSubscription);
    return {
      uuid: subscriptionUuid,
      dataStream: new SensorDataStream(dataSubscription),
    };
  }
  deleteSensorDataSubscription(dir: SensorDirection, subscriptionUuid: string) {
    this.consumerDataStreams[dir].delete(subscriptionUuid);
  }

  // Update the last known sensor value thresholds
  updateSensorThresholds(thresholds: Array<SensorThreshold>) {
    thresholds.forEach((sensorThresholds, i) => {
      this.sensorThresholds[i] = sensorThresholds.clone();
    });
  }
  getSensorThreshold(dir: SensorDirection) {
    return this.sensorThresholds[dir].clone();
  }
  getSensorThresholds() {
    const thresholds: SensorThreshold[] = [];
    this.sensorThresholds.forEach(threshold => {
      thresholds.push(threshold);
    });
    return thresholds;
  }
}

export default SensorDataStorage;