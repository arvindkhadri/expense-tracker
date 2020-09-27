import { Injectable } from '@nestjs/common';
import * as fetch from "node-fetch";
import {
  Rule,
  EventLog,
  GQLQuery,
  DBEvent
} from './domain.interfaces';
import { compare } from "./domain.functions";

@Injectable()
export class AppService {
  async handleExpenseEvent(event: DBEvent): Promise<boolean> {
    let event_payload;
    switch (event.op) {
      case "INSERT": {
        event_payload = { eventName: "EXPENSE_ADDED", args: event.data.new };
        break;
      }
      case "UPDATE": {
        event_payload = { eventName: "EXPENSE_UPDATED", args: event.data.new };
        break;
      }
      case "DELETE": {
        event_payload = { eventName: "EXPENSE_DELETED", args: event.data.old };
        break;
      }
      default: {
        console.log("Invalid op");
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

    const query = { query: queryString, variables: { ...event_payload }, operationName: "createEvent" }
    const json = await this.makeGQLCall(query);
    if (json.data.insert_event_log.affected_rows >= 1) {
      return true;
    }
    return false;
  }

  async makeGQLCall(query: GQLQuery): Promise<{ [key: string]: any }> {
    const response = await fetch('https://dev-expense.herokuapp.com/v1/graphql', {
      method: 'post',
      body: JSON.stringify(query),
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': 'fde125d43e1da909'
      }
    });
    const json = await response.json();
    return json;
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
      operationName: "getRules"
    }

    const json = await this.makeGQLCall(query)
    const rules: { rule: Rule }[] = json.data.rules;
    const out = compare(event.data.new.args, rules[0].rule.condition);
    console.log(out);
    return out;
  }
}
