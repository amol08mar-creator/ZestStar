'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Clock, ShoppingCart, Users } from 'lucide-react';
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

export default function RecipesPage() {
  const router = useRouter();
  const addMultipleItems = useCartStore((s) => s.addMultipleItems);
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecipes().then(setRecipes).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function handleAddAll(e: React.MouseEvent, recipe: Recipe) {
    e.stopPropagation();
    const available = recipe.ingredients.filter((i) => i.inStock);
    if (available.length === 0) return;
    addMultipleItems(available.map(ingredientToProduct));
    setCartOpen(true);
    setAddedId(recipe.id);
    setTimeout(() => setAddedId(null), 2000);
  }

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-dark" />
          </button>
          <h1 className="font-bold text-dark text-lg" style={{ fontFamily: 'var(--font-serif)' }}>
            Tonight&apos;s Dinner 🍳
          </h1>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-4 py-6">
        <p className="text-sm text-muted mb-6">Add all ingredients to cart with one tap</p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <div key={i} className="h-72 bg-white rounded-2xl border border-border animate-pulse" />)}
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="text-4xl mb-4">🍽️</p>
            <p className="font-semibold text-dark">No recipes available yet</p>
            <p className="text-sm mt-1">Check back soon — we&apos;re curating dinner ideas for your family!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recipes.map((recipe) => {
              const available = recipe.ingredients.filter((i) => i.inStock);
              const isAdded = addedId === recipe.id;

              return (
                <div
                  key={recipe.id}
                  onClick={() => router.push(`/recipes/${recipe.id}`)}
                  className="bg-white rounded-2xl border border-border overflow-hidden flex flex-col cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-300 group"
                >
                  {/* Image */}
                  <div className="relative h-48 bg-cream overflow-hidden">
                    {recipe.image ? (
                      <Image src={recipe.image} alt={recipe.name} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">🍽️</div>
                    )}
                    <div className="absolute top-2 left-2 flex gap-1.5">
                      {recipe.difficulty && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${DIFFICULTY_COLORS[recipe.difficulty]}`}>
                          {recipe.difficulty}
                        </span>
                      )}
                      {recipe.cuisineType && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-dark">
                          {recipe.cuisineType}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-dark text-base mb-1 line-clamp-1" style={{ fontFamily: 'var(--font-serif)' }}>
                      {recipe.name}
                    </h3>
                    {recipe.description && (
                      <p className="text-xs text-muted mb-2 line-clamp-2 leading-relaxed">{recipe.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted mb-3">
                      {recipe.prepTime && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {recipe.prepTime} min</span>
                      )}
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Serves {recipe.servings}</span>
                      <span>{recipe.ingredients.length} ingredients</span>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                      <p className="text-lg font-bold text-dark">₹{recipe.totalPrice}</p>
                      <button
                        onClick={(e) => handleAddAll(e, recipe)}
                        disabled={available.length === 0}
                        className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors active:scale-95"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        {isAdded ? 'Added!' : 'Add All to Cart'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
