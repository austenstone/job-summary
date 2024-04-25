// import { getInput, info } from "@actions/core";
import { readFileSync, readdirSync } from "fs";
import { access, constants } from "fs/promises";
import path from "path";
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

const run = async (): Promise<void> => {
  // const input = getInputs();
  const filePath = await jobSummaryFilePath();
  console.log(`Job summary file path: ${filePath}`)
  // turn file path into parts
  const pathObj = path.parse(filePath);
  const dir = pathObj.base;
  console.log(`Job summary file directory: ${dir}`);
  const files = readdirSync(dir);
  for (const file of files) {
    console.log(`Found file: ${file}`);
    const fileObj = path.parse(file);
    if ( fileObj.base.startsWith('step_summary_') ) {
      console.log(`Found step summary: ${file}`);
      const stepSummary = readFileSync(file, 'utf8');
      console.log(`Step summary: ${stepSummary}`);
    }
  }

};

run();
