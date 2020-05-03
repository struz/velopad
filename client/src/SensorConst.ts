// Keep this in sync with the number of sensor directions
export const NUM_SENSORS = 4;
export enum SensorDirection {
  Left = 0,
  Down,
  Up,
  // Must be the last value as we use this to loop over all the values in the enum
  Right
}