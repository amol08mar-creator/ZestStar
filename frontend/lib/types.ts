export interface BundleItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  weight?: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: number;
  reviewCount: number;
  image: string;
  images?: string[];
  category: string;
  inStock: boolean;
  stock?: number;
  weight?: string;
  bundleItems?: BundleItem[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  image: string;
  itemCount: number;
  slug: string;
}

export interface Testimonial {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  review: string;
  location: string;
}

export interface PromoSlide {
  id: string;
  title: string;
  subtitle: string;
  code?: string;
  cta: string;
  gradient: string;
}

export interface DeliverySlot {
  id: string;
  date: string;
  time_start: string;
  time_end: string;
  capacity: number;
  booked: number;
  is_enabled: boolean;
}

export interface RecipeIngredient {
  id: string;
  productId: string;
  name: string;
  price: number;
  image: string | null;
  weight: string | null;
  quantity: number;
  displayQuantity: string | null;
  inStock: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  servings: number;
  prepTime: number | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  cuisineType: string | null;
  ingredients: RecipeIngredient[];
  totalPrice: number;
  inStock: boolean;
}

export interface MorningBasket {
  id: string;
  name: string;
  description: string;
  items: string[];
  price: number;
  originalPrice: number;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  image: string;
}
