import { findInReactTree, findInTree, unitToHex, withoutOpacity } from '@utilities';
import { ImageBackground, LayoutAnimation } from 'react-native';
import type { Manifest, Resolveable } from '@typings/managers';
import Storage, { useSettingsStore } from '@api/storage';
import type { Theme } from '@typings/managers/themes';
import { findByName, findByProps } from '@api/metro';
import { getNativeModule } from '@api/native';
import { useEffect, useState } from 'react';
import { createPatcher } from '@patcher';

import Manager, { ManagerKind } from './base';

class Themes extends Manager {
	public patcher: ReturnType<typeof createPatcher>;
	public nativeModule = getNativeModule('DCDTheme');
	public extension: string = 'json';
	public module: any;

	constructor() {
		super(ManagerKind.THEMES);

		this.patcher = createPatcher('themes');
		this.icon = 'ic_paint_brush';
	}

	async initialize(mdl: any) {
		this.module = mdl;

		this.module._Theme = { ...this.module.Theme };
		this.module._RawColor = { ...this.module.RawColor };

		for (const theme of window.UNBOUND_THEMES ?? []) {
			const { manifest, bundle } = theme;

			this.load(bundle, manifest);
		}

		this.patchColors();
		this.patchChatBackground();

		this.initialized = true;
	}

	patchColors() {
		const { RawColor } = this.module;

		for (const key in RawColor) {
			Object.defineProperty(RawColor, key, {
				configurable: true,
				enumerable: true,
				get: () => {
					const { _RawColor } = this.module;

					const applied = this.settings.get('applied', null);
					if (!applied) return _RawColor[key];

					const theme = this.entities.get(applied);
					if (!theme) return _RawColor[key];

					return theme.instance.raw?.[key] ?? _RawColor[key];
				}
			});
		}

		const InternalResolver = findInTree(this.module, m => m?.resolveSemanticColor);
		this.patcher.instead(InternalResolver, 'resolveSemanticColor', (self, args: [theme: string, ref: { [key: symbol]: string; }], orig) => {
			const [theme, ref, ...rest] = args;

			const entity = this.entities.get(theme);
			if (!entity) return orig.apply(self, args);

			const { instance } = entity;

			const [symbol] = Object.getOwnPropertySymbols(ref);
			const key = ref[symbol];
			const item = instance.semantic?.[key];

			try {
				let color = null;

				if (!item) {
					color = orig.call(self, instance?.type ?? 'darker', ref, ...rest);
				} else {
					color = this.parseColor(item);
				}

				if (key === 'CHAT_BACKGROUND' && typeof instance.background?.opacity === 'number') {
					return (color ?? '#000000') + Math.round(instance.background.opacity * 255).toString(16);
				}

				return item?.opacity ? withoutOpacity(color) + unitToHex(item.opacity) : color;
			} catch (e) {
				this.logger.error('Failed to resolve color:', e);
			}

			return orig.call(this, instance?.type ?? 'darker', ref);
		});
	}

	async patchChatBackground() {
		const Chat = findByName('MessagesWrapperConnected', { interop: false });

		this.patcher.after(Chat, 'default', (_, __, res) => {
			const settings = useSettingsStore('theme-states');
			const applied = settings.get('applied', null);
			if (!applied) return res;

			const theme = this.entities.get(applied);
			if (!theme || !theme.instance.background) return res;

			const { instance: { background } } = theme;

			return (
				<ImageBackground
					blurRadius={typeof background.blur === 'number' ? background.blur : 0}
					style={{ flex: 1, height: '100%', width: '100%' }}
					source={{ uri: background.url }}
				>
					{res}
				</ImageBackground>
			);
		});

		const { MessagesWrapper } = findByProps('MessagesWrapper');
		this.patcher.after(MessagesWrapper.prototype, 'render', (_, __, res) => {
			const applied = this.settings.get('applied', null);
			if (!applied) return res;

			const theme = this.entities.get(applied);
			if (!theme || !theme.instance.background) return res;

			const Messages = findInReactTree(res, x =>
				'HACK_fixModalInteraction' in x.props
				&& x.props?.style
			);

			if (Messages) {
				Messages.props.style = [Messages.props.style, { backgroundColor: '#00000000' }];
			}
		});
	}

