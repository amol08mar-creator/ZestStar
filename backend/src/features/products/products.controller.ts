import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { QueryPublicProductsDto } from './dto/query-public-products.dto';
import { SetBundleItemsDto } from './dto/set-bundle-items.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class PublicProductsController {
  constructor(private products: ProductsService) {}

  @Get()
  list(@Query() query: QueryPublicProductsDto) {
    return this.products.listPublic(query);
  }

  @Get('suggestions')
  suggestions(@Query('q') q: string, @Query('limit') limit?: string) {
    if (!q || q.trim().length < 2) return { data: { suggestions: [] }, message: 'Success' };
    return this.products.getSuggestions(q.trim(), limit ? parseInt(limit) : 6);
  }

  @Get(':id/bundle-items')
  getBundleItems(@Param('id') id: string) {
    return this.products.getBundleItems(id);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.products.getOne(id);
  }
}

@UseGuards(SupabaseAuthGuard, AdminGuard)
@Controller('admin/products')
export class ProductsController {
  constructor(private products: ProductsService) {}

  @Get()
  listAll(@Query() query: QueryProductsDto) {
    return this.products.listAll(query);
  }

  @Get('categories')
  getCategories() {
    return this.products.getCategories();
  }

  @Get('low-stock')
  getLowStock() {
    return this.products.getLowStock();
  }

  @Get(':id/bundle-items')
  getBundleItems(@Param('id') id: string) {
    return this.products.getBundleItems(id);
  }

  @Put(':id/bundle-items')
  setBundleItems(@Param('id') id: string, @Body() dto: SetBundleItemsDto) {
    return this.products.setBundleItems(id, dto.items);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Patch(':id/stock')
  updateStock(@Param('id') id: string, @Body() dto: UpdateStockDto) {
    return this.products.updateStock(id, dto.quantity, dto.operation);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }
}
