import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';

/**
 * Shared task lookup for TasksService and its sub-services.
 * Centralizes the load-or-404 pattern so lifecycle services don't need to
 * depend on the façade (which would create a circular injection).
 */
@Injectable()
export class TaskFinderService {
  private readonly logger = new Logger(TaskFinderService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  /** Load a task with its full display relation set, or throw a 404. */
  async getOrFail(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['area', 'district', 'assignee', 'creator', 'verifier', 'tags', 'tags.user'],
    });
    if (!task) {
      this.logger.warn(`Task with ID ${id} not found`);
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  /** Load a task without relations (lifecycle math paths), or throw a 404. */
  async getBareOrFail(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }
}
