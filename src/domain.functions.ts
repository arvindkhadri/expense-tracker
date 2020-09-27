import { Operator, Rule } from "./domain.interfaces";

const andCompare: Operator = (obj, predicate: Rule["condition"][]) => {
  const response = predicate.map((p) => {
    return compare(obj, p);
  });
  if (response.filter((r) => r === false).length) {
    return false;
  }
  return true;
}

const eqCompare: Operator = function(event, rule) {
  const key = Object.keys(rule)[0];
  const value = rule[key]["_eq"];
  if (event[key] === value) {
    return true;
  }
  return false;
}

const gtCompare: Operator = (obj, rule) => {

  const key = Object.keys(rule)[0];
  const value = rule[key]["_gt"];
  if (obj[key] > value) {
    return true;
  }
  return false;

}

const opMap = {
  "_and": andCompare,
  "_eq": eqCompare,
  "_gt": gtCompare
}


export const compare = function(event, rule: Rule["condition"]) {
  for (let r of Object.keys(rule)) {
    if (opMap.hasOwnProperty(r)) {
      return opMap[r](event, rule[r])
    }
    return opMap[Object.keys(rule[r])[0]](event, rule);
  }
}
