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

  constructor(props: any) {
    super(props);
    this.storage  = new SensorDataStorage();
    this.eventDispatcher = new MicrocontrollerEventDispatcher(this.storage);
    this.dataConnection = new SensorDataConnection('ws://localhost:8080', this.eventDispatcher);

    this.updateThresholds = this.updateThresholds.bind(this);

    // Debugging
    window.dataConnection = this.dataConnection;
    window.storage = this.storage;
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
      <div className="App">
        <SensorThresholdPicker eventDispatcher={this.eventDispatcher} storage={this.storage} onSendThresholdUpdate={this.updateThresholds} />
        <p>X axis lines are 1 second apart</p>
        {/* Loop over all directions and make a chart */}
        {[...Array(SensorDirection.Right + 1)].map((_, i) => {
          return <PressureChart width={640} height={175} title={SENSOR_NAMES[i]} sensorDataStorage={this.storage}
                  sensorDir={i} eventDispatcher={this.eventDispatcher} key={SENSOR_NAMES[i]} />
        })}
      </div>
    );
  }
}

export default App;
