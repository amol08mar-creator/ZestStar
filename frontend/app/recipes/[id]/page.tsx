'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Clock, ShoppingCart, Users } from 'lucide-react';
import { useCartStore } from '@/lib/store/cartStore';
import { fetchRecipe } from '@/lib/api/recipes';
import type { Recipe, Product } from '@/lib/types';

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

const DIFFICULTY_LABEL = { easy: '🟢 Easy', medium: '🟡 Medium', hard: '🔴 Hard' };

export default function RecipePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const addMultipleItems = useCartStore((s) => s.addMultipleItems);
  const setCartOpen = useCartStore((s) => s.setCartOpen);

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetchRecipe(id).then(setRecipe).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const availableIngredients = recipe?.ingredients.filter((i) => i.inStock) ?? [];

  function handleAddAll() {
    if (availableIngredients.length === 0) return;
    addMultipleItems(availableIngredients.map(ingredientToProduct));
    setCartOpen(true);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!recipe) return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 text-center">
      <div>
        <p className="text-red-600 font-semibold mb-4">Recipe not found</p>
        <button onClick={() => router.push('/')} className="text-primary font-semibold hover:underline">Go home</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream pb-28">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-dark" />
          </button>
          <h1 className="font-bold text-dark text-lg truncate" style={{ fontFamily: 'var(--font-serif)' }}>
            {recipe.name}
          </h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Hero image */}
        {recipe.image && (
          <div className="relative h-56 rounded-2xl overflow-hidden bg-cream">
            <Image src={recipe.image} alt={recipe.name} fill className="object-cover" sizes="512px" />
          </div>
        )}

        {/* Meta card */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <h2 className="text-xl font-bold text-dark mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
            {recipe.name}
          </h2>
          {recipe.description && <p className="text-sm text-muted mb-3 leading-relaxed">{recipe.description}</p>}

          <div className="flex flex-wrap gap-3 text-xs font-semibold">
            {recipe.prepTime && (
              <span className="flex items-center gap-1.5 bg-cream px-3 py-1.5 rounded-full">
                <Clock className="w-3.5 h-3.5 text-primary" /> {recipe.prepTime} min
              </span>
            )}
            <span className="flex items-center gap-1.5 bg-cream px-3 py-1.5 rounded-full">
              <Users className="w-3.5 h-3.5 text-primary" /> Serves {recipe.servings}
            </span>
            {recipe.difficulty && (
              <span className="bg-cream px-3 py-1.5 rounded-full">
                {DIFFICULTY_LABEL[recipe.difficulty]}
              </span>
            )}
            {recipe.cuisineType && (
              <span className="bg-cream px-3 py-1.5 rounded-full text-muted">{recipe.cuisineType}</span>
            )}
          </div>
        </div>

        {/* Ingredients */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-dark text-sm">
              Ingredients ({recipe.ingredients.length})
            </p>
            <p className="text-sm font-bold text-primary">₹{recipe.totalPrice} total</p>
          </div>

          <div className="space-y-3">
            {recipe.ingredients.map((ing) => (
              <div key={ing.id} className={`flex items-center gap-3 ${!ing.inStock ? 'opacity-50' : ''}`}>
                <div className="w-10 h-10 rounded-xl bg-cream border border-border overflow-hidden shrink-0">
                  {ing.image ? (
                    <Image src={ing.image} alt={ing.name} width={40} height={40} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">🥘</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark truncate">{ing.name}</p>
                  <p className="text-xs text-muted">
                    {ing.displayQuantity || `×${ing.quantity}`}
                    {ing.weight ? ` · ${ing.weight}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-dark">₹{ing.price * ing.quantity}</p>
                  {!ing.inStock && <p className="text-[10px] text-red-500">Out of stock</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Add All to Cart button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-4 py-4 z-40">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleAddAll}
            disabled={availableIngredients.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors text-base"
          >
            <ShoppingCart className="w-5 h-5" />
            {added
              ? `${availableIngredients.length} items added!`
              : `Add ${availableIngredients.length} ingredients — ₹${availableIngredients.reduce((s, i) => s + i.price * i.quantity, 0)}`
            }
          </button>
          {availableIngredients.length < recipe.ingredients.length && (
            <p className="text-center text-xs text-muted mt-2">
              {recipe.ingredients.length - availableIngredients.length} ingredient(s) out of stock — not included
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
