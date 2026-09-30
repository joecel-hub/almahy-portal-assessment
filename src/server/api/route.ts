import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { can, type Permission } from "@/lib/auth/permissions";
import type { Session } from "@/lib/auth/token";
import { getSession } from "@/server/auth/session";
import type { ApiErrorBody } from "@/lib/api/types";

/** An error with an HTTP status, safe to show to the client. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string[] | undefined>,
  ) {
    super(message);
  }
}

export const notFound = (what = "Resource") => new ApiError(404, "not_found", `${what} not found`);
export const forbidden = () =>
  new ApiError(403, "forbidden", "You do not have permission to perform this action");

function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    const body: ApiErrorBody = {
      error: { code: error.code, message: error.message, fields: error.fields },
    };
    return NextResponse.json(body, { status: error.status });
  }
  if (error instanceof z.ZodError) {
    const body: ApiErrorBody = {
      error: {
        code: "validation_error",
        message: "Some fields are invalid",
        fields: z.flattenError(error).fieldErrors as Record<string, string[]>,
      },
    };
    return NextResponse.json(body, { status: 400 });
  }
  // Unknown errors: log the details on the server, return a generic message
  // so stack traces and SQL never leak to the client.
  console.error("[api] unhandled error", error);
  const body: ApiErrorBody = { error: { code: "internal", message: "Something went wrong" } };
  return NextResponse.json(body, { status: 500 });
}

/** Parse and validate a JSON body. Requiring JSON also blocks simple cross-site form posts. */
export async function readJson<T extends z.ZodType>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "Expected a JSON body");
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Request body is not valid JSON");
  }
  return schema.parse(raw);
}

type HandlerContext<P> = { req: NextRequest; session: Session; params: P };

/**
 * Wraps a Route Handler with the concerns every endpoint shares:
 * authentication, permission check, JSON serialisation and error mapping.
 * The handler itself only contains the endpoint's logic.
 */
export function route<P = Record<string, never>>(
  permission: Permission,
  handler: (ctx: HandlerContext<P>) => Promise<unknown>,
) {
  return async (req: NextRequest, ctx: { params: Promise<P> }) => {
    try {
      const session = await getSession();
      if (!session) throw new ApiError(401, "unauthorized", "Please sign in");
      if (!can(session.role, permission)) throw forbidden();
      const result = await handler({ req, session, params: await ctx.params });
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** Same error handling, for the few public endpoints (login). */
export function publicRoute(handler: (req: NextRequest) => Promise<unknown>) {
  return async (req: NextRequest) => {
    try {
      const result = await handler(req);
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (error) {
      return errorResponse(error);
    }
  };
}
