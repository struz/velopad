import SensorDataStream from './SensorDataStream'
import { SensorData } from './SensorDataStorage';

const firstPush = [[0, 0, false], [1, 0, false], [0, 1, false], [0, 0, false]] as Array<SensorData>;

describe('SensorDataStream', () => {
  const data = new Array<SensorData>();

  const sds = new SensorDataStream(data);

  it('handles a stream properly', () => {
    let newData = sds.getNewData();
    // No data expected as we have not pushed anything
    expect(newData.length).toEqual(0);

    // Push some data
    firstPush.forEach(elem => {
      data.push(elem);
    });

    // New data expected
    newData = sds.getNewData();
    expect(newData.length).toEqual(firstPush.length);
    newData.forEach((elem, index) => {
      expect(elem).toEqual(firstPush[index]);
    });

    // No new items expected since we did not add anything else
    newData = sds.getNewData();
    expect(newData.length).toEqual(0);
  });
});