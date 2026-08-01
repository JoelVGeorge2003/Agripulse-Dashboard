import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

type RequestSchemas = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

export function validateRequest(schemas: RequestSchemas) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    try {
      const body = schemas.body ? schemas.body.parse(request.body) : request.body;
      const query = schemas.query ? schemas.query.parse(request.query) : request.query;
      const params = schemas.params ? schemas.params.parse(request.params) : request.params;

      request.validated = { body, query, params };
      if (schemas.body) request.body = body;
      next();
    } catch (error: unknown) {
      next(error);
    }
  };
}
