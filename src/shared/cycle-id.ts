import { z } from 'zod';

/** Input contract shared by tools that look up data by WHOOP cycle ID. */
export const cycleIdSchema = z.number().int().positive();
