import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@cityrider/types';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.DISPATCHER, UserRole.RIDER, UserRole.CEO_EXECUTIVE, UserRole.CUSTOMER_SERVICE, UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Get current authenticated user' })
  getMe(@Request() req: any) {
    return this.usersService.findOrThrow(req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all staff users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOrThrow(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new staff user' })
  create(@Body() dto: any, @Request() req: any) {
    return this.usersService.create(dto, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  update(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.usersService.update(id, dto, req.user.id);
  }
}
