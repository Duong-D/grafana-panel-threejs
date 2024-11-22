type SeriesSize = 'sm' | 'md' | 'lg';

export interface SimpleOptions {
  name: string;
  speed: number;
  showSeriesCount: boolean;
  seriesCountSize: SeriesSize;
}
