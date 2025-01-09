type SeriesSize = 'sm' | 'md' | 'lg';

export interface SimpleOptions {
  modelPath: string;
  modelRootName: string;
  namingConvention: string;
  flag: boolean;
  speed: number;
  showSeriesCount: boolean;
  seriesCountSize: SeriesSize;
}
