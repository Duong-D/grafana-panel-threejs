import { PanelPlugin } from '@grafana/data';
import { SimpleOptions } from './types';
import { SimplePanel } from './components/SimplePanel';

export const plugin = new PanelPlugin<SimpleOptions>(SimplePanel).setPanelOptions((builder) => {
  return builder
    .addTextInput({
      path: 'modelPath',
      name: "Model's path",
      description: 'Please enter the URL, link, or file path to 3D model file. Ensure it is glb file',
      defaultValue: 'https://duong-d.github.io/tbm-model-hosting/TBM_Model6.glb',
    })
    .addTextInput({
      path: 'modelRootName',
      name: "Root name of the model",
      description: 'Please enter the name',
      defaultValue: 'ASM_TBM',
    })
    .addTextInput({
      path: 'namingConvention',
      name: "Prefix",
      description: 'Please enter the prefix for assembly and part',
      defaultValue: 'ASM, CMP',
    })
    .addBooleanSwitch({
      path: 'showSeriesCount',
      name: 'Show series counter',
      defaultValue: false,
    })
    .addRadio({
      path: 'seriesCountSize',
      defaultValue: 'sm',
      name: 'Series counter size',
      settings: {
        options: [
          {
            value: 'sm',
            label: 'Small',
          },
          {
            value: 'md',
            label: 'Medium',
          },
          {
            value: 'lg',
            label: 'Large',
          },
        ],
      },
      showIf: (config) => config.showSeriesCount,
    });
});
