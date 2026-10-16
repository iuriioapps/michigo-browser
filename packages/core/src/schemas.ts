import { z } from "zod";

/**
 * Pure schemas: this module must never import from `node:*`.
 *
 * It is the `@michigo/core/schemas` entry point precisely so the Electron
 * renderer can import these types without dragging Node built-ins into the
 * browser bundle. Anything needing Node APIs belongs in the `.` entry instead.
 */

export const ModuleStatusSchema = z.enum(["scaffold", "ready"]);
export type ModuleStatus = z.infer<typeof ModuleStatusSchema>;

/** Self-description that every `@michigo/*` domain package exports. */
export const ModuleInfoSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  status: ModuleStatusSchema,
});
export type ModuleInfo = z.infer<typeof ModuleInfoSchema>;

/** What the CLI prints and the desktop UI renders. */
export const RuntimeInfoSchema = z.object({
  app: z.string().min(1),
  version: z.string().min(1),
  node: z.string().min(1),
  platform: z.string().min(1),
  /** Present only when running inside Electron. */
  electron: z.string().min(1).optional(),
  modules: z.array(ModuleInfoSchema),
});
export type RuntimeInfo = z.infer<typeof RuntimeInfoSchema>;

/**
 * A project: one set of texts the user wants to understand.
 *
 * `id` and `createdAt` are the main process's to assign, which is why creating
 * one takes a separate, narrower input type rather than a partial `Project`.
 */
/** Shared with the renderer's input, so the field cannot accept more than main does. */
export const PROJECT_NAME_MAX_LENGTH = 200;

export const ProjectSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(PROJECT_NAME_MAX_LENGTH),
  createdAt: z.iso.datetime(),
});
export type Project = z.infer<typeof ProjectSchema>;

/** The only shape the renderer is allowed to send on `project:create`. */
export const CreateProjectInputSchema = z.object({
  name: z.string().trim().min(1).max(PROJECT_NAME_MAX_LENGTH),
});
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;
