import uuid from "uuid-random";

import SensorDataStorage from "./SensorDataStorage";
import RawSensorData from "./RawSensorData";
import SensorThreshold from "./SensorThreshold";


// Callback function specs for each event type
type SensorThresholdsReceivedCallbackFn = () => void;
type MessageReceievedCallbackFn = (msg: string) => void;

class MicrocontrollerEventDispatcher {
  private storage: SensorDataStorage;
  // Different functions have different callback lists to consult
  sensorThresholdsReceivedCallbackFns = new Map<string, SensorThresholdsReceivedCallbackFn>();
  messageReceievedCallbackFns = new Map<string, MessageReceievedCallbackFn>();

  constructor(storage: SensorDataStorage) {
    this.storage = storage;
  }


  // State changes
  fireEventSensorDataReceived(rawData: string) {
    // Store sensor data for this tick
    this.storage.putSensorData(new RawSensorData(rawData));
    // No event bus necessary, users subscribe with storage for this
  }
  fireEventSensorThresholdsReceived(rawData: string) {
    this.storage.updateSensorThresholds(SensorThreshold.parseRaw(rawData));
    // Notify users to pull from storage
    this.sensorThresholdsReceivedCallbackFns.forEach(callbackFn => callbackFn());
  }
  fireEventMessageReceived(message: string) {
    // Notify users with message
    this.messageReceievedCallbackFns.forEach(callbackFn => callbackFn(message));
  }

  // Subscribing to events - verbose for explicit type safety
  subscribeSensorThresholdsReceived(callbackFn: SensorThresholdsReceivedCallbackFn) {
    const subscriberUuid = uuid();
    this.sensorThresholdsReceivedCallbackFns.set(subscriberUuid, callbackFn);
    return subscriberUuid;
  }
  unsubscribeSensorThresholdsReceived(subscriberUuid: string) {
    this.sensorThresholdsReceivedCallbackFns.delete(subscriberUuid);
  }

  subscribeMessageReceived(callbackFn: MessageReceievedCallbackFn) {
    const subscriberUuid = uuid();
    this.messageReceievedCallbackFns.set(subscriberUuid, callbackFn);
    return subscriberUuid;
  }
  unsubscribeMessageReceived(subscriberUuid: string) {
    this.messageReceievedCallbackFns.delete(subscriberUuid);
  }
}

export default MicrocontrollerEventDispatcher;