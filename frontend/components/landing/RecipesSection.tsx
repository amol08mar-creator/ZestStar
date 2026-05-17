'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronRight, Clock, ShoppingCart, Users } from 'lucide-react';
import { useCartStore } from '@/lib/store/cartStore';
import { fetchRecipes } from '@/lib/api/recipes';
import type { Recipe, Product } from '@/lib/types';

const DIFFICULTY_COLORS = {
  easy:   'bg-green-50 text-green-700',
  medium: 'bg-yellow-50 text-yellow-700',
  hard:   'bg-red-50 text-red-700',
};

function ingredientToProduct(ing: Recipe['ingredients'][0]): Product {
  return {
    id: ing.productId,
    name: ing.name,
    description: '',
    price: ing.price,
    rating: 0,
    reviewCount: 0,
    image: ing.image ?? '',
    category: '',
    inStock: ing.inStock,
    weight: ing.weight ?? undefined,
  };
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const addMultipleItems = useCartStore((s) => s.addMultipleItems);
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const [added, setAdded] = useState(false);

  const availableIngredients = recipe.ingredients.filter((i) => i.inStock);

  function handleAddToCart(e: React.MouseEvent) {
    e.stopPropagation();
    if (availableIngredients.length === 0) return;
    addMultipleItems(availableIngredients.map(ingredientToProduct));
    setCartOpen(true);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const shownIngredients = recipe.ingredients.slice(0, 4);
  const remaining = recipe.ingredients.length - shownIngredients.length;

  return (
    <div
      onClick={() => router.push(`/recipes/${recipe.id}`)}
      className="bg-white rounded-2xl border border-border overflow-hidden flex flex-col cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-300 group shrink-0 w-64 md:w-auto"
    >
      {/* Image */}
      <div className="relative h-44 bg-cream overflow-hidden">
        {recipe.image ? (
          <Image
            src={recipe.image}
            alt={recipe.name}
            fill
            sizes="(max-width: 768px) 256px, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🍽️</div>
        )}
        {!recipe.inStock && (
          <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Items Missing
          </div>
        )}
        {recipe.difficulty && (
          <span className={`absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${DIFFICULTY_COLORS[recipe.difficulty]}`}>
            {recipe.difficulty}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-dark text-sm mb-1 line-clamp-1" style={{ fontFamily: 'var(--font-serif)' }}>
          {recipe.name}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-muted mb-3">
          {recipe.prepTime && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {recipe.prepTime} min
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> Serves {recipe.servings}
          </span>
        </div>

        {/* Ingredient thumbnails */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {shownIngredients.map((ing) => (
            <span
              key={ing.id}
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                ing.inStock ? 'bg-cream border-border text-dark' : 'bg-red-50 border-red-200 text-red-500 line-through'
              }`}
            >
              {ing.displayQuantity || `×${ing.quantity}`} {ing.name}
            </span>
          ))}
          {remaining > 0 && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cream border border-border text-muted">
              +{remaining} more
            </span>
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border gap-2">
          <div>
            <p className="text-base font-bold text-dark">₹{recipe.totalPrice}</p>
            <p className="text-[10px] text-muted">{recipe.ingredients.length} ingredients</p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={availableIngredients.length === 0}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors active:scale-95 shrink-0"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {added ? 'Added!' : 'Add All'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecipesSection() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecipes().then(setRecipes).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (!loading && recipes.length === 0) return null;

  return (
    <section className="py-10 md:py-14 bg-white">
      <div className="max-w-[1200px] mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
              Tonight&apos;s Dinner 🍳
            </h2>
            <p className="text-sm text-muted mt-1">Add all ingredients to cart in one tap</p>
          </div>
          <button
            onClick={() => router.push('/recipes')}
            className="hidden md:flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
          >
            All Recipes <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-72 bg-cream rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible scrollbar-hide">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}

        <button
          onClick={() => router.push('/recipes')}
          className="md:hidden mt-4 w-full flex items-center justify-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          View all recipes <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
