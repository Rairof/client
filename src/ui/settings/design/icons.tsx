import { showInstallAlert } from '@ui/components/internal/install-modal';
import { React, ReactNative as RN } from '@metro/common';
import { Addons } from '@ui/components/internal';
import { Icons as IconProxy } from '@api/assets';
import { TintedIcon } from '@ui/components/misc';
import Icons from '@managers/icons';

function IconsPage() {
	const addons = Icons.useEntities();

	return <RN.View style={{ flex: 1 }}>
		<Addons
			showHeaderRight={false}
			type='Icons'
			addons={addons}
		/>
	</RN.View>;
}

export const callback = ({ type, ref }) => showInstallAlert({ type, ref });
export default {
	renderPage: () => <IconsPage />,
	callback,
	renderIcon: () => <TintedIcon source={IconProxy[Icons.icon]} />
};