export interface Column { name: string; type: string; constraints?: string[] }
export interface ForeignKey { column: string; references: { table: string; column: string } }
export interface Table { name: string; columns: Column[]; foreignKeys?: ForeignKey[] }
export interface Route {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string; params?: string[]; bodyType?: string; responseType?: string;
}
export interface CoreType { name: string; signature: string }
export interface IntermediateModel {
  database: Table[]; routes: Route[]; types: CoreType[]; rules: string[];
  meta: { tokens?: number; updated?: string };
}
export type Section = "database" | "routes" | "types" | "rules";
export interface SourceEntry {
  path: string; hash: string; model: IntermediateModel; warnings: string[];
}
export const emptyModel = (): IntermediateModel => ({ database: [], routes: [], types: [], rules: [], meta: {} });

