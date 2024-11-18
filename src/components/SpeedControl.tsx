import React, {useState} from "react";
import { getStyles } from "./SimplePanel";
import { useStyles2 } from '@grafana/ui';
/*
  This is for setting the Speed input component.
  Steps:
    inputValue -> For handling with input value
*/

export const SpeedControl = ({currentSpeed, setSpeed}: {currentSpeed: number, setSpeed: React.Dispatch<React.SetStateAction<number>>}) =>{
  const styles = useStyles2(getStyles);

  // const [currentSpeed, setSpeed] = useState(0);
  const [inputValue, setInputValue] = useState(currentSpeed.toString());

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>)=>{
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>)=>{
    if (e.key === 'Enter'){
      const newSpeed = parseFloat(inputValue);
      if (!isNaN(newSpeed)){
        setSpeed(newSpeed);
      }
    }
  };
   
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
      <p> Current Speed: {currentSpeed} Degree/Sec</p>

    </div>
  );
};
