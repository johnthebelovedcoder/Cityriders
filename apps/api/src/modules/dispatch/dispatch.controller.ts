import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DispatchService } from './dispatch.service';

@ApiTags('Dispatch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
  @ApiOperation({ summary: 'Create dispatch manifest and move packages to DISPATCHED' })
  create(@Body() body: { packageIds: string[]; riderId: string }, @Request() req: any) {
    return this.dispatchService.createManifest(body.packageIds, body.riderId, req.user.id);
  }
}
