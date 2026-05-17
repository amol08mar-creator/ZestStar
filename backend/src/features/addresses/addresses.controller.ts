import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { User } from '@supabase/supabase-js';
import { Request } from 'express';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';

type AuthRequest = Request & { user: User };

@UseGuards(SupabaseAuthGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private addresses: AddressesService) {}

  @Get()
  list(@Req() req: AuthRequest) {
    return this.addresses.list(req.user.id);
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateAddressDto) {
    return this.addresses.create(req.user.id, dto);
  }

  @Put(':id')
  update(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: CreateAddressDto) {
    return this.addresses.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.addresses.remove(req.user.id, id);
  }
}
