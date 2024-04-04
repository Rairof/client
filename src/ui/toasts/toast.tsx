import { React, Reanimated, Gestures, ReactNative as RN } from '@metro/common';
import { unitToHex, withoutOpacity } from '@utilities';
import { TintedIcon } from '@ui/components/misc';
import { useSettingsStore } from '@api/storage';
import { Redesign } from '@metro/components';
import useToastState from './useToastState';
import { fastFindByProps } from '@metro';
import useStyles from './toast.style';
import { Icons } from '@api/assets';
import Toasts from '@stores/toasts';

import type { ToastOptions } from '@typings/api/toasts';
import type {
	GestureEvent,
	HandlerStateChangeEvent,
	PanGestureHandlerEventPayload
} from 'react-native-gesture-handler';

const { BackgroundBlurFill } = fastFindByProps('BackgroundBlurFill', { lazy: true });
const { withSpring, withTiming, useSharedValue, default: { View } } = Reanimated;
const { PanGestureHandler, State } = Gestures;

function Toast(options: ToastOptions) {
	const { style, properties: { scale, opacity, height, width }, leave } = useToastState(options);
	const settings = useSettingsStore('unbound');
	const styles = useStyles();
	const translateY = useSharedValue(0);

	// Default for if there is no content at all
	const [linesLength, setLinesLength] = React.useState(1);

	const onGestureEvent = (event: GestureEvent<PanGestureHandlerEventPayload>) => {
		if (event.nativeEvent.translationY > 0) return;

		opacity.value = 1 - ((event.nativeEvent.translationY * -1) / 30);
		scale.value = 1 - ((event.nativeEvent.translationY * -1) / 500);
		translateY.value = event.nativeEvent.translationY;
	};

	const onHandlerStateChange = (event: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
		if (event.nativeEvent.oldState !== State.ACTIVE) return;

		if (event.nativeEvent.translationY < -30) {
			leave();
		} else {
			scale.value = withTiming(1);
			opacity.value = withTiming(1);
			translateY.value = withTiming(0);
		}
	};

	return <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
		<View key={options.id} style={{ ...style, transform: [{ scale }, { translateY }] }} pointerEvents='box-none'>
			<RN.View style={styles.border}>
				<RN.View
					style={[styles.container, { backgroundColor: withoutOpacity(styles.container.backgroundColor) + unitToHex(settings.get('toasts.opacity', 0.8)) }]}
					onLayout={({ nativeEvent }) => height.value = settings.get('toasts.animations', true) ?
						withSpring(nativeEvent.layout.height) :
						nativeEvent.layout.height
					}
				>
					<BackgroundBlurFill blurAmount={settings.get('toasts.blur', 0.15)} />
					<RN.View style={styles.wrapper}>
						{options.icon && <RN.View style={[styles.icon, { marginVertical: linesLength * 10 }]}>
							{(options.tintedIcon ?? true) ? (
								<TintedIcon
									source={typeof options.icon === 'string' ? Icons[options.icon] : options.icon}
								/>
							) : (
								<RN.Image
									source={typeof options.icon === 'string' ? Icons[options.icon] : options.icon}
									style={{
										width: 24,
										aspectRatio: 1
									}}
								/>
							)}
						</RN.View>}
						<RN.View style={styles.contentContainer}>
							{options.title && <RN.Text style={styles.title}>
								{typeof options.title === 'function' ? React.createElement(options.title) : options.title}
							</RN.Text>}
							{options.content && <RN.Text
								style={styles.content}
								onTextLayout={({ nativeEvent: { lines: { length } } }) => {
									setLinesLength(length > 2 ? length + 1 : length);
								}}
							>
								{typeof options.content === 'function' ? React.createElement(options.content) : options.content}
							</RN.Text>}
						</RN.View>
						<RN.Pressable
							style={[styles.icon, { marginRight: 12, marginVertical: linesLength * 10 }]}
							hitSlop={10}
							onPress={leave}
							onLongPress={() => {
								RN.LayoutAnimation.configureNext({
									duration: 1000,
									delete: {
										type: 'easeInEaseOut',
										property: 'opacity',
										duration: 300
									}
								});

								Toasts.store.setState(() => ({ toasts: [] }));
							}}
						>
							<TintedIcon source={Icons['ic_close']} />
						</RN.Pressable>
					</RN.View>
					{Array.isArray(options.buttons) && options.buttons.length > 0 && (
						<RN.View style={[styles.buttons, { marginTop: 0 }]}>
							{options.buttons.map((button, index) => <Redesign.Button
								key={`${options.id}-button-${index}`}
								style={styles.button}
								variant={button.variant || 'primary'}
								size={button.size || 'sm'}
								onPress={button.onPress}
								iconPosition={button.iconPosition || 'start'}
								icon={button.icon || undefined}
								text={button.content}
							/>)}
						</RN.View>
					)}
					{(options.duration ?? settings.get('toasts.duration', 0)) > 0 && settings.get('toasts.animations', true) && <View
						style={[
							{
								position: 'absolute',
								bottom: 0,
								left: 0,
								width,
								height: 3,
								borderRadius: 100000
							},
							styles.bar
						]}
					/>}
				</RN.View>
			</RN.View>
		</View>
	</PanGestureHandler>;
}

export default Toast;