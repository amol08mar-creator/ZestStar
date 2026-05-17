import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { RecipeIngredientDto } from './dto/recipe-ingredient.dto';

interface IngredientProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  weight: string | null;
  stock: number;
}

interface RawIngredient {
  id: string;
  quantity: number;
  display_quantity: string | null;
  product: IngredientProduct;
}

@Injectable()
export class RecipesService {
  constructor(private supabase: SupabaseService) {}

  async listPublic() {
    const { data, error } = await this.supabase.admin
      .from('recipes')
      .select(`
        id, name, description, image_url, servings, prep_time_minutes,
        difficulty, cuisine_type, is_active, created_at,
        recipe_ingredients(id, quantity, display_quantity, product:product_id(id, name, price, image_url, weight, stock))
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    const recipes = (data ?? []).map((r) => this.toRecipeShape(r));
    return { data: { recipes }, message: 'Success' };
  }

  async listAdmin() {
    const { data, error } = await this.supabase.admin
      .from('recipes')
      .select(`
        id, name, description, image_url, servings, prep_time_minutes,
        difficulty, cuisine_type, is_active, created_at,
        recipe_ingredients(id, quantity, display_quantity, product:product_id(id, name, price, image_url, weight, stock))
      `)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    const recipes = (data ?? []).map((r) => this.toRecipeShape(r));
    return { data: { recipes }, message: 'Success' };
  }

  async getOne(id: string) {
    const { data, error } = await this.supabase.admin
      .from('recipes')
      .select(`
        id, name, description, image_url, servings, prep_time_minutes,
        difficulty, cuisine_type, is_active, created_at,
        recipe_ingredients(id, quantity, display_quantity, product:product_id(id, name, price, image_url, weight, stock))
      `)
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Recipe not found');
    return { data: { recipe: this.toRecipeShape(data) }, message: 'Success' };
  }

  async create(dto: CreateRecipeDto) {
    const { data, error } = await this.supabase.admin
      .from('recipes')
      .insert({
        name: dto.name,
        description: dto.description ?? null,
        image_url: dto.image_url ?? null,
        servings: dto.servings ?? 2,
        prep_time_minutes: dto.prep_time_minutes ?? null,
        difficulty: dto.difficulty ?? null,
        cuisine_type: dto.cuisine_type ?? null,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { data: { recipe: data }, message: 'Recipe created' };
  }

  async update(id: string, dto: CreateRecipeDto) {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.image_url !== undefined) updates.image_url = dto.image_url;
    if (dto.servings !== undefined) updates.servings = dto.servings;
    if (dto.prep_time_minutes !== undefined) updates.prep_time_minutes = dto.prep_time_minutes;
    if (dto.difficulty !== undefined) updates.difficulty = dto.difficulty;
    if (dto.cuisine_type !== undefined) updates.cuisine_type = dto.cuisine_type;
    if (dto.is_active !== undefined) updates.is_active = dto.is_active;

    const { data, error } = await this.supabase.admin
      .from('recipes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { data: { recipe: data }, message: 'Recipe updated' };
  }

  async remove(id: string) {
    const { error } = await this.supabase.admin.from('recipes').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { data: null, message: 'Recipe deleted' };
  }

  async setIngredients(recipeId: string, items: RecipeIngredientDto[]) {
    const { data: recipe } = await this.supabase.admin
      .from('recipes')
      .select('id')
      .eq('id', recipeId)
      .single();

    if (!recipe) throw new NotFoundException('Recipe not found');

    await this.supabase.admin.from('recipe_ingredients').delete().eq('recipe_id', recipeId);

    if (items.length > 0) {
      const rows = items.map((i) => ({
        recipe_id: recipeId,
        product_id: i.product_id,
        quantity: i.quantity,
        display_quantity: i.display_quantity ?? null,
      }));
      const { error } = await this.supabase.admin.from('recipe_ingredients').insert(rows);
      if (error) throw new BadRequestException(error.message);
    }

    return this.getOne(recipeId);
  }

  private toRecipeShape(raw: Record<string, unknown>) {
    const ingredients = ((raw.recipe_ingredients ?? []) as RawIngredient[]).map((ri) => ({
      id: ri.id,
      productId: ri.product?.id ?? '',
      name: ri.product?.name ?? '',
      price: ri.product?.price ?? 0,
      image: ri.product?.image_url ?? null,
      weight: ri.product?.weight ?? null,
      quantity: ri.quantity,
      displayQuantity: ri.display_quantity ?? null,
      inStock: (ri.product?.stock ?? 0) >= ri.quantity,
    }));

    const totalPrice = ingredients.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const inStock = ingredients.length > 0 && ingredients.every((i) => i.inStock);

    return {
      id: raw.id,
      name: raw.name,
      description: raw.description ?? null,
      image: raw.image_url ?? null,
      servings: raw.servings ?? 2,
      prepTime: raw.prep_time_minutes ?? null,
      difficulty: raw.difficulty ?? null,
      cuisineType: raw.cuisine_type ?? null,
      isActive: raw.is_active,
      ingredients,
      totalPrice,
      inStock,
    };
  }
}
