import { GraphQLResponse } from "./zeus";
export class GraphQLError extends Error {
  private errors: GraphQLResponse["errors"];
  constructor(response: GraphQLResponse) {
    super("");
    this.errors = response.errors || [];
  }
  toString() {
    return "GraphQL Response Error";
  }
  getErrors() {
    return this.errors;
  }
}
