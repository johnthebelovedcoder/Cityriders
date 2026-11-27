import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DispatchService } from './dispatch.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@cityrider/types';

@ApiTags('Dispatch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.DISPATCHER, UserRole.CEO_EXECUTIVE)
@Controller('dispatch')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Get('manifests')
  @ApiOperation({ summary: 'List dispatch manifests' })
  findAll() { return this.dispatchService.findAll(); }

  @Get('manifests/:id')
  @ApiOperation({ summary: 'Get manifest details' })
  findOne(@Param('id') id: string) { return this.dispatchService.findOne(id); }

  @Post('manifests')
  @Roles(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'Create dispatch manifest and move packages to DISPATCHED' })
  create(@Body() body: { packageIds: string[]; riderId: string; expectedPackageCount?: number }, @Request() req: any) {
    return this.dispatchService.createManifest(body.packageIds, body.riderId, req.user.id, body.expectedPackageCount);
  }
}
