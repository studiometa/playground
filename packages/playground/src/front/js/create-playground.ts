import { createApp } from '@studiometa/js-toolkit';
import { Playground } from './components/Playground.js';

export type PlaygroundLoader = (content: string) => Promise<string>;

export type PlaygroundDefaultContent = string | (() => Promise<string>);

export interface PlaygroundOptions {
  /**
   * Define the default contents for each editor.
   */
  defaults?: {
    /**
     * Define the default contents for the HTML editor.
     */
    html?: PlaygroundDefaultContent;
    /**
     * Define the default contents for the style editor.
     */
    style?: PlaygroundDefaultContent;
    /**
     * Define the default contents for the script editor.
     */
    script?: PlaygroundDefaultContent;
  };
  /**
   * Define the loaders to use to transform each content
   * before sending it to the iframe.
   */
  loaders?: {
    /**
     * Define the loader to use to transform the HTML editor content
     * before sending it to the iframe.
     */
    html?: PlaygroundLoader;
    /**
     * Define the loader to use to transform the style editor content
     * before sending it to the iframe.
     */
    style?: PlaygroundLoader;
    /**
     * Define the loader to use to transform the script editor content
     * before sending it to the iframe.
     */
    script?: PlaygroundLoader;
  };
}

const defaultOptions: PlaygroundOptions = {
  defaults: {
    html: '',
    style: '',
    script: '',
  },
  loaders: {
    html: async (string) => string,
    style: async (string) => string,
    script: async (string) => string,
  },
};

export function createPlayground(options?: PlaygroundOptions) {
  const finalOptions = {
    defaults: {
      ...defaultOptions.defaults,
      ...options?.defaults,
    },
    loaders: {
      ...defaultOptions.loaders,
      ...options?.loaders,
    }
  };

  Playground.setOptions(finalOptions);

  return createApp(Playground, {
    features: {
      asyncChildren: true,
    },
  });
}
