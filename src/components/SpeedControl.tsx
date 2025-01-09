import React, {useState} from "react";
import { getStyles } from "./SimplePanel";
import { useStyles2 } from '@grafana/ui';
import { debounce } from "lodash";

console.log("Accessing SpeedControl")
// import { SimpleOptions } from 'types';
/*
  This is for setting the Speed input component.
  Steps:
    inputValue -> For handling with input value
*/
interface SpeedControlProps {
  onOptionsSpeedChange: (speed: number) => void; // Function to update options in Grafana
  optionsSpeed: number;                      // Speed value from Grafana options

}

const SpeedControl: React.FC<SpeedControlProps> = ({
  onOptionsSpeedChange, 
  optionsSpeed, }) => {
    
  console.log("SpeedControl triggered")
  const styles = useStyles2(getStyles);

  // const [currentSpeed, setSpeed] = useState(0);
  const [inputValue, setInputValue] = useState(optionsSpeed ? optionsSpeed.toString() : '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>)=>{
    if (!(e.target.value)){
      setInputValue('')}
      else{
      setInputValue(e.target.value);
    }
  };

  const handleKeyDownDebounce = debounce((inputValue: string, onOptionsSpeedChange)=>{
    const newSpeed = parseFloat(inputValue);
      if (!isNaN(newSpeed)){
        onOptionsSpeedChange(newSpeed);
      } else{
        // onOptionsSpeedChange(0);
        console.warn("Invalid speed was entered")
      }
  },300);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>)=>{
    if (e.key === 'Enter'){
      handleKeyDownDebounce(inputValue, onOptionsSpeedChange)
  }};
   
  return (
    <div className={styles.textBox2}>
      <input 
        type="number"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Enter speed (ms)"
       />
      {/* <div className={styles.textBox2}>
        {inputValue}
      </div> */}
      <p> Current Speed: {optionsSpeed} Degree/Sec</p>

    </div>
  );
};

// Wrap it with React.memo and add displayName
const MemoizedSpeedControl = React.memo(SpeedControl);
MemoizedSpeedControl.displayName = 'SpeedControl';

export default MemoizedSpeedControl;