	patchThemeStore(store) {
		// Traverse prototype to find theme getter.
		const proto = findInTree(store, m => m?.hasOwnProperty('theme'), { walkable: ['__proto__'] });
		if (!proto) return this.logger.error(`Failed to patch theme store. Could not find resolveSemanticColor.`);

		// Back up original theme getter
		const descriptor = Object.getOwnPropertyDescriptor(proto, 'theme');
		Object.defineProperty(proto, '__theme', descriptor);

		// Override theme getter, falling back to the original if no theme is applied.
		Object.defineProperty(proto, 'theme', {
			get: () => {
				const applied = this.settings.get('applied', null);
				if (applied) return applied;

				return store.__theme;
			}
		});

		// On theme change, emit a store change to force all components (mainly RootThemeContextProvider) to access our getter override and update their state.
		this.on('started', () => store.emitChange());
		this.on('stopped', () => store.emitChange());
	}

	registerValues(theme: Theme) {
		const { Theme, Shadow, SemanticColor } = this.module;
		const { data, instance } = theme;

		const key = data.id.toUpperCase().replace('.', '_');
		Theme[key] = data.id;

		for (const key in Shadow) {
			const value = Shadow[key];
			value[data.id] = instance.shadows?.[key] ?? Shadow[key][instance.type ?? 'darker'];
		}

		for (const key in SemanticColor) {
			const value = SemanticColor[key];
			value[data.id] = instance.shadows?.[key] ?? SemanticColor[key][instance.type ?? 'darker'];
		}
	}

	parseColor(item: Record<string, any>) {
		if (!item?.value) return item;

		if (item?.type === 'raw') {
			return this.module.RawColor[item.value];
		};

		if (item?.type === 'color') {
			return item.value.replace('transparent', 'rgba(0, 0, 0, 0)');
		}
	}

	override load(bundle: string, manifest: Manifest): Theme {
		const data: { failed: boolean; instance: Theme['instance']; } = {
			failed: false,
			instance: null
		};

		try {
			this.validateManifest(manifest);

			const res = this.handleBundle(bundle);
			if (!res) this.handleInvalidBundle();

			data.instance = res;

			if (this.errors.has(manifest.id) || this.errors.has(manifest.path)) {
				this.errors.delete(manifest.id);
				this.errors.delete(manifest.path);
			}
		} catch (error) {
			data.failed = true;
			this.logger.error(`Failed to execute ${manifest.id}:`, error.message);
			this.errors.set(manifest.id ?? manifest.path, error);
		}

		const addon = {
			data: manifest,
			instance: data.instance,
			id: manifest.id,
			failed: data.failed,
			started: false
		};

		this.entities.set(manifest.id, addon);
		this.registerValues(addon);

		if (this.isEnabled(addon.id)) {
			this.start(addon);
		}

		this.emit('updated');

		return addon;
	}

	override async enable(entity: Resolveable): Promise<void> {
		const addon = this.resolve(entity);
		if (!addon) return;

		try {
			const prev = this.settings.get('applied', null);
			if (prev) this.stop(prev);
			this.settings.set('applied', addon.id);
			if (!addon.started) this.start(addon);
			this.nativeModule.updateTheme(addon.id);
		} catch (e) {
			this.logger.error(`Failed to enable ${addon.data.id}:`, e.message);
		}
	}

	override async disable(entity: Resolveable): Promise<void> {
		const addon = this.resolve(entity);
		if (!addon) return;

		try {
			this.settings.set('applied', null);
			if (addon.started) this.stop(addon);
		} catch (e) {
			this.logger.error(`Failed to stop ${addon.data.id}:`, e.message);
		}
	}

	override async start(entity: Resolveable): Promise<void> {
		const addon = this.resolve(entity);
		if (!addon || addon.failed || Storage.get('unbound', 'recovery', false)) return;

		try {
			addon.started = true;
			this.emit('started');
			this.logger.log(`${addon.id} applied.`);
		} catch (e) {
			this.logger.error('Failed to apply theme:', e.message);
		}
	}

	override isEnabled(id: string): boolean {
		return this.settings.get('applied', null) == id;
	}

	override handleBundle(bundle: string): any {
		return typeof bundle === 'object' ? bundle : JSON.parse(bundle);
	}

	override useEntities() {
		const [, forceUpdate] = useState({});

		useEffect(() => {
			function handler() {
				LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
				forceUpdate({});
			}

			this.on('updated', handler);
			this.on('enabled', handler);
			this.on('disabled', handler);

			return () => {
				this.off('updated', handler);
				this.off('enabled', handler);
				this.off('disabled', handler);
			};
		}, []);

		return this.addons;
	}
}

export default new Themes();