import React from 'react';
import SensorDataStorage, { ISensorDataStreamSubscription } from './SensorDataStorage';
import { SensorDirection } from './SensorConst';
import * as Smoothie from 'smoothie';
import MicrocontrollerEventDispatcher from './MicrocontrollerEventDispatcher';


const CHART_DATA_UPDATE_RATE_MILLIS = 50;
const CHART_GARBAGE_COLLECT_RATE_MILLIS = 5000;
const CHART_DELAY_MILLIS = 0;
const CHART_Y_MIN_VALUE = 0;
// const CHART_Y_MAX_VALUE = 850;
const CHART_MILLIS_PER_PIXEL = 10;

const CHART_SENSOR_DATA_LINE_THICKNESS = 2;
const CHART_SENSOR_UNPRESSED_COLOR = '#00ff00'
const CHART_SENSOR_PRESSED_COLOR = '#0000ff'


class TimeSeriesMeta {
  private timeSeries: Smoothie.TimeSeries;
  private lastUpdatedMillis: number;
  private lastEntry?: [number, number];
  // Buffer to ensure we aren't deleting lines on the screen too early
  private static shownMillisBuffer = 500;

  constructor(timeSeries: Smoothie.TimeSeries) {
    this.timeSeries = timeSeries;
    this.lastUpdatedMillis = Date.now();
  }

  append(timestamp: number, value: number) {
    this.timeSeries.append(timestamp, value);
    this.lastUpdatedMillis = timestamp;
    this.lastEntry = [timestamp, value];
  }
  getLastUpdated() { return this.lastUpdatedMillis; }
  getLastEntry() {
    return this.lastEntry;
  }

  // Returns true if the last touched data point is on the chart, false otherwise
  stillShownOnChart(chartWidthMillis: number) {
    return this.lastUpdatedMillis >= (Date.now() - chartWidthMillis) - TimeSeriesMeta.shownMillisBuffer;
  }
  removeFromChart(chart: Smoothie.SmoothieChart) {
    chart.removeTimeSeries(this.timeSeries);
  }
}


interface PressureChartProps {
  width: number;
  height: number;
  title: string;
  sensorDataStorage: SensorDataStorage;
  sensorDir: SensorDirection;
  activationThreshold?: number;
  eventDispatcher: MicrocontrollerEventDispatcher;
}


class PressureChart extends React.Component<PressureChartProps> {
  private sensorDataProvider: SensorDataStorage;
  private sensorDir: SensorDirection;
  private sensorPressThreshold = -1;
  private sensorReleaseThreshold = -1;
  private sensorPressed = false;

  // Data streams and event subscriptions
  private fetchDataIntervalID = -1;
  private gcChartIntervalID = -1;
  private eventDispatcher: MicrocontrollerEventDispatcher;
  private sdStreamSub?: ISensorDataStreamSubscription;
  private stEventSub?: string;

  // Display related variables
  private canvas: HTMLCanvasElement | undefined;
  private setCanvasRef: (element: HTMLCanvasElement) => any;
  private width: number;
  private height: number;
  private chart: Smoothie.SmoothieChart;

  // Sensor data time series, displayed on the smoothie chart.
  // We use an array so we can use multiple time series to change the colour of the line
  // during presses and depresses of the sensor. The latest created one is always at the
  // end of this list.
  private sdTimeSeries = new Array<TimeSeriesMeta>();
  // Sensor threshold time series, displayed as a horizontal line on the smoothie chart
  private pressThresholdTimeSeries = new Smoothie.TimeSeries();
  private releaseThresholdTimeSeries = new Smoothie.TimeSeries();

  constructor(props: PressureChartProps) {
    super(props);
    this.width = props.width;
    this.height = props.height;
    this.sensorDataProvider = props.sensorDataStorage;
    this.sensorDir = props.sensorDir;
    this.eventDispatcher = props.eventDispatcher;
    if (props.activationThreshold) {
      this.sensorPressThreshold = props.activationThreshold;
    }

    this.chart = new Smoothie.SmoothieChart({
      millisPerPixel: CHART_MILLIS_PER_PIXEL,
      //scaleSmoothing: 1,
      tooltip: true,
      grid: {millisPerLine:1000,verticalSections:5},
      labels: {fontSize:17,precision:0},
      minValue: CHART_Y_MIN_VALUE,
      // 5% padding at the top of the Y axis
      maxValueScale: 1.05,
    });

    this.setCanvasRef = element => {
      this.canvas = element;
    }
  }

  // Returns the number of milliseconds that can be shown across the whole width of the chart
  getChartWidthMillis() {
    return this.width * CHART_MILLIS_PER_PIXEL;
  }

  collectChartGarbage() {
    // Because this is ordered we can just find the last element that
    // should be garbage collected, and collect it and everything before it.
    let lastElementIndex = -1;
    for (let i = this.sdTimeSeries.length - 1; i >= 0; i--) {
      if (!this.sdTimeSeries[i].stillShownOnChart(this.getChartWidthMillis())) {
        lastElementIndex = i;
        break;
      }
    }

    if (lastElementIndex >= 0) {
      // Remove old time series from the chart
      for (let i = 0; i <= lastElementIndex; i++) {
        this.sdTimeSeries[i].removeFromChart(this.chart);
      }
      // Keep only the non-GCable elements
      this.sdTimeSeries = this.sdTimeSeries.slice(lastElementIndex + 1);
      console.log('garbage was collected');
    }
  }

