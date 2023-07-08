import { useSettingsStore } from '@api/storage';
import { React, i18n } from '@metro/common';
import { Keys, Links } from '@constants';
import Assets from '@api/assets';

import { Forms, Navigation } from '@metro/components';
import AssetBrowser from './assets';
import Logs from './logger';

export default function () {
	const navigation = Navigation.useNavigation();
	const settings = useSettingsStore('unbound');

	const Icons = {
		Debug: Assets.getIDByName('debug'),
		Sparkle: Assets.getIDByName('ic_sparkle3')
	};

	return <ReactNative.ScrollView>
        <Forms.FormSection title={i18n.Messages.UNBOUND_DEBUG_BRIDGE} titleStyleType='no_border_or_margin'>
            <Forms.FormRow
                label={i18n.Messages.UNBOUND_ENABLED}
                subLabel={i18n.Messages.UNBOUND_DEBUG_BRIDGE_DESC}
                trailing={<Forms.FormSwitch
                    value={settings.get('dev.debugBridge.enabled', false)}
                    onValueChange={() => settings.toggle('dev.debugBridge.enabled', false)}
                />}
            />
            {settings.get('dev.debugBridge.enabled', false) && <>
                <Forms.FormDivider />
                <Forms.FormInput
                    value={settings.get('dev.debugBridge.host', '192.168.0.35:9090')}
                    onChange={v => settings.set('dev.debugBridge.host', v)}
                    title={i18n.Messages.UNBOUND_DEBUG_BRIDGE_IP}
                />
            </>}
        </Forms.FormSection>
        <Forms.FormSection title={i18n.Messages.UNBOUND_LOADER}>
            <Forms.FormRow
                label={i18n.Messages.UNBOUND_ENABLED}
                subLabel={i18n.Messages.UNBOUND_LOADER_ENABLED_DESC}
                trailing={<Forms.FormSwitch
                    value={settings.get('loader.enabled', true)}
                    onValueChange={() => settings.toggle('loader.enabled', true)}
                />}
            />
            <Forms.FormDivider />
            <Forms.FormRow
                label={i18n.Messages.UNBOUND_LOADER_DEVTOOLS}
                subLabel={i18n.Messages.UNBOUND_LOADER_DEVTOOLS_DESC}
                trailing={<Forms.FormSwitch
                    value={settings.get('loader.devtools', false)}
                    onValueChange={() => settings.toggle('loader.devtools', false)}
                />}
            />
            <Forms.FormDivider />
            <Forms.FormRow
                label={i18n.Messages.UNBOUND_LOADER_UPDATER_FORCE}
                subLabel={i18n.Messages.UNBOUND_LOADER_UPDATER_FORCE_DESC}
                trailing={<Forms.FormSwitch
                    value={settings.get('loader.update.force', false)}
                    onValueChange={() => settings.toggle('loader.update.force', false)}
                />}
            />
            <Forms.FormDivider />
            <Forms.FormInput
                value={settings.get('loader.update.url', Links.Bundle)}
                onChange={v => settings.set('loader.update.url', v)}
                title={i18n.Messages.UNBOUND_LOADER_CUSTOM_BUNDLE}
            />
        </Forms.FormSection>
        <Forms.FormSection title={i18n.Messages.UNBOUND_MISC}>
            <Forms.FormRow
                label={i18n.Messages.UNBOUND_ERROR_BOUNDARY}
                subLabel={i18n.Messages.UNBOUND_ERROR_BOUNDARY_DESC}
                trailing={<Forms.FormSwitch
                    value={settings.get('dev.errorBoundary', true)}
                    onValueChange={() => settings.toggle('dev.errorBoundary', true)}
                />}
            />
            <Forms.FormRow
                label={i18n.Messages.UNBOUND_ERROR_BOUNDARY_TRIGGER_TITLE}
                subLabel={i18n.Messages.UNBOUND_ERROR_BOUNDARY_TRIGGER_DESC}
                trailing={<Forms.FormArrow />}
                onPress={() => navigation.push(Keys.Custom, {
                    title: null,
                    
                    // @ts-expect-error -- purposefully trip the boundary by rendering undefined
                    render: () => <undefined />
                })}
            />
            <Forms.FormDivider />
            <Forms.FormRow
                label={i18n.Messages.UNBOUND_ASSET_BROWSER}
                leading={<Forms.FormRow.Icon source={Icons.Sparkle} />}
                trailing={Forms.FormRow.Arrow}
                onPress={() => navigation.push(Keys.Custom, {
                    title: i18n.Messages.UNBOUND_ASSET_BROWSER,
                    render: AssetBrowser
                })}
            />
            <Forms.FormDivider />
            <Forms.FormRow
                label={i18n.Messages.UNBOUND_DEBUG_LOGS}
                leading={<Forms.FormRow.Icon source={Icons.Debug} />}
                trailing={Forms.FormRow.Arrow}
                onPress={() => navigation.push(Keys.Custom, {
                    title: i18n.Messages.UNBOUND_DEBUG_LOGS,
                    render: Logs
                })}
            />
        </Forms.FormSection>
        <ReactNative.View style={{ marginBottom: 50 }} />
	</ReactNative.ScrollView>;
}