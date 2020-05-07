import React from "react";
import MicrocontrollerEventDispatcher from "./MicrocontrollerEventDispatcher";
import SensorDataStorage from "./SensorDataStorage";
import SensorThreshold from "./SensorThreshold";
import { SENSOR_NAMES, SensorDirection } from "./SensorConst";


// Simplified SensorThreshold for use in UI updates
interface SimpleSensorThreshold {
  sensorName: string;
  pressThreshold: number;
  releaseThreshold: number;
}
enum PressRelease {
  Press,
  Release
}

interface SensorThresholdPickerProps {
  storage: SensorDataStorage;
  eventDispatcher: MicrocontrollerEventDispatcher;
  onSendThresholdUpdate: (thresholds: Array<SensorThreshold>) => void;
}

interface SensorThresholPickerState {
  thresholds: Array<SimpleSensorThreshold>;
}

class SensorThresholdPicker extends React.Component<SensorThresholdPickerProps, SensorThresholPickerState> {
  private storage: SensorDataStorage;
  private eventDispatcher: MicrocontrollerEventDispatcher;

  private stEventSub?: string;

  constructor(props: SensorThresholdPickerProps) {
    super(props);
    this.storage = props.storage;
    this.eventDispatcher = props.eventDispatcher;

    this.state = {
      thresholds: SensorThresholdPicker.sensorThresholdsToSimple(this.storage.getSensorThresholds())
    }

    this.sendThresholdsUpdate = this.sendThresholdsUpdate.bind(this);
    this.thresholdChanged = this.thresholdChanged.bind(this);
  }

  static sensorThresholdsToSimple(thresholds: Array<SensorThreshold>) {
    return thresholds.map((threshold, i) => {
      return {
        sensorName: SENSOR_NAMES[i],
        pressThreshold: threshold.getPressThreshold(),
        releaseThreshold: threshold.getReleaseThreshold(),
      }
    });
  }

  static simpleThresholdsToSensor(thresholds: Array<SimpleSensorThreshold>) {
    return thresholds.map((threshold, i) => {
      return new SensorThreshold(threshold.pressThreshold, threshold.releaseThreshold);
    });
  }

  // Event handler for sending a threshold update to the micocontroller
  sendThresholdsUpdate() {
    this.props.onSendThresholdUpdate(SensorThresholdPicker.simpleThresholdsToSensor(this.state.thresholds));
  }

  // Event handler for changed value pickers
  thresholdChanged(dir: SensorDirection, value: number, pressRelease: PressRelease) {
    // Threshold change means we store the new data, but we don't send it off to
    // the microcontroller until the button gets hit
    this.setState(prevState => {
      if (pressRelease === PressRelease.Press) {
        prevState.thresholds[dir].pressThreshold = value;
      } else {
        prevState.thresholds[dir].releaseThreshold = value;
      }
      return {thresholds: prevState.thresholds}
    });
  }

  componentDidMount() {
    // Register a function to take threshold updates and reflect them in our state
    this.stEventSub = this.eventDispatcher.subscribeSensorThresholdsReceived(() => {
      this.setState(() => {
        const thresholds = this.storage.getSensorThresholds();
        return {
          thresholds: SensorThresholdPicker.sensorThresholdsToSimple(thresholds)
        }
      });
    });
  }

  componentWillUnmount() {
    if (this.stEventSub) {
      this.eventDispatcher.unsubscribeSensorThresholdsReceived(this.stEventSub);
    }
  }

  render() {
    return (
      <div className="SensorThresholdPicker">
        <div className="SensorThresholds">
          {[...Array(SensorDirection.Right + 1)].map((_, i) => {
            return (
              <div className="Sensor" key={SENSOR_NAMES[i]}>
                <span className="SensorName">{this.state.thresholds[i].sensorName}</span>
                <ValuePicker dir={i} label="Press" value={this.state.thresholds[i].pressThreshold} pressRelease={PressRelease.Press}
                 onChange={this.thresholdChanged} />
                <ValuePicker dir={i} label="Release" value={this.state.thresholds[i].releaseThreshold} pressRelease={PressRelease.Release}
                 onChange={this.thresholdChanged} />
              </div>
            )
          })}
        </div>
        <button onClick={this.sendThresholdsUpdate}>Update Thresholds</button>
      </div>
    );
  }
}


interface ValuePickerProps {
  dir: SensorDirection;
  label: string;
  value: number;
  // Whether this handles the press or release value for the direction
  pressRelease: PressRelease;
  onChange: (dir: SensorDirection, value: number, pressRelease: PressRelease) => void;
}

// PureComponent so that the pickers don't all re-render when we modify the threhsolds list
class ValuePicker extends React.PureComponent<ValuePickerProps> {
  onValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.props.onChange(this.props.dir, event.target.valueAsNumber, this.props.pressRelease);
  }

  render() {
    return (
      <div className="SensorValuePicker">
        <span className="FormLabel">{this.props.label}</span>
        <input type="number" value={this.props.value.toString()} onChange={this.onValueChange} />
      </div>
    )
  }
}

export default SensorThresholdPicker;