  updateSensorThresholds() {
    const sensorThresholds = this.sensorDataProvider.getSensorThreshold(this.sensorDir);
    this.sensorPressThreshold = sensorThresholds.getPressThreshold();
    this.sensorReleaseThreshold = sensorThresholds.getReleaseThreshold();
  }

  pushNewSensorDataTimeseries(finalDataValue?: number, finalDataMillis?: number) {
    const ts = new Smoothie.TimeSeries();

    // To make the transition look smooth we need to include the start of this new time series as
    // the last point of the previous time series, so the line is continuous.
    // Otherwise there's just a gap between points.
    if (finalDataValue !== undefined && finalDataMillis !== undefined) {
      this.sdTimeSeries[this.sdTimeSeries.length - 1].append(finalDataValue, finalDataMillis);
    }

    this.sdTimeSeries.push(new TimeSeriesMeta(ts));
    this.chart.addTimeSeries(ts, {
      lineWidth: CHART_SENSOR_DATA_LINE_THICKNESS,
      strokeStyle: this.sensorPressed ? CHART_SENSOR_PRESSED_COLOR : CHART_SENSOR_UNPRESSED_COLOR,
    });
  }

  componentDidMount() {
    if (this.canvas === undefined) {
      throw new Error('canvas could not be found at runtime, react docs lied!')
    }

    // Set up our chart paramters - series added later draw over the top of series added earlier
    this.chart.addTimeSeries(this.releaseThresholdTimeSeries, {lineWidth: 1.5, strokeStyle:'#ffff00'})
    this.chart.addTimeSeries(this.pressThresholdTimeSeries, {lineWidth: 1.5, strokeStyle:'#ff0000'})
    // Initial sensor data time series
    this.pushNewSensorDataTimeseries();

    // When we receive an update to the sensor threshold values, fetch them from storage.
    this.stEventSub = this.eventDispatcher.subscribeSensorThresholdsReceived(() => {
      this.updateSensorThresholds();
    });
    // Make sure our current ones are up to date to avoid any race condition
    this.updateSensorThresholds();

    
    // Subscribe to the data stream for our sensor
    this.sdStreamSub = this.sensorDataProvider.newSensorDataSubscription(this.sensorDir);
    // Pull updates from the data stream at roughly the rate it's being updated
    this.fetchDataIntervalID = window.setInterval(() => {
      // Get the latest millis in one of the sensor data
      const newSensorData = this.sdStreamSub?.dataStream.getNewData();
      if (newSensorData?.length === 0) {
        // No new data
        return;
      }

      newSensorData?.forEach(sd => {
        // Conditional colouring of the sensor data line based on whether the sensor is firing or not.
        // Unfortunately we need a new timeseries per time we go over/under the threshold otherwise
        // it draws an ugly line to link up the old data points of the old series...
        if (this.sensorPressed && !sd[2]) {
          this.sensorPressed = false;
          this.pushNewSensorDataTimeseries(sd[0], sd[1]);
        } else if (!this.sensorPressed && sd[2]) {
          this.sensorPressed = true;
          this.pushNewSensorDataTimeseries(sd[0], sd[1]);
        }
        // Add the new data to the relevant timeseries
        this.sdTimeSeries[this.sdTimeSeries.length - 1].append(sd[0], sd[1]);

        // Only draw the sensor thresholds if we've received them from the microcontroller, otherwise
        // we're drawing at -1 which looks weird and isn't very informational.
        if (this.sensorPressThreshold >= 0) {
          this.pressThresholdTimeSeries.append(sd[0], this.sensorPressThreshold);
        }
        if (this.sensorReleaseThreshold >= 0) {
          this.releaseThresholdTimeSeries.append(sd[0], this.sensorReleaseThreshold);
        }
      });
    }, CHART_DATA_UPDATE_RATE_MILLIS);

    // Set up garbage collection for old series
    this.gcChartIntervalID = window.setInterval(() => {
      this.collectChartGarbage();
    }, CHART_GARBAGE_COLLECT_RATE_MILLIS);

    // Start drawing the chart
    this.chart.streamTo(this.canvas, CHART_DELAY_MILLIS);
  }

  componentWillUnmount() {
    // Unsubscribe from all the things we subscribed to
    if (this.fetchDataIntervalID !== -1) {
      clearInterval(this.fetchDataIntervalID);
    }
    if (this.gcChartIntervalID !== -1) {
      clearInterval(this.gcChartIntervalID);
    }
    if (this.sdStreamSub) {
      this.sensorDataProvider.deleteSensorDataSubscription(this.sensorDir, this.sdStreamSub.uuid);
      this.sdStreamSub = undefined;
    }
    if (this.stEventSub) {
      this.eventDispatcher.unsubscribeSensorThresholdsReceived(this.stEventSub);
    }

    // Stop streaming the chart
    this.chart.stop();
  }

  render() {
    return (
      <div>
        <div id="chart">
          <canvas ref={this.setCanvasRef} width={this.width} height={this.height} />
        </div>
      </div>
    );
  }
}

export default PressureChart;