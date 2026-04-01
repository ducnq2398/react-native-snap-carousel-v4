# react-native-snap-carousel-v4

> TypeScript rewrite of [react-native-snap-carousel](https://github.com/meliorence/react-native-snap-carousel) with full support for modern React Native (0.71+).

[![npm version](https://badge.fury.io/js/react-native-snap-carousel-v4.svg)](https://www.npmjs.com/package/react-native-snap-carousel-v4)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

Swiper/carousel component for React Native featuring previews, multiple layouts, parallax images, performant handling of huge numbers of items, and more. Compatible with Android & iOS.

## ✨ What's New in v4

- 🔷 **Native TypeScript** — Written entirely in TypeScript with full type definitions
- 🚀 **Modern React Native** — Compatible with React Native 0.71+ (including New Architecture)
- 🧹 **No Deprecated APIs** — Removed `ViewPropTypes`, `PropTypes`, `react-addons-shallow-compare`, `findNodeHandle`
- 📦 **Drop-in Replacement** — Same API surface as `react-native-snap-carousel` v3.9.1
- 🎯 **Generic Types** — `Carousel<T>` provides type-safe data and renderItem

## 📦 Installation

```bash
npm install react-native-snap-carousel-v4
# or
yarn add react-native-snap-carousel-v4
```

**No need to install `@types/react-native-snap-carousel`** — types are included!

## 🔄 Migration from react-native-snap-carousel

### 1. Update imports

```diff
- import Carousel from 'react-native-snap-carousel';
- import { Pagination, ParallaxImage } from 'react-native-snap-carousel';
+ import Carousel from 'react-native-snap-carousel-v4';
+ import { Pagination, ParallaxImage } from 'react-native-snap-carousel-v4';
```

### 2. Remove @types package

```bash
npm uninstall @types/react-native-snap-carousel react-native-snap-carousel
```

### 3. That's it! 🎉

The API is fully backward-compatible. All existing props, methods, and callbacks work as before.

## 📖 Usage

### Basic Example

```tsx
import React, { useRef } from 'react';
import { View, Text, Dimensions } from 'react-native';
import Carousel from 'react-native-snap-carousel-v4';
import type { CarouselRenderItemInfo } from 'react-native-snap-carousel-v4';

const { width: screenWidth } = Dimensions.get('window');

interface CarouselItem {
  title: string;
  text: string;
}

const MyCarousel: React.FC = () => {
  const carouselRef = useRef<Carousel<CarouselItem>>(null);

  const data: CarouselItem[] = [
    { title: 'Item 1', text: 'Description 1' },
    { title: 'Item 2', text: 'Description 2' },
    { title: 'Item 3', text: 'Description 3' },
  ];

  const renderItem = ({ item, index }: CarouselRenderItemInfo<CarouselItem>) => {
    return (
      <View style={{ backgroundColor: 'white', borderRadius: 8, padding: 20 }}>
        <Text style={{ fontSize: 20 }}>{item.title}</Text>
        <Text>{item.text}</Text>
      </View>
    );
  };

  return (
    <Carousel<CarouselItem>
      ref={carouselRef}
      data={data}
      renderItem={renderItem}
      sliderWidth={screenWidth}
      itemWidth={screenWidth * 0.75}
      layout={'default'}
    />
  );
};
```

### With Pagination

```tsx
import Carousel, { Pagination } from 'react-native-snap-carousel-v4';

const MyCarouselWithPagination: React.FC = () => {
  const [activeSlide, setActiveSlide] = React.useState(0);

  return (
    <View>
      <Carousel
        data={data}
        renderItem={renderItem}
        sliderWidth={screenWidth}
        itemWidth={screenWidth * 0.75}
        onSnapToItem={(index) => setActiveSlide(index)}
      />
      <Pagination
        dotsLength={data.length}
        activeDotIndex={activeSlide}
        dotStyle={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(0, 0, 0, 0.92)' }}
        inactiveDotOpacity={0.4}
        inactiveDotScale={0.6}
      />
    </View>
  );
};
```

### With Parallax Images

```tsx
import Carousel, { ParallaxImage } from 'react-native-snap-carousel-v4';

const renderItem = ({ item }: CarouselRenderItemInfo<MyItem>, parallaxProps?: ParallaxProps) => {
  return (
    <View style={{ width: itemWidth, height: 200 }}>
      <ParallaxImage
        source={{ uri: item.imageUrl }}
        containerStyle={{ flex: 1, borderRadius: 8 }}
        parallaxFactor={0.4}
        {...parallaxProps}
      />
    </View>
  );
};

<Carousel
  data={data}
  renderItem={renderItem}
  hasParallaxImages={true}
  sliderWidth={screenWidth}
  itemWidth={screenWidth * 0.75}
/>
```

### Layouts

```tsx
// Default layout
<Carousel layout={'default'} />

// Stack layout
<Carousel layout={'stack'} layoutCardOffset={18} />

// Tinder layout
<Carousel layout={'tinder'} layoutCardOffset={9} />
```

## 📋 Props

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `data` | `T[]` | Array of items to loop on |
| `renderItem` | `CarouselRenderItem<T>` | Function to render each item |
| `itemWidth` | `number` | Width of carousel items (horizontal) |
| `sliderWidth` | `number` | Width of the carousel (horizontal) |
| `itemHeight` | `number` | Height of carousel items (vertical) |
| `sliderHeight` | `number` | Height of the carousel (vertical) |

### Behavior

| Prop | Type | Default |
|------|------|---------|
| `activeSlideOffset` | `number` | `20` |
| `enableMomentum` | `boolean` | `false` |
| `enableSnap` | `boolean` | `true` |
| `firstItem` | `number` | `0` |
| `lockScrollWhileSnapping` | `boolean` | `false` |
| `loop` | `boolean` | `false` |
| `loopClonesPerSide` | `number` | `3` |
| `vertical` | `boolean` | `false` |

### Autoplay

| Prop | Type | Default |
|------|------|---------|
| `autoplay` | `boolean` | `false` |
| `autoplayDelay` | `number` | `1000` |
| `autoplayInterval` | `number` | `3000` |

### Style & Animation

| Prop | Type | Default |
|------|------|---------|
| `layout` | `'default' \| 'stack' \| 'tinder'` | `'default'` |
| `layoutCardOffset` | `number` | `18` / `9` |
| `inactiveSlideOpacity` | `number` | `0.7` |
| `inactiveSlideScale` | `number` | `0.9` |
| `activeSlideAlignment` | `'start' \| 'center' \| 'end'` | `'center'` |
| `containerCustomStyle` | `StyleProp<ViewStyle>` | `{}` |
| `contentContainerCustomStyle` | `StyleProp<ViewStyle>` | `{}` |

### Callbacks

| Prop | Type |
|------|------|
| `onSnapToItem` | `(slideIndex: number) => void` |
| `onBeforeSnapToItem` | `(slideIndex: number) => void` |
| `onScroll` | `(event: NativeSyntheticEvent<NativeScrollEvent>) => void` |

## 🔧 Methods

| Method | Description |
|--------|-------------|
| `snapToItem(index, animated?, fireCallback?)` | Snap to item |
| `snapToNext(animated?, fireCallback?)` | Snap to next |
| `snapToPrev(animated?, fireCallback?)` | Snap to previous |
| `startAutoplay()` | Start autoplay |
| `stopAutoplay()` | Stop autoplay |
| `currentIndex` | Get current active item index |
| `currentScrollPosition` | Get current scroll position |

## 📝 Types

All types are exported and available for use:

```typescript
import type {
  CarouselProps,
  CarouselRef,
  CarouselRenderItem,
  CarouselRenderItemInfo,
  PaginationProps,
  ParallaxImageProps,
  CarouselLayout,
  ActiveSlideAlignment,
  ScrollInterpolatorFunction,
  SlideInterpolatedStyleFunction,
} from 'react-native-snap-carousel-v4';
```

## 🙏 Credits

Based on the original [react-native-snap-carousel](https://github.com/meliorence/react-native-snap-carousel) by [Benoît Delmaire](https://github.com/bd-arc) and [Maxime Bertonnier](https://github.com/Exilz) at [Meliorence](https://www.meliorence.com/).

## 📄 License

BSD-3-Clause — Same as the original package.
