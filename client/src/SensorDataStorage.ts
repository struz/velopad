import { SensorDirection } from "./SensorConst";
import RawSensorData from "./RawSensorData";
import { DEBUG_REPORT_MILLIS_TICK } from "./SensorDataConnection";
import uuid from 'uuid-random';
import SensorDataStream from "./SensorDataStream";

export const DEBUG_REPORTS_PER_SECOND = (1000 / DEBUG_REPORT_MILLIS_TICK);
// To save memory we garbage collect data storage when we are more than 1.5x this retention value
export const SPIKE_GRAPH_RETENTION_SECONDS = 60;
export const SPIKE_GRAPH_RETENTION_ENTRIES = SPIKE_GRAPH_RETENTION_SECONDS * DEBUG_REPORTS_PER_SECOND;

export type SensorDataArray = Array<SensorData>;
// SensorData = [Milliseconds that reading was taken at, reading value]
export type SensorData = [number, number];

export interface SensorDataStreamSubscription {
  uuid: string;
  dataStream: SensorDataStream;
}

class SensorDataStorage {
  // One array of sensor data per direction, initialised in constructor
  private sensorData = new Array<SensorDataArray>(SensorDirection.Up + 1);
  // Consumers subscribe and get their own data stream which is updated
  // as new data comes in. This allows for streaming data to graphs.
  // Separate per-consumer to stop write tampering.
  private consumerDataStreams = new Array<Map<string, SensorDataArray>>();

  constructor() {
    for (let i = 0; i <= SensorDirection.Right; i++) {
      this.sensorData[i] = new Array<SensorData>();
      this.consumerDataStreams[i] = new Map<string, SensorDataArray>();
    }
  }

  putSensorData(rawSensorData: RawSensorData, millis: number) {
    const currentTime = new Date().getTime();
    for (let i = 0; i <= SensorDirection.Right; i++) {
      const dirSensorData = rawSensorData.get(i);
      // Add data to main storage
      this.sensorData[i].push([millis, dirSensorData]);
      // Add data to consumer streams
      this.consumerDataStreams[i].forEach((dataStream) => {
        dataStream.push([currentTime, dirSensorData]);
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
  // Streams don't use Arduino millisecond readings, instead logging the real time
  // for each addition.
  getSensorDataSubscription(dir: SensorDirection): SensorDataStreamSubscription {
    const subscriptionUuid = uuid();
    const dataSubscription = new Array<SensorData>();
    // Add an empty data array - new data will be appended to it, thus streamed to the subscriber
    this.consumerDataStreams[dir].set(subscriptionUuid, dataSubscription);
    return {
      uuid: subscriptionUuid,
      dataStream: new SensorDataStream(dataSubscription),
    };
  }

  // TODO: unsubscribe function via uuid
}

export default SensorDataStorage;