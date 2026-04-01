import React, { PureComponent } from 'react';
import {
  Animated,
  Easing,
  TouchableOpacity,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import styles from './Pagination.style';
import type { PaginationDotProps, CarouselRef } from '../types';

interface PaginationDotState {
  animColor: Animated.Value;
  animOpacity: Animated.Value;
  animTransform: Animated.Value;
}

export default class PaginationDot extends PureComponent<
  PaginationDotProps,
  PaginationDotState
> {
  constructor(props: PaginationDotProps) {
    super(props);
    this.state = {
      animColor: new Animated.Value(0),
      animOpacity: new Animated.Value(0),
      animTransform: new Animated.Value(0),
    };
  }

  componentDidMount(): void {
    if (this.props.active) {
      this._animate(1);
    }
  }

  componentDidUpdate(prevProps: PaginationDotProps): void {
    if (prevProps.active !== this.props.active) {
      this._animate(this.props.active ? 1 : 0);
    }
  }

  private _animate(toValue: number = 0): void {
    const { animColor, animOpacity, animTransform } = this.state;
    const { animatedDuration = 250, animatedFriction = 4, animatedTension = 50 } = this.props;

    const commonProperties = {
      toValue,
      duration: animatedDuration,
      isInteraction: false,
      useNativeDriver: !this._shouldAnimateColor,
    };

    const animations: Animated.CompositeAnimation[] = [
      Animated.timing(animOpacity, {
        easing: Easing.linear,
        ...commonProperties,
      }),
      Animated.spring(animTransform, {
        friction: animatedFriction,
        tension: animatedTension,
        ...commonProperties,
      }),
    ];

    if (this._shouldAnimateColor) {
      animations.push(
        Animated.timing(animColor, {
          easing: Easing.linear,
          ...commonProperties,
        })
      );
    }

    Animated.parallel(animations).start();
  }

  private get _shouldAnimateColor(): boolean {
    const { color, inactiveColor } = this.props;
    return !!color && !!inactiveColor;
  }

  render(): React.ReactElement {
    const { animColor, animOpacity, animTransform } = this.state;
    const {
      active,
      activeOpacity,
      carouselRef,
      color,
      containerStyle,
      inactiveColor,
      inactiveStyle,
      inactiveOpacity,
      inactiveScale,
      index,
      style,
      tappable,
      delayPressInDot = 0,
    } = this.props;

    const animatedStyle = {
      opacity: animOpacity.interpolate({
        inputRange: [0, 1],
        outputRange: [inactiveOpacity, 1],
      }),
      transform: [
        {
          scale: animTransform.interpolate({
            inputRange: [0, 1],
            outputRange: [inactiveScale, 1],
          }),
        },
      ],
    };

    const animatedColor = this._shouldAnimateColor
      ? {
          backgroundColor: animColor.interpolate({
            inputRange: [0, 1],
            outputRange: [inactiveColor!, color!],
          }),
        }
      : {};

    const dotContainerStyle: StyleProp<ViewStyle>[] = [
      styles.sliderPaginationDotContainer,
      containerStyle || {},
    ];

    const dotStyle: (StyleProp<ViewStyle> | Record<string, unknown>)[] = [
      styles.sliderPaginationDot,
      style || {},
      (!active && inactiveStyle) || {},
      animatedStyle,
      animatedColor,
    ];

    const onPress = tappable
      ? () => {
          try {
            const ref = carouselRef as
              | React.RefObject<CarouselRef>
              | CarouselRef
              | undefined;
            if (!ref) return;
            const currentRef =
              'current' in ref ? (ref.current as CarouselRef) : (ref as CarouselRef);
            if (currentRef && typeof (currentRef as unknown as Record<string, unknown>)._snapToItem === 'function') {
              const carouselInstance = currentRef as unknown as {
                _snapToItem: (index: number) => void;
                _getPositionIndex: (index: number) => number;
              };
              carouselInstance._snapToItem(
                carouselInstance._getPositionIndex(index ?? 0)
              );
            } else if (currentRef?.snapToItem) {
              currentRef.snapToItem(index ?? 0);
            }
          } catch (error) {
            console.warn(
              'react-native-snap-carousel | Pagination: ' +
                '`carouselRef` has to be a Carousel ref.\n' +
                error
            );
          }
        }
      : undefined;

    return (
      <TouchableOpacity
        accessible={false}
        style={dotContainerStyle}
        activeOpacity={tappable ? activeOpacity : 1}
        onPress={onPress}
        delayPressIn={delayPressInDot}
      >
        <Animated.View style={dotStyle as Animated.WithAnimatedValue<StyleProp<ViewStyle>>} />
      </TouchableOpacity>
    );
  }
}
