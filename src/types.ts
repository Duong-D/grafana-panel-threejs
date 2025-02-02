import { VizLegendOptions } from '@grafana/schema';


export interface SimpleOptions {
  modelPath: string;
  modelRootName: string;
  namingConvention: string;
  legend: VizLegendOptions;
}
