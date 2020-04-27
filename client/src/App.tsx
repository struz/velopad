import React from 'react';
import './App.css';
import SensorDataConnection from './SensorDataConnection';
import SensorDataStorage from './SensorDataStorage';
import PressureChart from './PressureChart';
import { SensorDirection } from './SensorConst';

class App extends React.Component {
  private storage = new SensorDataStorage();

  constructor(props: any) {
    super(props);
    new SensorDataConnection('ws://localhost:8080', this.storage);
  }

  render() {
    return (
      <div className="App">
        <p>X axis lines are 1 second apart</p>
        <PressureChart width={640} height={200} title="Left" sensorDataStorage={this.storage} sensorDir={SensorDirection.Left} />
        <PressureChart width={640} height={200} title="Down" sensorDataStorage={this.storage} sensorDir={SensorDirection.Down} />
        <PressureChart width={640} height={200} title="Up" sensorDataStorage={this.storage} sensorDir={SensorDirection.Up} />
        <PressureChart width={640} height={200} title="Right" sensorDataStorage={this.storage} sensorDir={SensorDirection.Right} activationThreshold={90} />
      </div>
    );
  }
}

export default App;
