import React, { Component } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  I18nManager,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import {
  defaultScrollInterpolator,
  stackScrollInterpolator,
  tinderScrollInterpolator,
  defaultAnimatedStyles,
  shiftAnimatedStyles,
  stackAnimatedStyles,
  tinderAnimatedStyles,
} from '../utils/animations';
import type {
  CarouselProps,
  CarouselRef,
  CarouselInternalProps,
  ParallaxProps,
} from '../types';

const IS_IOS = Platform.OS === 'ios';

// Native driver for scroll events
const AnimatedFlatList = FlatList
  ? Animated.createAnimatedComponent(FlatList)
  : null;
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

// React Native automatically handles RTL layouts; unfortunately, it's buggy with horizontal ScrollView
const IS_RTL = I18nManager.isRTL;

interface Position {
  start: number;
  end: number;
}

interface CarouselState {
  hideCarousel: boolean;
  interpolators: (Animated.Value | Animated.AnimatedInterpolation<number>)[];
}

/**
 * Shallow comparison utility to replace deprecated react-addons-shallow-compare
 */
function shallowCompare<P, S>(
  instance: Component<P, S>,
  nextProps: P,
  nextState: S
): boolean {
  const currentProps = instance.props as Record<string, unknown>;
  const currentState = instance.state as Record<string, unknown>;
  const nProps = nextProps as Record<string, unknown>;
  const nState = nextState as Record<string, unknown>;

  // Check props
  const propKeys = Object.keys(nProps);
  const currentPropKeys = Object.keys(currentProps);
  if (propKeys.length !== currentPropKeys.length) return true;
  for (const key of propKeys) {
    if (currentProps[key] !== nProps[key]) return true;
  }

  // Check state
  const stateKeys = Object.keys(nState);
  const currentStateKeys = Object.keys(currentState);
  if (stateKeys.length !== currentStateKeys.length) return true;
  for (const key of stateKeys) {
    if (currentState[key] !== nState[key]) return true;
  }

  return false;
}

export default class Carousel<T = unknown> extends Component<
  CarouselProps<T>,
  CarouselState
