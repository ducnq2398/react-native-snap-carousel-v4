import { ComponentType } from 'react';
import {
  Animated,
  FlatListProps,
  ImageProps,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

// ============================================================================
// Animation Types
// ============================================================================

export type CarouselLayout = 'default' | 'stack' | 'tinder';

export type ActiveSlideAlignment = 'start' | 'center' | 'end';

export type ActiveAnimationType = 'decay' | 'spring' | 'timing';

export interface ScrollInterpolatorResult {
  inputRange: number[];
  outputRange: number[];
}

export type ScrollInterpolatorFunction = (
  index: number,
  carouselProps: CarouselInternalProps
) => ScrollInterpolatorResult;

export type SlideInterpolatedStyleFunction = (
  index: number,
  animatedValue: Animated.AnimatedInterpolation<number>,
  carouselProps: CarouselInternalProps
) => Record<string, unknown>;

// ============================================================================
// Carousel Props (used internally by animation utils)
// ============================================================================

export interface CarouselInternalProps {
  vertical?: boolean;
  itemWidth?: number;
  itemHeight?: number;
  sliderWidth?: number;
  sliderHeight?: number;
  inactiveSlideOpacity: number;
  inactiveSlideScale: number;
  inactiveSlideShift: number;
  data: unknown[];
}

// ============================================================================
// Carousel Component Props
// ============================================================================

export interface CarouselRenderItemInfo<T> {
  item: T;
  index: number;
}

export interface ParallaxProps {
  scrollPosition: Animated.Value;
  carouselRef: unknown;
  vertical?: boolean;
  sliderWidth?: number;
  sliderHeight?: number;
  itemWidth?: number;
  itemHeight?: number;
}

export type CarouselRenderItem<T> = (
  info: CarouselRenderItemInfo<T>,
  parallaxProps?: ParallaxProps
) => React.ReactElement | null;

export interface ActiveAnimationOptions {
  toValue?: number;
  duration?: number;
  delay?: number;
  isInteraction?: boolean;
  useNativeDriver?: boolean;
  [key: string]: unknown;
}

export interface CarouselProps<T> extends Partial<FlatListProps<T>> {
  // Required
  data: T[];
  renderItem: CarouselRenderItem<T>;

  // Required for horizontal
  itemWidth?: number;
  sliderWidth?: number;

  // Required for vertical
  itemHeight?: number;
  sliderHeight?: number;

  // Behavior
  activeSlideOffset?: number;
  apparitionDelay?: number;
  callbackOffsetMargin?: number;
  enableMomentum?: boolean;
  enableSnap?: boolean;
  firstItem?: number;
  hasParallaxImages?: boolean;
  lockScrollTimeoutDuration?: number;
  lockScrollWhileSnapping?: boolean;
  scrollEnabled?: boolean;
  shouldOptimizeUpdates?: boolean;
  swipeThreshold?: number;
  useScrollView?: boolean | ComponentType<ScrollViewProps>;
  vertical?: boolean;

  // Loop
  loop?: boolean;
  loopClonesPerSide?: number;

  // Autoplay
  autoplay?: boolean;
  autoplayDelay?: number;
  autoplayInterval?: number;

  // Style and animation
  activeAnimationType?: ActiveAnimationType;
  activeAnimationOptions?: ActiveAnimationOptions | null;
  activeSlideAlignment?: ActiveSlideAlignment;
  containerCustomStyle?: StyleProp<ViewStyle>;
  contentContainerCustomStyle?: StyleProp<ViewStyle>;
  inactiveSlideOpacity?: number;
  inactiveSlideScale?: number;
  inactiveSlideShift?: number;
  layout?: CarouselLayout;
  layoutCardOffset?: number;
  scrollInterpolator?: ScrollInterpolatorFunction;
  slideInterpolatedStyle?: SlideInterpolatedStyleFunction;
  slideStyle?: StyleProp<ViewStyle>;

  // Callbacks
  onLayout?: (event: NativeSyntheticEvent<unknown>) => void;
  onScroll?: ((event: NativeSyntheticEvent<NativeScrollEvent>) => void) & {
    _argMapping?: unknown[];
  };
  onBeforeSnapToItem?: (slideIndex: number) => void;
  onSnapToItem?: (slideIndex: number) => void;
  onScrollBeginDrag?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onScrollEndDrag?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onMomentumScrollEnd?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
}

// ============================================================================
// Carousel Ref Methods
// ============================================================================

export interface CarouselRef {
  snapToItem(index: number, animated?: boolean, fireCallback?: boolean): void;
  snapToNext(animated?: boolean, fireCallback?: boolean): void;
  snapToPrev(animated?: boolean, fireCallback?: boolean): void;
  startAutoplay(instantly?: boolean): void;
  stopAutoplay(): void;
  triggerRenderingHack(offset?: number): void;
  currentIndex: number;
  currentScrollPosition: number;
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginationProps {
  // Required
  activeDotIndex: number;
  dotsLength: number;

  // Optional
  activeOpacity?: number;
  carouselRef?: CarouselRef | React.RefObject<CarouselRef>;
  containerStyle?: StyleProp<ViewStyle>;
  dotColor?: string;
  dotContainerStyle?: StyleProp<ViewStyle>;
  dotElement?: React.ReactElement;
  dotStyle?: StyleProp<ViewStyle>;
  inactiveDotColor?: string;
  inactiveDotElement?: React.ReactElement;
  inactiveDotOpacity?: number;
  inactiveDotScale?: number;
  inactiveDotStyle?: StyleProp<ViewStyle>;
  renderDots?: (
    activeIndex: number,
    dotsLength: number,
    paginationRef: unknown
  ) => React.ReactElement | React.ReactElement[];
  tappableDots?: boolean;
  vertical?: boolean;
  accessibilityLabel?: string;
  animatedDuration?: number;
  animatedFriction?: number;
  animatedTension?: number;
  delayPressInDot?: number;
}

// ============================================================================
// PaginationDot Types
// ============================================================================

export interface PaginationDotProps {
  inactiveOpacity: number;
  inactiveScale: number;
  active?: boolean;
  activeOpacity?: number;
  carouselRef?: CarouselRef | React.RefObject<CarouselRef>;
  color?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inactiveColor?: string;
  inactiveStyle?: StyleProp<ViewStyle>;
  index?: number;
  style?: StyleProp<ViewStyle>;
  tappable?: boolean;
  animatedDuration?: number;
  animatedFriction?: number;
  animatedTension?: number;
  delayPressInDot?: number;
}

// ============================================================================
// ParallaxImage Types
// ============================================================================

export interface ParallaxImageDimensions {
  width: number;
  height: number;
}

export interface ParallaxImageProps extends Omit<ImageProps, 'source'> {
  source: ImageSourcePropType;

  // Passed from Carousel
  carouselRef?: unknown;
  itemHeight?: number;
  itemWidth?: number;
  scrollPosition?: Animated.Value;
  sliderHeight?: number;
  sliderWidth?: number;
  vertical?: boolean;

  // Own props
  containerStyle?: StyleProp<ViewStyle>;
  dimensions?: ParallaxImageDimensions;
  fadeDuration?: number;
  parallaxFactor?: number;
  showSpinner?: boolean;
  spinnerColor?: string;
  AnimatedImageComponent?: React.ComponentType<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}
