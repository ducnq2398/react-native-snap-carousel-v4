// Parallax effect inspired by https://github.com/oblador/react-native-parallax/

import React, { Component } from 'react';
import {
  View,
  Animated,
  Easing,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import styles from './ParallaxImage.style';
import type { ParallaxImageProps } from '../types';

interface ParallaxImageState {
  offset: number;
  width: number;
  height: number;
  status: 1 | 2 | 3 | 4; // 1 -> loading; 2 -> loaded; 3 -> transition finished; 4 -> error
  animOpacity: Animated.Value;
}

export default class ParallaxImage extends Component<
  ParallaxImageProps,
  ParallaxImageState
> {
  static defaultProps: Partial<ParallaxImageProps> = {
    containerStyle: {},
    fadeDuration: 500,
    parallaxFactor: 0.3,
    showSpinner: true,
    spinnerColor: 'rgba(0, 0, 0, 0.4)',
    AnimatedImageComponent: Animated.Image,
  };

  private _container: View | null = null;
  private _mounted: boolean = false;

  constructor(props: ParallaxImageProps) {
    super(props);
    this.state = {
      offset: 0,
      width: 0,
      height: 0,
      status: 1,
      animOpacity: new Animated.Value(0),
    };
    this._onLoad = this._onLoad.bind(this);
    this._onError = this._onError.bind(this);
    this._measureLayout = this._measureLayout.bind(this);
  }

  setNativeProps(nativeProps: Record<string, unknown>): void {
    if (this._container) {
      (this._container as unknown as { setNativeProps: (props: Record<string, unknown>) => void }).setNativeProps(nativeProps);
    }
  }

  componentDidMount(): void {
    this._mounted = true;

    setTimeout(() => {
      this._measureLayout();
    }, 0);
  }

  componentWillUnmount(): void {
    this._mounted = false;
  }

  private _measureLayout(): void {
    if (this._container) {
      const {
        dimensions,
        vertical,
        carouselRef,
        sliderWidth,
        sliderHeight,
        itemWidth,
        itemHeight,
      } = this.props;

      if (carouselRef) {
        // Use measure instead of deprecated measureLayout with findNodeHandle
        (this._container as unknown as { 
          measure: (callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void) => void 
        }).measure(
          (x: number, y: number, width: number, height: number) => {
            const offset = vertical
              ? y - ((sliderHeight! - itemHeight!) / 2)
              : x - ((sliderWidth! - itemWidth!) / 2);

            this.setState({
              offset: offset,
              width:
                dimensions?.width
                  ? dimensions.width
                  : Math.ceil(width),
              height:
                dimensions?.height
                  ? dimensions.height
                  : Math.ceil(height),
            });
          }
        );
      }
    }
  }

  private _onLoad(event: unknown): void {
    const { animOpacity } = this.state;
    const { fadeDuration, onLoad } = this.props;

    if (!this._mounted) {
      return;
    }

    this.setState({ status: 2 });

    if (onLoad) {
      (onLoad as (event: unknown) => void)(event);
    }

    Animated.timing(animOpacity, {
      toValue: 1,
      duration: fadeDuration,
      easing: Easing.out(Easing.quad),
      isInteraction: false,
      useNativeDriver: true,
    }).start(() => {
      this.setState({ status: 3 });
    });
  }

  private _onError(event: unknown): void {
    const { onError } = this.props;

    this.setState({ status: 4 });

    if (onError) {
      (onError as (event: unknown) => void)(event);
    }
  }

  get image(): React.ReactElement {
    const { status, animOpacity, offset, width, height } = this.state;
    const {
      scrollPosition,
      dimensions: _dimensions,
      vertical,
      sliderWidth,
      sliderHeight,
      parallaxFactor,
      style,
      AnimatedImageComponent,
      // Filter out props that shouldn't be passed to image
      carouselRef: _carouselRef,
      itemHeight: _itemHeight,
      itemWidth: _itemWidth,
      containerStyle: _containerStyle,
      fadeDuration: _fadeDuration,
      showSpinner: _showSpinner,
      spinnerColor: _spinnerColor,
      ...other
    } = this.props;

    const parallaxPadding = (vertical ? height : width) * parallaxFactor!;
    const requiredStyles = { position: 'relative' as const };
    const dynamicStyles = {
      width: vertical ? width : width + parallaxPadding * 2,
      height: vertical ? height + parallaxPadding * 2 : height,
      opacity: animOpacity,
      transform: scrollPosition
        ? [
            {
              translateX: !vertical
                ? scrollPosition.interpolate({
                    inputRange: [offset - sliderWidth!, offset + sliderWidth!],
                    outputRange: [-parallaxPadding, parallaxPadding],
                    extrapolate: 'clamp',
                  })
                : 0,
            },
            {
              translateY: vertical
                ? scrollPosition.interpolate({
                    inputRange: [
                      offset - sliderHeight!,
                      offset + sliderHeight!,
                    ],
                    outputRange: [-parallaxPadding, parallaxPadding],
                    extrapolate: 'clamp',
                  })
                : 0,
            },
          ]
        : [],
    };

    const ImageComponent = AnimatedImageComponent || Animated.Image;

    return (
      <ImageComponent
        {...other}
        style={
          [
            styles.image,
            style,
            requiredStyles,
            dynamicStyles,
          ] as StyleProp<ImageStyle>
        }
        onLoad={this._onLoad}
        onError={status !== 3 ? this._onError : undefined}
      />
    );
  }

  get spinner(): React.ReactElement | null {
    const { status } = this.state;
    const { showSpinner, spinnerColor } = this.props;

    return status === 1 && showSpinner ? (
      <View style={styles.loaderContainer}>
        <ActivityIndicator
          size={'small'}
          color={spinnerColor}
          animating={true}
        />
      </View>
    ) : null;
  }

  render(): React.ReactElement {
    const { containerStyle } = this.props;

    return (
      <View
        ref={(c) => {
          this._container = c;
        }}
        pointerEvents={'none'}
        style={[containerStyle, styles.container] as StyleProp<ViewStyle>}
        onLayout={this._measureLayout}
      >
        {this.image}
        {this.spinner}
      </View>
    );
  }
}
