/*
================================================================================
FILE: frontend/src/i18n/operationFailure.ts
SUMMARY
    Retained operation failures as source objects and optional client-owned facts.
BASIC IDEA
    Render at the current locale; keep raw details separately and never identify
    an owned error by matching a completed English sentence.
INPUTS / INPUT SOURCES
    API errors, native failures and typed descriptors created by client guards.
EXPECTED OUTPUT
    Localized explanation and untouched original text without replaying work.
================================================================================
*/
import type { Translator } from "./types";
import { renderServerError } from "./serverMessage";
import { renderUiMessage, type UiMessage } from "./uiMessage";

export interface OperationFailure { cause: unknown; message?: UiMessage }

export function originalError(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  if (cause && typeof cause === "object" && "message" in cause && typeof cause.message === "string") return cause.message;
  return String(cause);
}

export function operationExplanation(failure: OperationFailure, t: Translator): string {
  return failure.message ? renderUiMessage(failure.message, t) : renderServerError(failure.cause, t);
}