> {
  static defaultProps: Partial<CarouselProps<unknown>> = {
    activeAnimationType: 'timing',
    activeAnimationOptions: null,
    activeSlideAlignment: 'center',
    activeSlideOffset: 20,
    apparitionDelay: 0,
    autoplay: false,
    autoplayDelay: 1000,
    autoplayInterval: 3000,
    callbackOffsetMargin: 5,
    containerCustomStyle: {},
    contentContainerCustomStyle: {},
    enableMomentum: false,
    enableSnap: true,
    firstItem: 0,
    hasParallaxImages: false,
    inactiveSlideOpacity: 0.7,
    inactiveSlideScale: 0.9,
    inactiveSlideShift: 0,
    layout: 'default',
    lockScrollTimeoutDuration: 1000,
    lockScrollWhileSnapping: false,
    loop: false,
    loopClonesPerSide: 3,
    scrollEnabled: true,
    slideStyle: {},
    shouldOptimizeUpdates: true,
    swipeThreshold: 20,
    useScrollView: !AnimatedFlatList,
    vertical: false,
  };

  // Instance variables
  private _activeItem: number;
  private _previousActiveItem: number;
  private _previousFirstItem: number;
  private _previousItemsLength: number;
  private _mounted: boolean;
  private _positions: Position[];
  private _currentContentOffset: number;
  private _canFireBeforeCallback: boolean;
  private _canFireCallback: boolean;
  private _scrollOffsetRef: number | null;
  private _onScrollTriggered: boolean;
  private _lastScrollDate: number;
  private _scrollEnabled: boolean;
  private _scrollPos: Animated.Value;
  private _onScrollHandler: (...args: unknown[]) => void;
  private _carouselRef: unknown;
  private _ignoreNextMomentum: boolean;
  private _autoplaying: boolean;
  private _autoplay: boolean;
  private _autoplayInterval: ReturnType<typeof setInterval> | null;
  private _itemToSnapTo: number;
  private _scrollStartOffset: number;
  private _scrollStartActive: number;
  private _scrollEndOffset: number;
  private _scrollEndActive: number;
  private _onLayoutInitDone: boolean;

  // Timeout refs
  private _apparitionTimeout: ReturnType<typeof setTimeout> | null;
  private _hackSlideAnimationTimeout: ReturnType<typeof setTimeout> | null;
  private _enableAutoplayTimeout: ReturnType<typeof setTimeout> | null;
  private _autoplayTimeout: ReturnType<typeof setTimeout> | null;
  private _snapNoMomentumTimeout: ReturnType<typeof setTimeout> | null;
  private _edgeItemTimeout: ReturnType<typeof setTimeout> | null;
  private _lockScrollTimeout: ReturnType<typeof setTimeout> | null;

  // Bound handlers
  private _renderItemBound: (info: { item: T; index: number }) => React.ReactElement | null;
  private _onSnapBound: (index: number) => void;
  private _onLayoutBound: (event: LayoutChangeEvent) => void;
  private _onScrollBound: (event?: NativeSyntheticEvent<NativeScrollEvent>) => void;
  private _onScrollBeginDragBound?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  private _onScrollEndBound?: () => void;
  private _onScrollEndDragBound?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  private _onMomentumScrollEndBound?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  private _onTouchStartBound: () => void;
  private _onTouchEndBound: () => void;
  private _onTouchReleaseBound: () => void;
  private _getKeyExtractorBound: (item: T, index: number) => string;

  constructor(props: CarouselProps<T>) {
    super(props);

    this.state = {
      hideCarousel: true,
      interpolators: [],
    };

    const initialActiveItem = this._getFirstItem(props.firstItem!);
    this._activeItem = initialActiveItem;
    this._previousActiveItem = initialActiveItem;
    this._previousFirstItem = initialActiveItem;
    this._previousItemsLength = initialActiveItem;

    this._mounted = false;
    this._positions = [];
    this._currentContentOffset = 0;
    this._canFireBeforeCallback = false;
    this._canFireCallback = false;
    this._scrollOffsetRef = null;
    this._onScrollTriggered = true;
    this._lastScrollDate = 0;
    this._scrollEnabled = props.scrollEnabled !== false;
    this._scrollPos = new Animated.Value(0);
    this._onScrollHandler = () => {};
    this._carouselRef = null;
    this._ignoreNextMomentum = false;
    this._autoplaying = false;
    this._autoplay = false;
    this._autoplayInterval = null;
    this._itemToSnapTo = 0;
    this._scrollStartOffset = 0;
    this._scrollStartActive = 0;
    this._scrollEndOffset = 0;
    this._scrollEndActive = 0;
    this._onLayoutInitDone = false;

    this._apparitionTimeout = null;
    this._hackSlideAnimationTimeout = null;
    this._enableAutoplayTimeout = null;
    this._autoplayTimeout = null;
    this._snapNoMomentumTimeout = null;
    this._edgeItemTimeout = null;
    this._lockScrollTimeout = null;

    // Bind methods
    this._renderItemBound = this._renderItem.bind(this);
    this._onSnapBound = this._onSnap.bind(this);
    this._onLayoutBound = this._onLayout.bind(this);
    this._onScrollBound = this._onScroll.bind(this);
    this._onScrollBeginDragBound = props.enableSnap
      ? this._onScrollBeginDrag.bind(this)
      : undefined;
    this._onScrollEndBound =
      props.enableSnap || props.autoplay
        ? this._onScrollEnd.bind(this)
        : undefined;
    this._onScrollEndDragBound = !props.enableMomentum
      ? this._onScrollEndDrag.bind(this)
      : undefined;
    this._onMomentumScrollEndBound = props.enableMomentum
      ? this._onMomentumScrollEnd.bind(this)
      : undefined;
    this._onTouchStartBound = this._onTouchStart.bind(this);
    this._onTouchEndBound = this._onTouchEnd.bind(this);
    this._onTouchReleaseBound = this._onTouchRelease.bind(this);
    this._getKeyExtractorBound = this._getKeyExtractor.bind(this);

    this._setScrollHandler(props);

    // Warnings
    if (!props.vertical && (!props.sliderWidth || !props.itemWidth)) {
      console.error(
        'react-native-snap-carousel: You need to specify both `sliderWidth` and `itemWidth` for horizontal carousels'
      );
    }
    if (props.vertical && (!props.sliderHeight || !props.itemHeight)) {
      console.error(
        'react-native-snap-carousel: You need to specify both `sliderHeight` and `itemHeight` for vertical carousels'
      );
    }
    if (props.apparitionDelay && !IS_IOS && !props.useScrollView) {
      console.warn(
        'react-native-snap-carousel: Using `apparitionDelay` on Android is not recommended since it can lead to rendering issues'
      );
    }
  }

  componentDidMount(): void {
    const { apparitionDelay, autoplay, firstItem } = this.props;
    const _firstItem = this._getFirstItem(firstItem!);
    const apparitionCallback = () => {
      this.setState({ hideCarousel: false });
      if (autoplay) {
        this.startAutoplay();
      }
    };

    this._mounted = true;
    this._initPositionsAndInterpolators();

    requestAnimationFrame(() => {
      if (!this._mounted) {
        return;
      }

      this._snapToItem(_firstItem, false, false, true, false);
      this._hackActiveSlideAnimation(_firstItem, 'start', true);

      if (apparitionDelay) {
        this._apparitionTimeout = setTimeout(() => {
          apparitionCallback();
        }, apparitionDelay);
      } else {
        apparitionCallback();
      }
    });
  }

  shouldComponentUpdate(
    nextProps: CarouselProps<T>,
    nextState: CarouselState
  ): boolean {
    if (this.props.shouldOptimizeUpdates === false) {
      return true;
    } else {
      return shallowCompare(this, nextProps, nextState);
    }
  }

  componentDidUpdate(prevProps: CarouselProps<T>): void {
    const { interpolators } = this.state;
    const {
      firstItem,
      itemHeight,
      itemWidth,
      scrollEnabled,
      sliderHeight,
      sliderWidth,
    } = this.props;
    const itemsLength = this._getCustomDataLength(this.props);

    if (!itemsLength) {
      return;
    }

    const nextFirstItem = this._getFirstItem(firstItem!, this.props);
    let nextActiveItem =
      this._activeItem || this._activeItem === 0
        ? this._activeItem
        : nextFirstItem;

    const hasNewSliderWidth =
      sliderWidth && sliderWidth !== prevProps.sliderWidth;
    const hasNewSliderHeight =
      sliderHeight && sliderHeight !== prevProps.sliderHeight;
    const hasNewItemWidth = itemWidth && itemWidth !== prevProps.itemWidth;
    const hasNewItemHeight = itemHeight && itemHeight !== prevProps.itemHeight;
    const hasNewScrollEnabled = scrollEnabled !== prevProps.scrollEnabled;

    if (nextActiveItem > itemsLength - 1) {
      nextActiveItem = itemsLength - 1;
    }

    if (hasNewScrollEnabled) {
      this._setScrollEnabled(scrollEnabled!);
    }

    if (
      interpolators.length !== itemsLength ||
      hasNewSliderWidth ||
      hasNewSliderHeight ||
      hasNewItemWidth ||
      hasNewItemHeight
    ) {
      this._activeItem = nextActiveItem;
      this._previousItemsLength = itemsLength;

      this._initPositionsAndInterpolators(this.props);

      if (this._previousItemsLength > itemsLength) {
        this._hackActiveSlideAnimation(nextActiveItem, undefined, true);
      }

      if (
        hasNewSliderWidth ||
        hasNewSliderHeight ||
        hasNewItemWidth ||
        hasNewItemHeight
      ) {
        this._snapToItem(nextActiveItem, false, false, false, false);
      }
    } else if (
      nextFirstItem !== this._previousFirstItem &&
      nextFirstItem !== this._activeItem
    ) {
      this._activeItem = nextFirstItem;
      this._previousFirstItem = nextFirstItem;
      this._snapToItem(nextFirstItem, false, true, false, false);
    }

    if (this.props.onScroll !== prevProps.onScroll) {
      this._setScrollHandler(this.props);
    }
  }

  componentWillUnmount(): void {
    this._mounted = false;
    this.stopAutoplay();
    if (this._apparitionTimeout) clearTimeout(this._apparitionTimeout);
    if (this._hackSlideAnimationTimeout) clearTimeout(this._hackSlideAnimationTimeout);
    if (this._enableAutoplayTimeout) clearTimeout(this._enableAutoplayTimeout);
    if (this._autoplayTimeout) clearTimeout(this._autoplayTimeout);
    if (this._snapNoMomentumTimeout) clearTimeout(this._snapNoMomentumTimeout);
    if (this._edgeItemTimeout) clearTimeout(this._edgeItemTimeout);
    if (this._lockScrollTimeout) clearTimeout(this._lockScrollTimeout);
  }

  get realIndex(): number {
    return this._activeItem;
  }

  get currentIndex(): number {
    return this._getDataIndex(this._activeItem);
  }

  get currentScrollPosition(): number {
    return this._currentContentOffset;
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  private _setScrollHandler(props: CarouselProps<T>): void {
    const scrollEventConfig = {
      listener: this._onScrollBound,
      useNativeDriver: true,
    };
    this._scrollPos = new Animated.Value(0);

    const argMapping: unknown[] = props.vertical
      ? [{ nativeEvent: { contentOffset: { y: this._scrollPos } } }]
      : [{ nativeEvent: { contentOffset: { x: this._scrollPos } } }];

    const onScroll = props.onScroll as unknown as {
      _argMapping?: unknown[];
    } | undefined;

    if (onScroll && Array.isArray(onScroll._argMapping)) {
      argMapping.pop();
      const [argMap] = onScroll._argMapping as Array<{
        nativeEvent?: {
          contentOffset?: { x?: Animated.Value; y?: Animated.Value };
        };
      }>;
      if (argMap?.nativeEvent?.contentOffset) {
        this._scrollPos =
          argMap.nativeEvent.contentOffset.x ||
          argMap.nativeEvent.contentOffset.y ||
          this._scrollPos;
      }
      argMapping.push(...onScroll._argMapping);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._onScrollHandler = Animated.event(argMapping as any[], scrollEventConfig as any);
  }

  private _needsScrollView(): boolean {
    const { useScrollView } = this.props;
    return (
      !!useScrollView ||
      !AnimatedFlatList ||
      this._shouldUseStackLayout() ||
      this._shouldUseTinderLayout()
    );
  }

  private _needsRTLAdaptations(): boolean {
    const { vertical } = this.props;
    return IS_RTL && !IS_IOS && !vertical;
  }

  private _canLockScroll(): boolean {
    const { scrollEnabled, enableMomentum, lockScrollWhileSnapping } =
      this.props;
    return !!scrollEnabled && !enableMomentum && !!lockScrollWhileSnapping;
  }

  private _enableLoop(): boolean {
    const { data, enableSnap, loop } = this.props;
    return !!enableSnap && !!loop && !!data && data.length > 1;
  }

  private _shouldAnimateSlides(
    props: CarouselProps<T> = this.props
  ): boolean {
    const {
      inactiveSlideOpacity,
      inactiveSlideScale,
      scrollInterpolator,
      slideInterpolatedStyle,
    } = props;
    return (
      inactiveSlideOpacity! < 1 ||
      inactiveSlideScale! < 1 ||
      !!scrollInterpolator ||
      !!slideInterpolatedStyle ||
      this._shouldUseShiftLayout() ||
      this._shouldUseStackLayout() ||
      this._shouldUseTinderLayout()
    );
  }

  private _shouldUseCustomAnimation(): boolean {
    const { activeAnimationOptions } = this.props;
    return (
      !!activeAnimationOptions &&
      !this._shouldUseStackLayout() &&
      !this._shouldUseTinderLayout()
    );
  }

  private _shouldUseShiftLayout(): boolean {
    const { inactiveSlideShift, layout } = this.props;
    return layout === 'default' && inactiveSlideShift !== 0;
  }

  private _shouldUseStackLayout(): boolean {
    return this.props.layout === 'stack';
  }

  private _shouldUseTinderLayout(): boolean {
    return this.props.layout === 'tinder';
  }

  private _getCustomData(
    props: CarouselProps<T> = this.props
  ): T[] {
    const { data, loopClonesPerSide } = props;
    const dataLength = data && data.length;

    if (!dataLength) {
      return [];
    }

    if (!this._enableLoop()) {
      return data;
    }

    let previousItems: T[] = [];
    let nextItems: T[] = [];

    if (loopClonesPerSide! > dataLength) {
      const dataMultiplier = Math.floor(loopClonesPerSide! / dataLength);
      const remainder = loopClonesPerSide! % dataLength;

      for (let i = 0; i < dataMultiplier; i++) {
        previousItems.push(...data);
        nextItems.push(...data);
      }

      previousItems.unshift(...data.slice(-remainder));
      nextItems.push(...data.slice(0, remainder));
    } else {
      previousItems = data.slice(-loopClonesPerSide!);
      nextItems = data.slice(0, loopClonesPerSide!);
    }

    return previousItems.concat(data, nextItems);
  }

  private _getCustomDataLength(
    props: CarouselProps<T> = this.props
  ): number {
    const { data, loopClonesPerSide } = props;
    const dataLength = data && data.length;

    if (!dataLength) {
      return 0;
    }

    return this._enableLoop()
      ? dataLength + 2 * loopClonesPerSide!
      : dataLength;
  }

  private _getCustomIndex(
    index: number,
    props: CarouselProps<T> = this.props
  ): number {
    const itemsLength = this._getCustomDataLength(props);

    if (!itemsLength || (!index && index !== 0)) {
      return 0;
    }

    return this._needsRTLAdaptations() ? itemsLength - index - 1 : index;
  }

  private _getDataIndex(index: number): number {
    const { data, loopClonesPerSide } = this.props;
    const dataLength = data && data.length;

    if (!this._enableLoop() || !dataLength) {
      return index;
    }

    if (index >= dataLength + loopClonesPerSide!) {
      return loopClonesPerSide! > dataLength
        ? (index - loopClonesPerSide!) % dataLength
        : index - dataLength - loopClonesPerSide!;
    } else if (index < loopClonesPerSide!) {
      if (loopClonesPerSide! > dataLength) {
        const baseDataIndexes: number[] = [];
        const dataIndexes: number[] = [];
        const dataMultiplier = Math.floor(loopClonesPerSide! / dataLength);
        const remainder = loopClonesPerSide! % dataLength;

        for (let i = 0; i < dataLength; i++) {
          baseDataIndexes.push(i);
        }

        for (let j = 0; j < dataMultiplier; j++) {
          dataIndexes.push(...baseDataIndexes);
        }

        dataIndexes.unshift(...baseDataIndexes.slice(-remainder));
        return dataIndexes[index];
      } else {
        return index + dataLength - loopClonesPerSide!;
      }
    } else {
      return index - loopClonesPerSide!;
    }
  }

  private _getPositionIndex(index: number): number {
    const { loop, loopClonesPerSide } = this.props;
    return loop ? index + loopClonesPerSide! : index;
  }

  private _getFirstItem(
    index: number,
    props: CarouselProps<T> = this.props
  ): number {
    const { loopClonesPerSide } = props;
    const itemsLength = this._getCustomDataLength(props);

    if (!itemsLength || index > itemsLength - 1 || index < 0) {
      return 0;
    }

    return this._enableLoop() ? index + loopClonesPerSide! : index;
  }

  private _getWrappedRef(): {
    scrollTo?: (options: { x: number; y: number; animated: boolean }) => void;
    scrollToOffset?: (options: { offset: number; animated: boolean }) => void;
    setNativeProps?: (props: Record<string, unknown>) => void;
    getNode?: () => unknown;
  } | null {
    const ref = this._carouselRef as {
      scrollTo?: (options: { x: number; y: number; animated: boolean }) => void;
      scrollToOffset?: (options: { offset: number; animated: boolean }) => void;
      setNativeProps?: (props: Record<string, unknown>) => void;
      getNode?: () => unknown;
    } | null;

    if (
      ref &&
      ((this._needsScrollView() && ref.scrollTo) ||
        (!this._needsScrollView() && ref.scrollToOffset))
    ) {
      return ref;
    }

    // Fallback for older React Native
    if (ref?.getNode) {
      return ref.getNode() as typeof ref;
    }

    return ref;
  }

  private _getScrollEnabled(): boolean {
    return this._scrollEnabled;
  }

  private _setScrollEnabled(scrollEnabled: boolean = true): void {
    const wrappedRef = this._getWrappedRef();

    if (!wrappedRef?.setNativeProps) {
      return;
    }

    wrappedRef.setNativeProps({ scrollEnabled });
    this._scrollEnabled = scrollEnabled;
  }

  private _getKeyExtractor(_item: T, index: number): string {
    return this._needsScrollView()
      ? `scrollview-item-${index}`
      : `flatlist-item-${index}`;
  }

  private _getScrollOffset(
    event: NativeSyntheticEvent<NativeScrollEvent>
  ): number {
    const { vertical } = this.props;
    return (
      event?.nativeEvent?.contentOffset?.[vertical ? 'y' : 'x'] || 0
    );
  }

  private _getContainerInnerMargin(opposite: boolean = false): number {
    const {
      sliderWidth,
      sliderHeight,
      itemWidth,
      itemHeight,
      vertical,
      activeSlideAlignment,
    } = this.props;

    if (
      (activeSlideAlignment === 'start' && !opposite) ||
      (activeSlideAlignment === 'end' && opposite)
    ) {
      return 0;
    } else if (
      (activeSlideAlignment === 'end' && !opposite) ||
      (activeSlideAlignment === 'start' && opposite)
    ) {
      return vertical
        ? sliderHeight! - itemHeight!
        : sliderWidth! - itemWidth!;
    } else {
      return vertical
        ? (sliderHeight! - itemHeight!) / 2
        : (sliderWidth! - itemWidth!) / 2;
    }
  }

  private _getViewportOffset(): number {
    const {
      sliderWidth,
      sliderHeight,
      itemWidth,
      itemHeight,
      vertical,
      activeSlideAlignment,
    } = this.props;

    if (activeSlideAlignment === 'start') {
      return vertical ? itemHeight! / 2 : itemWidth! / 2;
    } else if (activeSlideAlignment === 'end') {
      return vertical
        ? sliderHeight! - itemHeight! / 2
        : sliderWidth! - itemWidth! / 2;
    } else {
      return vertical ? sliderHeight! / 2 : sliderWidth! / 2;
    }
  }

  private _getCenter(offset: number): number {
    return offset + this._getViewportOffset() - this._getContainerInnerMargin();
  }

  private _getActiveItem(offset: number): number {
    const { activeSlideOffset, swipeThreshold } = this.props;
    const center = this._getCenter(offset);
    const centerOffset = activeSlideOffset || swipeThreshold!;

    for (let i = 0; i < this._positions.length; i++) {
      const { start, end } = this._positions[i];
      if (center + centerOffset! >= start && center - centerOffset! <= end) {
        return i;
      }
    }

    const lastIndex = this._positions.length - 1;
    if (
      this._positions[lastIndex] &&
      center - centerOffset! > this._positions[lastIndex].end
    ) {
      return lastIndex;
    }

    return 0;
  }

  private _initPositionsAndInterpolators(
    props: CarouselProps<T> = this.props
  ): void {
    const { data, itemWidth, itemHeight, scrollInterpolator, vertical } = props;
    const sizeRef = vertical ? itemHeight! : itemWidth!;

    if (!data || !data.length) {
      return;
    }

    const interpolators: (Animated.Value | Animated.AnimatedInterpolation<number>)[] = [];
    this._positions = [];

    this._getCustomData(props).forEach((_itemData, index) => {
      const _index = this._getCustomIndex(index, props);

      this._positions[index] = {
        start: index * sizeRef,
        end: index * sizeRef + sizeRef,
      };

      let animatedValue: Animated.Value | Animated.AnimatedInterpolation<number>;

      if (!this._shouldAnimateSlides(props)) {
        animatedValue = new Animated.Value(1);
      } else if (this._shouldUseCustomAnimation()) {
        animatedValue = new Animated.Value(
          _index === this._activeItem ? 1 : 0
        );
      } else {
        let interpolator;

        if (scrollInterpolator) {
          interpolator = scrollInterpolator(_index, props as unknown as CarouselInternalProps);
        } else if (this._shouldUseStackLayout()) {
          interpolator = stackScrollInterpolator(_index, props as unknown as CarouselInternalProps);
        } else if (this._shouldUseTinderLayout()) {
          interpolator = tinderScrollInterpolator(
            _index,
            props as unknown as CarouselInternalProps
          );
        }

        if (
          !interpolator ||
          !interpolator.inputRange ||
          !interpolator.outputRange
        ) {
          interpolator = defaultScrollInterpolator(
            _index,
            props as unknown as CarouselInternalProps
          );
        }

        animatedValue = this._scrollPos.interpolate({
          ...interpolator,
          extrapolate: 'clamp',
        });
      }

      interpolators.push(animatedValue);
    });

    this.setState({ interpolators });
  }

  private _getSlideAnimation(
    index: number,
    toValue: number
  ): Animated.CompositeAnimation | null {
    const { interpolators } = this.state;
    const { activeAnimationType, activeAnimationOptions } = this.props;

    const animatedValue = interpolators && interpolators[index];

    if (!animatedValue && animatedValue !== 0) {
      return null;
    }

    const animationCommonOptions = {
      isInteraction: false,
      useNativeDriver: true,
      ...activeAnimationOptions,
      toValue: toValue,
    };

    return Animated.parallel([
      Animated.timing(animatedValue as Animated.Value, {
        ...animationCommonOptions,
        easing: Easing.linear,
      }),
      (Animated as unknown as Record<string, (...args: unknown[]) => Animated.CompositeAnimation>)[
        activeAnimationType!
      ](animatedValue, { ...animationCommonOptions }),
    ]);
  }

  private _playCustomSlideAnimation(current: number, next: number): void {
    const { interpolators } = this.state;
    const itemsLength = this._getCustomDataLength();
    const _currentIndex = this._getCustomIndex(current);
    const _currentDataIndex = this._getDataIndex(_currentIndex);
    const _nextIndex = this._getCustomIndex(next);
    const _nextDataIndex = this._getDataIndex(_nextIndex);
    const animations: (Animated.CompositeAnimation | null)[] = [];

    if (this._enableLoop()) {
      for (let i = 0; i < itemsLength; i++) {
        if (
          this._getDataIndex(i) === _currentDataIndex &&
          interpolators[i]
        ) {
          animations.push(this._getSlideAnimation(i, 0));
        } else if (
          this._getDataIndex(i) === _nextDataIndex &&
          interpolators[i]
        ) {
          animations.push(this._getSlideAnimation(i, 1));
        }
      }
    } else {
      if (interpolators[current]) {
        animations.push(this._getSlideAnimation(current, 0));
      }
      if (interpolators[next]) {
        animations.push(this._getSlideAnimation(next, 1));
      }
    }

    const validAnimations = animations.filter(
      (a): a is Animated.CompositeAnimation => a !== null
    );
    Animated.parallel(validAnimations, { stopTogether: false }).start();
  }

  private _hackActiveSlideAnimation(
    index: number,
    goTo?: string,
    force: boolean = false
  ): void {
    const { data } = this.props;

    if (
      !this._mounted ||
      !this._carouselRef ||
      !this._positions[index] ||
      (!force && this._enableLoop())
    ) {
      return;
    }

    const offset =
      this._positions[index] && this._positions[index].start;

    if (!offset && offset !== 0) {
      return;
    }

    const itemsLength = data && data.length;
    const direction =
      goTo || itemsLength === 1 ? 'start' : 'end';

    this._scrollTo(offset + (direction === 'start' ? -1 : 1), false);

    if (this._hackSlideAnimationTimeout)
      clearTimeout(this._hackSlideAnimationTimeout);
    this._hackSlideAnimationTimeout = setTimeout(() => {
      this._scrollTo(offset, false);
    }, 50);
  }

  private _lockScroll(): void {
    const { lockScrollTimeoutDuration } = this.props;
    if (this._lockScrollTimeout) clearTimeout(this._lockScrollTimeout);
    this._lockScrollTimeout = setTimeout(() => {
      this._releaseScroll();
    }, lockScrollTimeoutDuration);
    this._setScrollEnabled(false);
  }

  private _releaseScroll(): void {
    if (this._lockScrollTimeout) clearTimeout(this._lockScrollTimeout);
    this._setScrollEnabled(true);
  }

  private _repositionScroll(index: number): void {
    const { data, loopClonesPerSide } = this.props;
    const dataLength = data && data.length;

    if (
      !this._enableLoop() ||
      !dataLength ||
      (index >= loopClonesPerSide! &&
        index < dataLength + loopClonesPerSide!)
    ) {
      return;
    }

    let repositionTo = index;

    if (index >= dataLength + loopClonesPerSide!) {
      repositionTo = index - dataLength;
    } else if (index < loopClonesPerSide!) {
      repositionTo = index + dataLength;
    }

    this._snapToItem(repositionTo, false, false, false, false);
  }

  private _scrollTo(offset: number, animated: boolean = true): void {
    const { vertical } = this.props;
    const wrappedRef = this._getWrappedRef();

    if (!this._mounted || !wrappedRef) {
      return;
    }

    if (this._needsScrollView() && wrappedRef.scrollTo) {
      wrappedRef.scrollTo({
        x: vertical ? 0 : offset,
        y: vertical ? offset : 0,
        animated,
      });
    } else if (wrappedRef.scrollToOffset) {
      wrappedRef.scrollToOffset({ offset, animated });
    }
  }

  private _onScroll(event?: NativeSyntheticEvent<NativeScrollEvent>): void {
    const { callbackOffsetMargin, enableMomentum, onScroll } = this.props;

    const scrollOffset = event
      ? this._getScrollOffset(event)
      : this._currentContentOffset;
    const nextActiveItem = this._getActiveItem(scrollOffset);
    const itemReached = nextActiveItem === this._itemToSnapTo;
    const scrollConditions =
      scrollOffset >= (this._scrollOffsetRef ?? 0) - callbackOffsetMargin! &&
      scrollOffset <= (this._scrollOffsetRef ?? 0) + callbackOffsetMargin!;

    this._currentContentOffset = scrollOffset;
    this._onScrollTriggered = true;
    this._lastScrollDate = Date.now();

    if (
      this._activeItem !== nextActiveItem &&
      this._shouldUseCustomAnimation()
    ) {
      this._playCustomSlideAnimation(this._activeItem, nextActiveItem);
    }

    if (enableMomentum) {
      if (this._snapNoMomentumTimeout)
        clearTimeout(this._snapNoMomentumTimeout);

      if (this._activeItem !== nextActiveItem) {
        this._activeItem = nextActiveItem;
      }

      if (itemReached) {
        if (this._canFireBeforeCallback) {
          this._onBeforeSnap(this._getDataIndex(nextActiveItem));
        }

        if (scrollConditions && this._canFireCallback) {
          this._onSnap(this._getDataIndex(nextActiveItem));
        }
      }
    } else if (this._activeItem !== nextActiveItem && itemReached) {
      if (this._canFireBeforeCallback) {
        this._onBeforeSnap(this._getDataIndex(nextActiveItem));
      }

      if (scrollConditions) {
        this._activeItem = nextActiveItem;

        if (this._canLockScroll()) {
          this._releaseScroll();
        }

        if (this._canFireCallback) {
          this._onSnap(this._getDataIndex(nextActiveItem));
        }
      }
    }

    if (
      nextActiveItem === this._itemToSnapTo &&
      scrollOffset === this._scrollOffsetRef
    ) {
      this._repositionScroll(nextActiveItem);
    }

    if (typeof onScroll === 'function' && event) {
      onScroll(event);
    }
  }

  private _onTouchStart(): void {
    const { onTouchStart } = this.props;

    if (this._getScrollEnabled() !== false && this._autoplaying) {
      this.pauseAutoPlay();
    }

    if (onTouchStart) {
      onTouchStart();
    }
  }

  private _onTouchEnd(): void {
    const { onTouchEnd } = this.props;

    if (
      this._getScrollEnabled() !== false &&
      this._autoplay &&
      !this._autoplaying
    ) {
      this.startAutoplay();
    }

    if (onTouchEnd) {
      onTouchEnd();
    }
  }

  private _onScrollBeginDrag(
    event: NativeSyntheticEvent<NativeScrollEvent>
  ): void {
    const { onScrollBeginDrag } = this.props;

    if (!this._getScrollEnabled()) {
      return;
    }

    this._scrollStartOffset = this._getScrollOffset(event);
    this._scrollStartActive = this._getActiveItem(this._scrollStartOffset);
    this._ignoreNextMomentum = false;

    if (onScrollBeginDrag) {
      onScrollBeginDrag(event);
    }
  }

  private _onScrollEndDrag(
    event: NativeSyntheticEvent<NativeScrollEvent>
  ): void {
    const { onScrollEndDrag } = this.props;

    if (this._carouselRef) {
      this._onScrollEndBound?.();
    }

    if (onScrollEndDrag) {
      onScrollEndDrag(event);
    }
  }

  private _onMomentumScrollEnd(
    event: NativeSyntheticEvent<NativeScrollEvent>
  ): void {
    const { onMomentumScrollEnd } = this.props;

    if (this._carouselRef) {
      this._onScrollEndBound?.();
    }

    if (onMomentumScrollEnd) {
      onMomentumScrollEnd(event);
    }
  }

  private _onScrollEnd(): void {
    const { autoplayDelay, enableSnap } = this.props;

    if (this._ignoreNextMomentum) {
      this._ignoreNextMomentum = false;
      return;
    }

    if (this._currentContentOffset === this._scrollEndOffset) {
      return;
    }

    this._scrollEndOffset = this._currentContentOffset;
    this._scrollEndActive = this._getActiveItem(this._scrollEndOffset);

    if (enableSnap) {
      this._snapScroll(this._scrollEndOffset - this._scrollStartOffset);
    }

    if (this._autoplay && !this._autoplaying) {
      if (this._enableAutoplayTimeout)
        clearTimeout(this._enableAutoplayTimeout);
      this._enableAutoplayTimeout = setTimeout(() => {
        this.startAutoplay();
      }, autoplayDelay! + 50);
    }
  }

  private _onTouchRelease(): void {
    const { enableMomentum } = this.props;

    if (enableMomentum && IS_IOS) {
      if (this._snapNoMomentumTimeout)
        clearTimeout(this._snapNoMomentumTimeout);
      this._snapNoMomentumTimeout = setTimeout(() => {
        this._snapToItem(this._activeItem);
      }, 100);
    }
  }

  private _onLayout(event: LayoutChangeEvent): void {
    const { onLayout } = this.props;

    if (this._onLayoutInitDone) {
      this._initPositionsAndInterpolators();
      this._snapToItem(this._activeItem, false, false, false, false);
    } else {
      this._onLayoutInitDone = true;
    }

    if (onLayout) {
      onLayout(event as unknown as NativeSyntheticEvent<unknown>);
    }
  }

  private _snapScroll(delta: number): void {
    const { swipeThreshold } = this.props;

    if (!this._scrollEndActive && this._scrollEndActive !== 0 && IS_IOS) {
      this._scrollEndActive = this._scrollStartActive;
    }

    if (this._scrollStartActive !== this._scrollEndActive) {
      this._snapToItem(this._scrollEndActive);
    } else {
      if (delta > 0) {
        if (delta > swipeThreshold!) {
          this._snapToItem(this._scrollStartActive + 1);
        } else {
          this._snapToItem(this._scrollEndActive);
        }
      } else if (delta < 0) {
        if (delta < -swipeThreshold!) {
          this._snapToItem(this._scrollStartActive - 1);
        } else {
          this._snapToItem(this._scrollEndActive);
        }
      } else {
        this._snapToItem(this._scrollEndActive);
      }
    }
  }

  private _snapToItem(
    index: number,
    animated: boolean = true,
    fireCallback: boolean = true,
    initial: boolean = false,
    lockScroll: boolean = true
  ): void {
    const { enableMomentum, onSnapToItem, onBeforeSnapToItem } = this.props;
    const itemsLength = this._getCustomDataLength();
    const wrappedRef = this._getWrappedRef();

    if (!itemsLength || !wrappedRef) {
      return;
    }

    if (!index || index < 0) {
      index = 0;
    } else if (itemsLength > 0 && index >= itemsLength) {
      index = itemsLength - 1;
    }

    if (index !== this._previousActiveItem) {
      this._previousActiveItem = index;

      if (lockScroll && this._canLockScroll()) {
        this._lockScroll();
      }

      if (fireCallback) {
        if (onBeforeSnapToItem) {
          this._canFireBeforeCallback = true;
        }

        if (onSnapToItem) {
          this._canFireCallback = true;
        }
      }
    }

    this._itemToSnapTo = index;
    this._scrollOffsetRef =
      this._positions[index] && this._positions[index].start;
    this._onScrollTriggered = false;

    if (!this._scrollOffsetRef && this._scrollOffsetRef !== 0) {
      return;
    }

    this._scrollTo(this._scrollOffsetRef, animated);

    this._scrollEndOffset = this._currentContentOffset;

    if (enableMomentum) {
      if (!initial) {
        this._ignoreNextMomentum = true;
      }

      if (index === 0 || index === itemsLength - 1) {
        if (this._edgeItemTimeout) clearTimeout(this._edgeItemTimeout);
        this._edgeItemTimeout = setTimeout(() => {
          if (
            !initial &&
            index === this._activeItem &&
            !this._onScrollTriggered
          ) {
            this._onScroll();
          }
        }, 250);
      }
    }
  }

  private _onBeforeSnap(index: number): void {
    const { onBeforeSnapToItem } = this.props;

    if (!this._carouselRef) {
      return;
    }

    this._canFireBeforeCallback = false;
    onBeforeSnapToItem?.(index);
  }

  private _onSnap(index: number): void {
    const { onSnapToItem } = this.props;

    if (!this._carouselRef) {
      return;
    }

    this._canFireCallback = false;
    onSnapToItem?.(index);
  }

  // ============================================================================
  // Public methods (CarouselRef)
  // ============================================================================

  startAutoplay(): void {
    const { autoplayInterval, autoplayDelay } = this.props;
    this._autoplay = true;

    if (this._autoplaying) {
      return;
    }

    if (this._autoplayTimeout) clearTimeout(this._autoplayTimeout);
    this._autoplayTimeout = setTimeout(() => {
      this._autoplaying = true;
      this._autoplayInterval = setInterval(() => {
        if (this._autoplaying) {
          this.snapToNext();
        }
      }, autoplayInterval);
    }, autoplayDelay);
  }

  pauseAutoPlay(): void {
    this._autoplaying = false;
    if (this._autoplayTimeout) clearTimeout(this._autoplayTimeout);
    if (this._enableAutoplayTimeout) clearTimeout(this._enableAutoplayTimeout);
    if (this._autoplayInterval) clearInterval(this._autoplayInterval);
  }

  stopAutoplay(): void {
    this._autoplay = false;
    this.pauseAutoPlay();
  }

  snapToItem(
    index: number,
    animated: boolean = true,
    fireCallback: boolean = true
  ): void {
    if (!index || index < 0) {
      index = 0;
    }

    const positionIndex = this._getPositionIndex(index);

    if (positionIndex === this._activeItem) {
      return;
    }

    this._snapToItem(positionIndex, animated, fireCallback);
  }

  snapToNext(
    animated: boolean = true,
    fireCallback: boolean = true
  ): void {
    const itemsLength = this._getCustomDataLength();

    let newIndex = this._activeItem + 1;
    if (newIndex > itemsLength - 1) {
      if (!this._enableLoop()) {
        return;
      }
      newIndex = 0;
    }
    this._snapToItem(newIndex, animated, fireCallback);
  }

  snapToPrev(
    animated: boolean = true,
    fireCallback: boolean = true
  ): void {
    const itemsLength = this._getCustomDataLength();

    let newIndex = this._activeItem - 1;
    if (newIndex < 0) {
      if (!this._enableLoop()) {
        return;
      }
      newIndex = itemsLength - 1;
    }
    this._snapToItem(newIndex, animated, fireCallback);
  }

  triggerRenderingHack(offset?: number): void {
    if (Date.now() - this._lastScrollDate < 500) {
      return;
    }

    const scrollPosition = this._currentContentOffset;
    if (!scrollPosition && scrollPosition !== 0) {
      return;
    }

    const scrollOffset =
      offset || (scrollPosition === 0 ? 1 : -1);
    this._scrollTo(scrollPosition + scrollOffset, false);
  }

  // ============================================================================
  // Render methods
  // ============================================================================

  private _getSlideInterpolatedStyle(
    index: number,
    animatedValue: Animated.AnimatedInterpolation<number>
  ): Record<string, unknown> {
    const { layoutCardOffset, slideInterpolatedStyle } = this.props;

    if (slideInterpolatedStyle) {
      return slideInterpolatedStyle(
        index,
        animatedValue,
        this.props as unknown as CarouselInternalProps
      );
    } else if (this._shouldUseTinderLayout()) {
      return tinderAnimatedStyles(
        index,
        animatedValue,
        this.props as unknown as CarouselInternalProps,
        layoutCardOffset
      );
    } else if (this._shouldUseStackLayout()) {
      return stackAnimatedStyles(
        index,
        animatedValue,
        this.props as unknown as CarouselInternalProps,
        layoutCardOffset
      );
    } else if (this._shouldUseShiftLayout()) {
      return shiftAnimatedStyles(
        index,
        animatedValue,
        this.props as unknown as CarouselInternalProps
      );
    } else {
      return defaultAnimatedStyles(
        index,
        animatedValue,
        this.props as unknown as CarouselInternalProps
      );
    }
  }

  private _renderItem({
    item,
    index,
  }: {
    item: T;
    index: number;
  }): React.ReactElement | null {
    const { interpolators } = this.state;
    const {
      hasParallaxImages,
      itemWidth,
      itemHeight,
      keyExtractor,
      renderItem,
      sliderHeight,
      sliderWidth,
      slideStyle,
      vertical,
    } = this.props;

    const animatedValue = interpolators && interpolators[index];

    if (!animatedValue && animatedValue !== 0) {
      return null;
    }

    const animate = this._shouldAnimateSlides();
    const ComponentView = animate ? Animated.View : View;
    const animatedStyle = animate
      ? this._getSlideInterpolatedStyle(
          index,
          animatedValue as Animated.AnimatedInterpolation<number>
        )
      : {};

    const parallaxProps: ParallaxProps | undefined = hasParallaxImages
      ? {
          scrollPosition: this._scrollPos,
          carouselRef: this._carouselRef,
          vertical,
          sliderWidth,
          sliderHeight,
          itemWidth,
          itemHeight,
        }
      : undefined;

    const mainDimension = vertical
      ? { height: itemHeight }
      : { width: itemWidth };
    const specificProps = this._needsScrollView()
      ? {
          key: keyExtractor
            ? keyExtractor(item, index)
            : this._getKeyExtractor(item, index),
        }
      : {};

    return (
      <ComponentView
        style={[mainDimension, slideStyle, animatedStyle] as StyleProp<ViewStyle>}
        pointerEvents={'box-none'}
        {...specificProps}
      >
        {renderItem({ item, index }, parallaxProps)}
      </ComponentView>
    );
  }

  private _getComponentOverridableProps(): Record<string, unknown> {
    const {
      enableMomentum,
      itemWidth,
      itemHeight,
      loopClonesPerSide,
      sliderWidth,
      sliderHeight,
      vertical,
    } = this.props;

    const visibleItems =
      Math.ceil(
        vertical ? sliderHeight! / itemHeight! : sliderWidth! / itemWidth!
      ) + 1;
    const initialNumPerSide = this._enableLoop() ? loopClonesPerSide! : 2;
    const initialNumToRender = visibleItems + initialNumPerSide * 2;
    const maxToRenderPerBatch = 1 + initialNumToRender * 2;
    const windowSize = maxToRenderPerBatch;

    const specificProps = !this._needsScrollView()
      ? {
          initialNumToRender,
          maxToRenderPerBatch,
          windowSize,
        }
      : {};

    return {
      decelerationRate: enableMomentum ? 0.9 : 'fast',
      showsHorizontalScrollIndicator: false,
      showsVerticalScrollIndicator: false,
      overScrollMode: 'never',
      automaticallyAdjustContentInsets: false,
      directionalLockEnabled: true,
      pinchGestureEnabled: false,
      scrollsToTop: false,
      removeClippedSubviews: !this._needsScrollView(),
      inverted: this._needsRTLAdaptations(),
      ...specificProps,
    };
  }

  private _getComponentStaticProps(): Record<string, unknown> {
    const { hideCarousel } = this.state;
    const {
      containerCustomStyle,
      contentContainerCustomStyle,
      keyExtractor,
      sliderWidth,
      sliderHeight,
      style,
      vertical,
    } = this.props;

    const containerStyle = [
      (containerCustomStyle || style || {}) as Record<string, unknown>,
      hideCarousel ? { opacity: 0 } : {},
      vertical
        ? { height: sliderHeight, flexDirection: 'column' as const }
        : {
            width: sliderWidth,
            flexDirection: this._needsRTLAdaptations()
              ? ('row-reverse' as const)
              : ('row' as const),
          },
    ];
    const contentContainerStyle = [
      vertical
        ? {
            paddingTop: this._getContainerInnerMargin(),
            paddingBottom: this._getContainerInnerMargin(true),
          }
        : {
            paddingLeft: this._getContainerInnerMargin(),
            paddingRight: this._getContainerInnerMargin(true),
          },
      (contentContainerCustomStyle || {}) as Record<string, unknown>,
    ];

    const specificProps = !this._needsScrollView()
      ? {
          renderItem: this._renderItemBound,
          numColumns: 1,
          keyExtractor: keyExtractor || this._getKeyExtractorBound,
        }
      : {};

    return {
      ref: (c: unknown) => (this._carouselRef = c),
      data: this._getCustomData(),
      style: containerStyle,
      contentContainerStyle,
      horizontal: !vertical,
      scrollEventThrottle: 1,
      onScroll: this._onScrollHandler,
      onScrollBeginDrag: this._onScrollBeginDragBound,
      onScrollEndDrag: this._onScrollEndDragBound,
      onMomentumScrollEnd: this._onMomentumScrollEndBound,
      onResponderRelease: this._onTouchReleaseBound,
      onStartShouldSetResponderCapture: () => this._getScrollEnabled(),
      onTouchStart: this._onTouchStartBound,
      onTouchEnd: this._onScrollEndBound,
      onLayout: this._onLayoutBound,
      ...specificProps,
    };
  }

  render(): React.ReactElement | null {
    const { data, renderItem, useScrollView } = this.props;

    if (!data || !renderItem) {
      return null;
    }

    const props = {
      ...this._getComponentOverridableProps(),
      ...(this.props as Record<string, unknown>),
      ...this._getComponentStaticProps(),
    };

    const ScrollViewComponent =
      typeof useScrollView === 'function'
        ? useScrollView
        : AnimatedScrollView;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ScrollComp = ScrollViewComponent as React.ComponentType<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const FlatListComp = AnimatedFlatList as React.ComponentType<any>;

    return this._needsScrollView() ? (
      <ScrollComp {...props}>
        {this._getCustomData().map((item, index) => {
          return this._renderItem({ item, index });
        })}
      </ScrollComp>
    ) : (
      <FlatListComp {...props} />
    );
  }
}
