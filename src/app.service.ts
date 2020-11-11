import { Injectable } from '@nestjs/common';
import * as fetch from 'node-fetch';
import { Rule, GQLQuery, DBEvent } from './domain.interfaces';
import { compare } from './domain.functions';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  async handleExpenseEvent(event: DBEvent): Promise<boolean> {
    let event_payload;
    switch (event.op) {
      case 'INSERT': {
        event_payload = { eventName: 'EXPENSE_ADDED', args: event.data.new };
        break;
      }
      case 'UPDATE': {
        event_payload = { eventName: 'EXPENSE_UPDATED', args: event.data.new };
        break;
      }
      case 'DELETE': {
        event_payload = { eventName: 'EXPENSE_DELETED', args: event.data.old };
        break;
      }
      default: {
        console.log('Invalid op');
        break;
      }
    }
    const queryString = `
mutation createEvent($eventName: String!, $args: jsonb!) {
  insert_event_log (objects: [{
    event_name: $eventName,
    args: $args
  }]) {
    affected_rows
  }
}`;

    const query = {
      query: queryString,
      variables: { ...event_payload },
      operationName: 'createEvent',
    };
    const json = await AppService.makeGQLCall(
      query,
      this.config.get('HASURA_ADMIN_SECRET'),
    );
    if (json.data.insert_event_log.affected_rows >= 1) {
      return true;
    }
    return false;
  }

  static async makeGQLCall(
    query: GQLQuery,
    secret: string,
  ): Promise<{ [key: string]: any }> {
    const response = await fetch(
      'https://dev-expense.herokuapp.com/v1/graphql',
      {
        method: 'post',
        body: JSON.stringify(query),
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': secret,
        },
      },
    );
    const json = await response.json();
    return json;
  }

  static async ProcessRule(rule: { rule: Rule }, event, secret) {
    const queryString = `
mutation createTodo($todo: [todos_insert_input!]!){
  insert_todos(objects:$todo){
    affected_rows
  }
}`;
    let out = compare(event.data.new.args, rule.rule.condition);
    if (out) {
      if (rule.rule.action.name === 'CREATE_EVENT') {
        // create a todo
        console.log('creating todo');
        let response = await AppService.makeGQLCall(
          {
            query: queryString,
            variables: {
              todo: {
                title: rule.rule.action.args.name,
                due_date: rule.rule.action.args.due_date,
              },
            },
            operationName: 'createTodo',
          },
          secret,
        );
        console.log(response);
      }
      return rule;
    }
  }

  async handleEvent(event: DBEvent) {
    // for every event, get all rules
    const event_name = event.data.new.event_name;

    const queryString = `
query getRules($condition: jsonb) {
  rules(where:{rule:{_contains: $condition}}){
    rule
  }
}`;

    const query = {
      query: queryString,
      variables: { condition: { on_event: event_name } },
      operationName: 'getRules',
    };

    const json = await AppService.makeGQLCall(
      query,
      this.config.get('HASURA_ADMIN_SECRET'),
    );
    let rules: { rule: Rule }[] = json.data.rules;
    let out: boolean = false;
    try {
      rules = await Promise.all(
        rules.map(
          async rule =>
            await AppService.ProcessRule(
              rule,
              event,
              this.config.get('HASURA_ADMIN_SECRET'),
            ),
        ),
      );
      return true;
    } catch (err) {
      console.log(`error ${err}`);
      return out;
    }
  }
}
