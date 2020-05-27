import React from 'react';
import './App.css';
import SensorDataConnection from './SensorDataConnection';
import SensorDataStorage from './SensorDataStorage';
import PressureChart from './PressureChart';
import { SensorDirection, SENSOR_NAMES } from './SensorConst';
import MicrocontrollerEventDispatcher from './MicrocontrollerEventDispatcher';
import SensorThresholdPicker from './SensorThresholdPicker';
import SensorThreshold from './SensorThreshold';

// Debugging
declare global {
  interface Window { 
    dataConnection: SensorDataConnection;
    storage: SensorDataStorage;
  }
}

class App extends React.Component {
  private eventDispatcher: MicrocontrollerEventDispatcher;
  private dataConnection: SensorDataConnection;
  private storage: SensorDataStorage;
  private graphsPaused = false;
  private chartWidth = 640;
  private chartHeight = 175;
  private tooltipBufferHeight = 125;

  constructor(props: any) {
    super(props);
    this.storage  = new SensorDataStorage();
    this.eventDispatcher = new MicrocontrollerEventDispatcher(this.storage);
    this.dataConnection = new SensorDataConnection('ws://localhost:8080', this.eventDispatcher);

    this.pauseUnpause = this.pauseUnpause.bind(this);
    this.updateThresholds = this.updateThresholds.bind(this);

    // Debugging
    window.dataConnection = this.dataConnection;
    window.storage = this.storage;
  }

  pauseUnpause() {
    this.graphsPaused = !this.graphsPaused;
    // Manually trigger a re-render of child components to pass props down
    this.setState({});
  }

  updateThresholds(thresholds: Array<SensorThreshold>) {
    this.dataConnection.updateSensorThresholds(thresholds);
  }

  componentDidMount() {
    // Ask for up to date sensor threshold values once we connect
    const askForSensorThresholds = () => {
      this.dataConnection.askSensorThresholds();
    }
    this.dataConnection.connect(askForSensorThresholds);
  }

  componentWillUnmount() {
    this.dataConnection.disconnect();
  }

  render() {
    return (
      /* Make the minimum height of the app based on the number of charts, so the tooltip for the lowest chart doesn't disappear off the bottom */
      <div className="App" style={{minHeight: (this.chartHeight * (SensorDirection.Right + 1)) + this.tooltipBufferHeight}}>
        <span>X axis lines are 1 second apart</span>
        {/* Loop over all directions and make a chart */}
        <div>
          {[...Array(SensorDirection.Right + 1)].map((_, i) => {
            return <PressureChart width={this.chartWidth} height={this.chartHeight} title={SENSOR_NAMES[i]} sensorDataStorage={this.storage}
                    sensorDir={i} eventDispatcher={this.eventDispatcher} key={SENSOR_NAMES[i]} paused={this.graphsPaused} />
          })}
        </div>
        <button onClick={this.pauseUnpause}>Pause/Unpause</button>
        <SensorThresholdPicker eventDispatcher={this.eventDispatcher} storage={this.storage} onSendThresholdUpdate={this.updateThresholds} />
      </div>
    );
  }
}

export default App;
