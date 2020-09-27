import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Post("/expense-handler")
  async handleExpenseEvent(@Body("event") event): Promise<boolean> {
    const out = await this.appService.handleExpenseEvent(event);
    return out;
  }


  @Post("/event-log-handler")
  async handleEvent(@Body("event") event): Promise<boolean> {
    const out = await this.appService.handleEvent(event);
    return out;
  }

}
