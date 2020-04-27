import React from 'react';
import SensorDataStorage, { SensorDataStreamSubscription } from './SensorDataStorage';
import { SensorDirection } from './SensorConst';
import * as Smoothie from 'smoothie';


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
}

interface PressureChartState {
  series: any;
  options: any;
}

class PressureChart extends React.Component<PressureChartProps, PressureChartState> {
  private intervalID = -1;
  private sensorDataProvider: SensorDataStorage;
  private sensorDir: SensorDirection;
  private sensorActivationThreshold?: number;

  // Data stream
  private sdStreamSub: SensorDataStreamSubscription;

  private canvas: HTMLCanvasElement | undefined;
  private setCanvasRef: (element: HTMLCanvasElement) => any;
  private width: number;
  private height: number;

  private chart: Smoothie.SmoothieChart;
  // Sensor data time series, displayed on the smoothie chart
  private timeSeries = new Smoothie.TimeSeries();
  // Sensor threshold time series, displayed as a horizontal line on the smoothie chart
  private thresholdTimeSeries = new Smoothie.TimeSeries();

  constructor(props: PressureChartProps) {
    super(props);
    this.width = props.width;
    this.height = props.height;
    this.sensorDataProvider = props.sensorDataStorage;
    this.sensorDir = props.sensorDir;

    if (props.activationThreshold) {
      this.sensorActivationThreshold = props.activationThreshold;
    }

    this.sdStreamSub = this.sensorDataProvider.getSensorDataSubscription(this.sensorDir);

    this.chart = new Smoothie.SmoothieChart({
      millisPerPixel: 10,
      scaleSmoothing: 1,
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

  componentDidMount() {
    if (this.canvas === undefined) {
      throw new Error('canvas could not be found at runtime, react docs lied!')
    }
    this.chart.addTimeSeries(this.timeSeries, {lineWidth: 2, strokeStyle:'#00ff00'});
    this.chart.addTimeSeries(this.thresholdTimeSeries, {lineWidth: 1, strokeStyle:'#ff0000'})
    this.chart.streamTo(this.canvas, CHART_DELAY_MILLIS);

    // Update logic
    this.intervalID = window.setInterval(() => {
      // Get the latest millis in one of the sensor data
      const newSensorData = this.sdStreamSub.dataStream.getNewData();
      if (newSensorData.length === 0) {
        // No new data
        return;
      }

      newSensorData.forEach(sd => {
        this.timeSeries.append(sd[0], sd[1]);
        if (this.sensorActivationThreshold) {
          this.thresholdTimeSeries.append(sd[0], this.sensorActivationThreshold);
        }
      });
    }, CHART_DATA_UPDATE_RATE_MILLIS);
  }

  componentWillUnmount() {
    if (this.intervalID !== -1) {
      clearInterval(this.intervalID);
    }
  }

  render() {
    return (
      <div>
        <div id="chart">
          <canvas ref={this.setCanvasRef} width={this.width} height={this.height} />
        </div>
        <div id="html-dist"></div>
      </div>
    );
  }
}

export default PressureChart;