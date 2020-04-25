import SensorDataStorage from './SensorDataStorage';
import RawSensorData from './RawSensorData';
import { SensorDirection } from './SensorConst';
import { DEBUG_REPORT_MILLIS_TICK } from './SensorDataConnection';

const NUM_DATA_ENTRIES = 10;

describe('SensorDataStoragen', () => {
  const sdc = new SensorDataStorage();

  for (let i = 0; i < NUM_DATA_ENTRIES; i++) {
    sdc.putSensorData(new RawSensorData(`${i} ${i} ${i} ${i}`), i * DEBUG_REPORT_MILLIS_TICK);
  }

  it('returns full sensor data correctly', () => {
    let data = sdc.getSensorData(SensorDirection.Left);
    expect(data.length).toEqual(NUM_DATA_ENTRIES);
    for (let i = 0; i < data.length; i++) {
      expect(data[i]).toEqual([i * DEBUG_REPORT_MILLIS_TICK, i]);
    }

    data = sdc.getSensorData(SensorDirection.Up);
    expect(data.length).toEqual(NUM_DATA_ENTRIES);
    for (let i = 0; i < data.length; i++) {
      expect(data[i]).toEqual([i * DEBUG_REPORT_MILLIS_TICK, i]);
    }
  });

  it('returns partial sensor data correctly', () => {
    // 100 millis to 250 millis inclusive
    const startValue = 2;
    const startMillis = 100;
    const endMillis = 250;

    const data = sdc.getSensorData(SensorDirection.Left, startMillis, endMillis);
    expect(data.length).toEqual((endMillis - startMillis) / DEBUG_REPORT_MILLIS_TICK);

    for (let i = 0; i < data.length; i++) {
      const expectedValue = startValue + i;
      const expectedMillis = (i * DEBUG_REPORT_MILLIS_TICK) + startMillis;
      expect(data[i]).toEqual([expectedMillis, expectedValue]);
    }
  });
});