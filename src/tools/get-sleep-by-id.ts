import { z } from 'zod';
import { type ToolMetadata, type InferSchema } from 'xmcp';
import { WhoopAPIClient } from '../api/whoop-client';
import { formatSleep } from './sleep-formatting';
import {
  errorTextResponse,
  jsonTextResponse,
  readOnlyAnnotations,
} from './tool-support';

// Define the schema for tool parameters
export const schema = {
  sleepId: z.string().uuid({
    message: 'Sleep ID must be a valid UUID format (e.g., ecfc6a15-4661-442f-a9a4-f160dd7afae8)'
  }).describe('The UUID of the sleep activity to retrieve'),
};

// Define tool metadata
export const metadata: ToolMetadata = {
  name: 'get-sleep-by-id',
  description: 'Get sleep data for a specific sleep ID from WHOOP',
  annotations: readOnlyAnnotations('Get WHOOP Sleep Data by ID'),
};

// Tool implementation
export default async function getSleep({ sleepId }: InferSchema<typeof schema>) {
  try {
    const client = WhoopAPIClient.getInstance();
    const sleep = await client.getSleepById(sleepId);
    return jsonTextResponse(formatSleep(sleep));
  } catch (error) {
    return errorTextResponse(error);
  }
}
