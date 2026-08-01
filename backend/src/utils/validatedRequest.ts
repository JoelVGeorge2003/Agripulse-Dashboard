import type { Request } from "express";

export function getValidatedBody<T>(request: Request): T {
  return (request.validated?.body ?? request.body) as T;
}

export function getValidatedQuery<T>(request: Request): T {
  return (request.validated?.query ?? request.query) as T;
}

export function getValidatedParams<T>(request: Request): T {
  return (request.validated?.params ?? request.params) as T;
}
