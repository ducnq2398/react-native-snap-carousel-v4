import React, { PureComponent } from 'react';
import { I18nManager, Platform, View } from 'react-native';
import PaginationDot from './PaginationDot';
import styles from './Pagination.style';
import type { PaginationProps } from '../types';

const IS_IOS = Platform.OS === 'ios';
const IS_RTL = I18nManager.isRTL;

export default class Pagination extends PureComponent<PaginationProps> {
  static defaultProps: Partial<PaginationProps> = {
    inactiveDotOpacity: 0.5,
    inactiveDotScale: 0.5,
    tappableDots: false,
    vertical: false,
    animatedDuration: 250,
    animatedFriction: 4,
    animatedTension: 50,
    delayPressInDot: 0,
  };

  constructor(props: PaginationProps) {
    super(props);

    // Warnings
    if (
      (props.dotColor && !props.inactiveDotColor) ||
      (!props.dotColor && props.inactiveDotColor)
    ) {
      console.warn(
        'react-native-snap-carousel | Pagination: ' +
          'You need to specify both `dotColor` and `inactiveDotColor`'
      );
    }
    if (
      (props.dotElement && !props.inactiveDotElement) ||
      (!props.dotElement && props.inactiveDotElement)
    ) {
      console.warn(
        'react-native-snap-carousel | Pagination: ' +
          'You need to specify both `dotElement` and `inactiveDotElement`'
      );
    }
    if (props.tappableDots && props.carouselRef === undefined) {
      console.warn(
        'react-native-snap-carousel | Pagination: ' +
          'You must specify prop `carouselRef` when setting `tappableDots` to `true`'
      );
    }
  }

  private _needsRTLAdaptations(): boolean {
    const { vertical } = this.props;
    return IS_RTL && !IS_IOS && !vertical;
  }

  private get _activeDotIndex(): number {
    const { activeDotIndex, dotsLength } = this.props;
    return this._needsRTLAdaptations()
      ? dotsLength - activeDotIndex - 1
      : activeDotIndex;
  }

  get dots(): React.ReactElement[] | React.ReactElement | null {
    const {
      activeOpacity,
      carouselRef,
      dotsLength,
      dotColor,
      dotContainerStyle,
      dotElement,
      dotStyle,
      inactiveDotColor,
      inactiveDotElement,
      inactiveDotOpacity,
      inactiveDotScale,
      inactiveDotStyle,
      renderDots,
      tappableDots,
      animatedDuration,
      animatedFriction,
      animatedTension,
      delayPressInDot,
    } = this.props;

    if (renderDots) {
      return renderDots(
        this._activeDotIndex,
        dotsLength,
        this
      ) as React.ReactElement[];
    }

    const DefaultDot = (
      <PaginationDot
        carouselRef={carouselRef}
        tappable={tappableDots && typeof carouselRef !== 'undefined'}
        activeOpacity={activeOpacity}
        color={dotColor}
        containerStyle={dotContainerStyle}
        style={dotStyle}
        inactiveColor={inactiveDotColor}
        inactiveOpacity={inactiveDotOpacity!}
        inactiveScale={inactiveDotScale!}
        inactiveStyle={inactiveDotStyle}
        animatedDuration={animatedDuration}
        animatedFriction={animatedFriction}
        animatedTension={animatedTension}
        delayPressInDot={delayPressInDot}
      />
    );

    const dots = [...Array(dotsLength).keys()].map((i) => {
      const isActive = i === this._activeDotIndex;

      return React.cloneElement(
        (isActive ? dotElement : inactiveDotElement) || DefaultDot,
        {
          key: `pagination-dot-${i}`,
          active: isActive,
          index: i,
        }
      );
    });

    return dots;
  }

  render(): React.ReactElement | null {
    const { dotsLength, containerStyle, vertical, accessibilityLabel } =
      this.props;

    if (!dotsLength || dotsLength < 2) {
      return null;
    }

    const style = [
      styles.sliderPagination,
      {
        flexDirection: vertical
          ? ('column' as const)
          : this._needsRTLAdaptations()
          ? ('row-reverse' as const)
          : ('row' as const),
      },
      containerStyle || {},
    ];

    return (
      <View
        pointerEvents={'box-none'}
        style={style}
        accessible={!!accessibilityLabel}
        accessibilityLabel={accessibilityLabel}
      >
        {this.dots}
      </View>
    );
  }
}
