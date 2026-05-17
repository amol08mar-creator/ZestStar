import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { SetIngredientsDto } from './dto/recipe-ingredient.dto';
import { RecipesService } from './recipes.service';

// Public — no auth
@Controller('recipes')
export class PublicRecipesController {
  constructor(private recipes: RecipesService) {}

  @Get()
  listPublic() {
    return this.recipes.listPublic();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.recipes.getOne(id);
  }
}

// Admin — auth + admin guard
@UseGuards(SupabaseAuthGuard, AdminGuard)
@Controller('admin/recipes')
export class AdminRecipesController {
  constructor(private recipes: RecipesService) {}

  @Get()
  listAdmin() {
    return this.recipes.listAdmin();
  }

  @Post()
  create(@Body() dto: CreateRecipeDto) {
    return this.recipes.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: CreateRecipeDto) {
    return this.recipes.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.recipes.remove(id);
  }

  @Put(':id/ingredients')
  setIngredients(@Param('id') id: string, @Body() dto: SetIngredientsDto) {
    return this.recipes.setIngredients(id, dto.items);
  }
}
