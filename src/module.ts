import { PanelPlugin, FieldColorModeId } from '@grafana/data';
import { LegendDisplayMode, GraphGradientMode } from '@grafana/schema';
import { SimpleOptions } from './types';
import { MainPanel } from './components/MainPanel';
import { ariaLabels } from 'components/ariaLabels';


export const plugin = new PanelPlugin<SimpleOptions>(MainPanel)
.useFieldConfig({
  standardOptions: {
    color: {
      defaultValue: {
        mode: FieldColorModeId.ContinuousGrYlRd,
      },
    },
  },
  useCustomConfig: (builder) => {
    builder
      .addRadio({
        path: 'gradientMode',
        name: 'Gradient mode',
        defaultValue: GraphGradientMode.Scheme,
        settings: {
          options: [
            {
              label: 'None',
              value: GraphGradientMode.None,
              ariaLabel: ariaLabels.gradientNone,
            },
            {
              label: 'Opacity',
              value: GraphGradientMode.Opacity,
              description: 'Enable fill opacity gradient',
              ariaLabel: ariaLabels.gradientOpacity,
            },
            {
              label: 'Hue',
              value: GraphGradientMode.Hue,
              description: 'Small color hue gradient',
              ariaLabel: ariaLabels.gradientHue,
            },
            {
              label: 'Scheme',
              value: GraphGradientMode.Scheme,
              description: 'Use color scheme to define gradient',
              ariaLabel: ariaLabels.gradientScheme,
            },
          ],
        },
      })
      .addSliderInput({
        path: 'fillOpacity',
        name: 'Fill opacity',
        defaultValue: 25,
        settings: {
          min: 0,
          max: 100,
          step: 1,
          ariaLabelForHandle: ariaLabels.fillOpacity,
        },
      });
  },
}).setPanelOptions((builder) => {
  return builder
    .addTextInput({
      path: 'modelPath',
      name: "Model's path",
      category: ['Model Configuration'],
      description: 'Please enter the URL, link, or file path to 3D model file. Ensure it is glb file',
      defaultValue: 'https://duong-d.github.io/tbm-model-hosting/TBM_Model12.glb',
    })
    .addTextInput({
      path: 'modelRootName',
      name: "Root name of the model",
      category: ['Model Configuration'],
      description: 'Please enter the name',
      defaultValue: 'ASM_TBM',
    })
    .addTextInput({
      path: 'namingConvention',
      name: "Prefix",
      category: ['Model Configuration'],
      description: 'Please enter the prefix for assembly and part',
      defaultValue: 'ASM, CMP',
    })
    .addRadio({
      path: 'legend.displayMode',
      name: 'Legend mode',
      category: ['Legend'],
      description: '',
      defaultValue: LegendDisplayMode.List,
      settings: {
        options: [
          {
            value: LegendDisplayMode.List,
            label: 'List',
            ariaLabel: ariaLabels.legendDisplayList,
          },
          {
            value: LegendDisplayMode.Table,
            label: 'Table',
            ariaLabel: ariaLabels.legendDisplayTable,
          },
          {
            value: undefined,
            label: 'Hidden',
            ariaLabel: ariaLabels.legendDisplayHidden,
          },
        ],
      },
    })
    .addRadio({
      path: 'legend.placement',
      name: 'Legend placement',
      category: ['Legend'],
      description: '',
      defaultValue: 'bottom',
      settings: {
        options: [
          {
            value: 'bottom',
            label: 'Bottom',
            ariaLabel: ariaLabels.legendPlacementBottom,
          },
          {
            value: 'right',
            label: 'Right',
            ariaLabel: ariaLabels.legendPlacementRight,
          },
        ],
      },
      showIf: (config) => !!config.legend.displayMode,
    })
});

