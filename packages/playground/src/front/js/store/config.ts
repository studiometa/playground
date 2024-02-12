import { noopValue, isString } from '@studiometa/js-toolkit/utils';
import type { PartialDeep } from 'type-fest';

export type PlaygroundLoader = (content: string) => string | Promise<string>;

export type PlaygroundDefaultContent = string | (() => Promise<string>);

export interface PlaygroundConfig {
	/**
	 * Define the default contents for each editor.
	 */
	defaults: {
		/**
		 * Define the default contents for the HTML editor.
		 */
		html: PlaygroundDefaultContent;
		/**
		 * Define the default contents for the style editor.
		 */
		style: PlaygroundDefaultContent;
		/**
		 * Define the default contents for the script editor.
		 */
		script: PlaygroundDefaultContent;
	};
	/**
	 * Define the loaders to use to transform each content
	 * before sending it to the iframe.
	 */
	loaders: {
		/**
		 * Define the loader to use to transform the HTML editor content
		 * before sending it to the iframe.
		 */
		html: PlaygroundLoader;
		/**
		 * Define the loader to use to transform the style editor content
		 * before sending it to the iframe.
		 */
		style: PlaygroundLoader;
		/**
		 * Define the loader to use to transform the script editor content
		 * before sending it to the iframe.
		 */
		script: PlaygroundLoader;
	};
}

export type PartialPlaygroundConfig = PartialDeep<PlaygroundConfig>;

const store: PlaygroundConfig = {
	defaults: {
		html: '',
		style: '',
		script: '',
	},
	loaders: {
		html: noopValue,
		style: noopValue,
		script: noopValue,
	},
};

export function setConfig(config?: PartialPlaygroundConfig) {
	setDefaults(config?.defaults);

	store.loaders = {
		...store.loaders,
		...config?.loaders,
	};
}

export function setDefaults(defaults?: PartialPlaygroundConfig['defaults']) {
	console.log('setDefaults', defaults);
	store.defaults = {
		...store.defaults,
		...defaults,
	};
}

async function getDefault(type: 'html' | 'style' | 'script') {
	console.log('getDefault', type);
	const defaultContent = store.defaults[type];

	if (isString(defaultContent)) {
		return defaultContent;
	}

	return defaultContent();
}

export async function getDefaultHtml() {
	return getDefault('html');
}

export async function getDefaultStyle() {
	return getDefault('style');
}

export async function getDefaultScript() {
	return getDefault('script');
}

export function getHtmlLoader() {
	return store.loaders.html;
}

export function getStyleLoader() {
	return store.loaders.style;
}

export function getScriptLoader() {
	return store.loaders.script;
}
