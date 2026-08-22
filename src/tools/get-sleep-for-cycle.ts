import { z } from 'zod';
import { type ToolMetadata, type InferSchema } from 'xmcp';
import { WhoopAPIClient } from '../api/whoop-client';
import { formatSleep } from '../shared/sleep-formatting';
import {
  errorTextResponse,
  jsonTextResponse,
  readOnlyAnnotations,
} from '../shared/tool-support';

// Define the schema for tool parameters
export const schema = {
  cycleId: z.number().int().positive().describe('The ID of the cycle to retrieve sleep data for'),
};

// Define tool metadata
export const metadata: ToolMetadata = {
  name: 'get-sleep-for-cycle',
  description: 'Get sleep data for a specific cycle from WHOOP',
  annotations: readOnlyAnnotations('Get WHOOP Sleep Data for Cycle'),
};

// Tool implementation
export default async function getSleepForCycle({ cycleId }: InferSchema<typeof schema>) {
  try {
    const client = WhoopAPIClient.getInstance();
    const sleep = await client.getSleepForCycle(cycleId);
    return jsonTextResponse(formatSleep(sleep, cycleId));
  } catch (error) {
    return errorTextResponse(error);
  }
}
