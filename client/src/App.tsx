import React from 'react';
import './App.css';
import SensorDataConnection from './SensorDataConnection';
import SensorDataStorage from './SensorDataStorage';
import PressureChart from './PressureChart';
import { SensorDirection } from './SensorConst';
import MicrocontrollerEventDispatcher from './MicrocontrollerEventDispatcher';

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
    // Debugging
    window.dataConnection = this.dataConnection;
    window.storage = this.storage;
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
        <p>X axis lines are 1 second apart</p>
        <PressureChart width={640} height={175} title="Left" sensorDataStorage={this.storage}
         sensorDir={SensorDirection.Left} eventDispatcher={this.eventDispatcher} />
        <PressureChart width={640} height={175} title="Down" sensorDataStorage={this.storage}
         sensorDir={SensorDirection.Down} eventDispatcher={this.eventDispatcher} />
        <PressureChart width={640} height={175} title="Up" sensorDataStorage={this.storage}
         sensorDir={SensorDirection.Up} eventDispatcher={this.eventDispatcher} />
        <PressureChart width={640} height={175} title="Right" sensorDataStorage={this.storage}
         sensorDir={SensorDirection.Right} eventDispatcher={this.eventDispatcher} />
      </div>
    );
  }
}

export default App;
