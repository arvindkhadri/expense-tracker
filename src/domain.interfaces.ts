export interface DBEvent {
  op: "INSERT" | "UPDATE" | "DELETE";
  data: {
    new: { [key: string]: unknown } | null;
    old: { [key: string]: unknown } | null;
  }
}

export interface GQLQuery {
  query: string;
  variables: { [key: string]: unknown };
  operationName: string | null;
}

export interface Rule {
  on_event: string;
  condition: { [key: string]: Rule["condition"][] | { [item: string]: unknown } };
  action: { name: string; args: { [key: string]: unknown } }
}

export interface EventLog {
  event_name: string;
  args: { [key: string]: unknown }
}

export interface Operator {
  (event: EventLog["args"], rule: Rule["condition"] | Rule["condition"][]): boolean;
}

