import { ReactNative as RN, StyleSheet, Theme } from '@metro/common';
import { Redesign } from '@metro/components';
import { Icons } from '@api/assets';
import type { ImageResolvedAssetSource } from 'react-native';

interface OverflowItem {
	label: string;
	IconComponent?: React.ComponentType;
	iconSource?: number;
	action: () => any;
}

interface OverflowProps {
	items: OverflowItem[],
	iconSource?: number;
	scale?: number;
}

const useStyles = StyleSheet.createStyles({
	icon: {
		aspectRatio: 1,
		marginLeft: 8,
		marginRight: 10,
		tintColor: Theme.colors.INTERACTIVE_NORMAL
	}
});

export default function Overflow({ items, iconSource = Icons['MoreHorizontalIcon'], scale = 1 }: OverflowProps) {
	const styles = useStyles();

	return <Redesign.ContextMenu items={items}>
		{(props, onPress, accessibilityState, accessibilityActions, onAccessibilityAction) => (
			<RN.TouchableOpacity
				{...props}
				onPress={onPress}
				accessibilityState={accessibilityState}
				accessibilityActions={accessibilityActions}
				onAccessibilityAction={onAccessibilityAction}
			>
				<RN.Image
					source={iconSource}
					style={[styles.icon, { transform: [{ scale }]}]}
				/>
			</RN.TouchableOpacity>
		)}
	</Redesign.ContextMenu>;
};