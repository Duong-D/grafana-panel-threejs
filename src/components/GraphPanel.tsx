import React, { useEffect, useState } from 'react';
import { PanelData, TimeRange, TimeZone, DataFrame} from '@grafana/data';
import { TimeSeries, TooltipPlugin, ZoomPlugin, TooltipDisplayMode} from '@grafana/ui';
import { Object3D } from 'three';
import { SimpleOptions } from 'types';
import './css/GraphPanel.css';

interface GraphPanelProps {
  object: Object3D; // Name of the object
  visible: boolean; // Whether the popup should be visible
  timeRange: TimeRange;
  timeZone: TimeZone;
  data: PanelData;
  options: SimpleOptions;
  width: number;
  height: number;
}

// type ExtendedPanelProps = PanelProps & GraphPanelProps;

export const GraphPanel: React.FC<GraphPanelProps> = ({object, visible, timeRange, timeZone, data, options, width, height})=>{
  const [unit, setUnit] = useState<string| undefined>("");
  const [selectedThingName, setSelectedThingName] = useState("");
  const [isGraphAvailable, setIsGraphAvailable] = useState(true);
  const [filteredSeries, setfilteredSeries] = useState(data.series)

  useEffect(()=>{
    const selectedThingName = object.name;
    setSelectedThingName(selectedThingName);

    let lastUnderscore = 0;
    const foundSeries = data.series.find((series) => {
      const refId = series.refId!;
      lastUnderscore = refId.lastIndexOf("_");
      const queryName = lastUnderscore !== -1 ? refId.substring(0, lastUnderscore) : refId;
    
      return queryName === selectedThingName;
    });
    
    // Ensure it returns a valid `DataFrame[]` format
    const filteredSeries: DataFrame[] = foundSeries ? [foundSeries] : [];

    // Update state instead of returning JSX
    if (filteredSeries.length === 0) {
      setIsGraphAvailable(false);
      return;
    }

    setIsGraphAvailable(true);
    setfilteredSeries(filteredSeries);

    const unit = lastUnderscore !== -1 ? filteredSeries[0].refId?.substring(lastUnderscore + 1) : "";
    console.log(unit)
    setUnit(unit) 
  },[object, data, visible])
  

  return (
    <div>
      {isGraphAvailable ? (
        <div >
        <div className="graph-title">
          <div>
            <span className="graph-sub">Graph of:</span> {selectedThingName}
          </div>
          <div>
            <span className="graph-sub">Measured in:</span> {unit}
          </div>
        </div>
        <TimeSeries
          width={500}  // TimeSeries panel width
          height={300} // TimeSeries panel height
          timeRange={timeRange}
          timeZone={timeZone}
          frames={filteredSeries}
          legend={options.legend}  // Adjust legend visibility as needed
        >
          {(config, alignedDataFrame) => {
            function onChangeTimeRange(range: { from: number; to: number }) {
              console.log('Time range changed:', range);
            }

            return (
              <>
                <TooltipPlugin
                  config={config}
                  data={alignedDataFrame}
                  mode={TooltipDisplayMode.Multi}
                  timeZone={timeZone}
                />
                <ZoomPlugin config={config} onZoom={onChangeTimeRange} />
              </>
            );
          }}
        </TimeSeries>
    </div>
      ) : (
        <div className={`graph-unavailable-container ${visible ? "visible" : ""}`}>
          <div className="graph-unavailable-name">Graph Unavailable</div>
        </div>
      )}
    </div>
  ) 
}
