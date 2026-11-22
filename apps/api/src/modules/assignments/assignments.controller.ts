import { Controller, Post, Get, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.assignmentsService.findAll(query);
  }

  @Post()
  assign(@Body() dto: { packageId: string; riderId: string; reason?: string }, @Request() req: any) {
    return this.assignmentsService.assign(dto.packageId, dto.riderId, req.user.id, dto.reason);
  }

  @Get('rider/:riderId')
  getRiderAssignments(@Param('riderId') riderId: string) {
    return this.assignmentsService.getAssignmentsForRider(riderId);
  }

  @Get('package/:packageId/history')
  getHistory(@Param('packageId') packageId: string) {
    return this.assignmentsService.getHistory(packageId);
  }

  @Get('conflicts')
  getConflicts() {
    return this.assignmentsService.getConflicts();
  }

  @Get('optimize')
  optimizeRoute(@Query('packageId') packageId: string) {
    return this.assignmentsService.optimizeRoute(packageId);
  }
}
