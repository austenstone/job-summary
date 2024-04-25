// import { getInput, info } from "@actions/core";
// import { getOctokit } from "@actions/github";
import { access, constants } from "fs/promises";
// interface Input {
//   token: string;
// }

// const getInputs = (): Input => {
//   const result = {} as Input;
//   result.token = getInput("github-token");
//   if (!result.token || result.token === "") {
//     throw new Error("github-token is required");
//   }
//   return result;
// }

const run = async (): Promise<void> => {
  // const input = getInputs();
  console.log(`Job summary file path: ${await jobSummaryFilePath()}`)
};

run();

const SUMMARY_ENV_VAR = 'GITHUB_STEP_SUMMARY'
export const jobSummaryFilePath = async (): Promise<string> => {
  const pathFromEnv = process.env[SUMMARY_ENV_VAR]
  if (!pathFromEnv) {
    throw new Error(
      `Unable to find environment variable for $${SUMMARY_ENV_VAR}. Check if your runtime environment supports job summaries.`
    )
  }

  try {
    await access(pathFromEnv, constants.R_OK | constants.W_OK)
  } catch {
    throw new Error(
      `Unable to access summary file: '${pathFromEnv}'. Check if the file has correct read/write permissions.`
    )
  }

  return pathFromEnv
}