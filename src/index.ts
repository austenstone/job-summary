import { getBooleanInput, getInput, info, setOutput } from "@actions/core";
import { execSync } from "child_process";
import { readFileSync, readdirSync, unlinkSync, writeFileSync } from "fs";
import { access, constants } from "fs/promises";
import path from "path";
import { DefaultArtifactClient } from "@actions/artifact";
import { debug } from "console";

interface Input {
  name: string;
  createPdf: boolean;
  createPdfArtifact: boolean;
  createMd: boolean;
  createMdArtifact: boolean;
}

const getInputs = (): Input => {
  const result = {} as Input;
  result.name = getInput("name");
  result.createMd = getBooleanInput("create-md");
  result.createMdArtifact = getBooleanInput("create-md-artifact");
  result.createPdf = getBooleanInput("create-pdf");
  result.createPdfArtifact = getBooleanInput("create-pdf-artifact");
  return result;
}

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

const mdToPdf = async (jobSummary: string, name: string) => {
  const configFileName = '_config.js';
  // https://gist.github.com/danishcake/d045c867594d6be175cb394995c90e2c#file-readme-md
  const config = `// A marked renderer for mermaid diagrams
const renderer = {
    code(code, infostring) {
        if (infostring === 'mermaid'){
            return \`<pre class="mermaid">$\{code}</pre>\`
        }
        return false
    },
};

module.exports = {
    marked_extensions: [{ renderer }],
    script: [
        { url: 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js' },  
        // Alternative to above: if you have no Internet access, you can also embed a local copy
        // { content: require('fs').readFileSync('./node_modules/mermaid/dist/mermaid.js', 'utf-8') }
        // For some reason, mermaid initialize doesn't render diagrams as it should. It's like it's missing
        // the document.ready callback. Instead we can explicitly render the diagrams
        { content: 'mermaid.initialize({ startOnLoad: false}); (async () => { await mermaid.run(); })();' }
    ]
};`;
  execSync(`npm i -g md-to-pdf`);
  writeFileSync(`${name}.md`, jobSummary);
  writeFileSync(configFileName, config);
  execSync(`md-to-pdf --config-file ./${configFileName} ./${name}.md`);
  info('PDF generated successfully');
  unlinkSync(configFileName);
}

const run = async (): Promise<void> => {
  let jobSummary = '';

  const filePath = await jobSummaryFilePath();
  const input = getInputs();
  const filePathObj = path.parse(filePath);
  const dir = filePathObj.dir;

  debug(`Job summary file directory: ${dir}`);
  const JobSummaryFiles = readdirSync(dir);
  for (const file of JobSummaryFiles) {
    const fileObj = path.parse(file);
    if (fileObj.base.startsWith('step_summary_') && fileObj.base.endsWith('-scrubbed')) {
      debug(`Found step summary: ${file}`);
      const stepSummary = readFileSync(`${dir}/${file}`, 'utf8');
      jobSummary += stepSummary;
    }
  }
  info(`Job summary: ${jobSummary}`);
  setOutput('job-summary', jobSummary);

  if (input.createMd) {
    writeFileSync(`${input.name}.md`, jobSummary);
  }

  if (input.createPdf) {
    mdToPdf(jobSummary, input.name);
  }

  if (input.createPdfArtifact) {
    const artifact = new DefaultArtifactClient()
    await artifact.uploadArtifact('pdf', [`${input.name}.pdf`], '.')
  }

  if (input.createMdArtifact) {
    const artifact = new DefaultArtifactClient()
    await artifact.uploadArtifact('md', [`${input.name}.md`], '.')
  }

  const runId = process.env.GITHUB_RUN_ID;
  const jobId = process.env.GITHUB_JOB;
  console.log(`https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${runId}/jobs/${jobId}/summary_raw`)

  if (!input.createMd) unlinkSync(`${input.name}.md`);

  setOutput('pdf-file', path.resolve(`${input.name}.pdf`));
  setOutput('md-file', path.resolve(`${input.name}.md`));
};

run();
