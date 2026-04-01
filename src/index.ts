import Carousel from './carousel/Carousel';
import Pagination from './pagination/Pagination';
import ParallaxImage from './parallaximage/ParallaxImage';
import { getInputRangeFromIndexes } from './utils/animations';

export {
  Carousel as default,
  Carousel,
  Pagination,
  ParallaxImage,
  getInputRangeFromIndexes,
};

// Export all types
export type {
  CarouselProps,
  CarouselRef,
  CarouselRenderItem,
  CarouselRenderItemInfo,
  CarouselInternalProps,
  CarouselLayout,
  ActiveSlideAlignment,
  ActiveAnimationType,
  ActiveAnimationOptions,
  ScrollInterpolatorResult,
  ScrollInterpolatorFunction,
  SlideInterpolatedStyleFunction,
  ParallaxProps,
  PaginationProps,
  PaginationDotProps,
  ParallaxImageProps,
  ParallaxImageDimensions,
} from './types';

// Re-export animation utilities for custom interpolations
export {
  defaultScrollInterpolator,
  defaultAnimatedStyles,
  shiftAnimatedStyles,
  stackScrollInterpolator,
  stackAnimatedStyles,
  tinderScrollInterpolator,
  tinderAnimatedStyles,
} from './utils/animations';
