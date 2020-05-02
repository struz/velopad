import React from 'react';
import SensorDataStorage, { ISensorDataStreamSubscription } from './SensorDataStorage';
import { SensorDirection } from './SensorConst';
import * as Smoothie from 'smoothie';
import MicrocontrollerEventDispatcher from './MicrocontrollerEventDispatcher';


const CHART_DATA_UPDATE_RATE_MILLIS = 50;
const CHART_DELAY_MILLIS = 0;
const CHART_Y_MIN_VALUE = 0;
// const CHART_Y_MAX_VALUE = 850;

interface PressureChartProps {
  width: number;
  height: number;
  title: string;
  sensorDataStorage: SensorDataStorage;
  sensorDir: SensorDirection;
  activationThreshold?: number;
  eventDispatcher: MicrocontrollerEventDispatcher;
}

interface PressureChartState {
  series: any;
  options: any;
}

class PressureChart extends React.Component<PressureChartProps, PressureChartState> {
  private sensorDataProvider: SensorDataStorage;
  private sensorDir: SensorDirection;
  private sensorPressThreshold = -1;
  private sensorReleaseThreshold = -1;

  // Data streams and event subscriptions
  private intervalID = -1;
  private eventDispatcher: MicrocontrollerEventDispatcher;
  private sdStreamSub?: ISensorDataStreamSubscription;
  private stEventSub?: string;

  private canvas: HTMLCanvasElement | undefined;
  private setCanvasRef: (element: HTMLCanvasElement) => any;
  private width: number;
  private height: number;

  private chart: Smoothie.SmoothieChart;
  // Sensor data time series, displayed on the smoothie chart
  private timeSeries = new Smoothie.TimeSeries();
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
      millisPerPixel: 10,
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

  updateSensorThresholds() {
    const sensorThresholds = this.sensorDataProvider.getSensorThreshold(this.sensorDir);
    this.sensorPressThreshold = sensorThresholds.getPressThreshold();
    this.sensorReleaseThreshold = sensorThresholds.getReleaseThreshold();
  }

  componentDidMount() {
    if (this.canvas === undefined) {
      throw new Error('canvas could not be found at runtime, react docs lied!')
    }

    // When we receive an update to the sensor threshold values, fetch them from storage.
    // Set this callback up before we create the chart data population callback function
    // to avoid a spike in values from the default -1 to the actual value. It looks weird.
    this.eventDispatcher.subscribeSensorThresholdsReceived(() => {
      this.updateSensorThresholds();
    });
    // Make sure our current ones are up to date to avoid any race condition
    this.updateSensorThresholds();

    // Set up our chart paramters - series added later draw over the top of series added earlier
    this.chart.addTimeSeries(this.timeSeries, {lineWidth: 2, strokeStyle:'#00ff00'});
    this.chart.addTimeSeries(this.releaseThresholdTimeSeries, {lineWidth: 1.5, strokeStyle:'#ffff00'})
    this.chart.addTimeSeries(this.pressThresholdTimeSeries, {lineWidth: 1.5, strokeStyle:'#ff0000'})
    this.chart.streamTo(this.canvas, CHART_DELAY_MILLIS);

    // Subscribe to the data stream for our sensor
    this.sdStreamSub = this.sensorDataProvider.newSensorDataSubscription(this.sensorDir);

    // Pull updates from the data stream at roughly the rate it's being updated
    this.intervalID = window.setInterval(() => {
      // Get the latest millis in one of the sensor data
      const newSensorData = this.sdStreamSub?.dataStream.getNewData();
      if (newSensorData?.length === 0) {
        // No new data
        return;
      }

      newSensorData?.forEach(sd => {
        this.timeSeries.append(sd[0], sd[1]);
        if (this.sensorPressThreshold) {
          this.pressThresholdTimeSeries.append(sd[0], this.sensorPressThreshold);
        }
        if (this.sensorReleaseThreshold) {
          this.releaseThresholdTimeSeries.append(sd[0], this.sensorReleaseThreshold);
        }
      });
    }, CHART_DATA_UPDATE_RATE_MILLIS);
  }

  componentWillUnmount() {
    // Unsubscribe from all the things we subscribed to
    if (this.intervalID !== -1) {
      clearInterval(this.intervalID);
    }
    if (this.sdStreamSub) {
      this.sensorDataProvider.deleteSensorDataSubscription(this.sensorDir, this.sdStreamSub.uuid);
      this.sdStreamSub = undefined;
    }
    if (this.stEventSub) {
      this.eventDispatcher.unsubscribeSensorThresholdsReceived(this.stEventSub);
    }
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