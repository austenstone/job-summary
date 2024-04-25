import { info } from "@actions/core";
import { execSync } from "child_process";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { access, constants } from "fs/promises";
import path from "path";
import { DefaultArtifactClient } from "@actions/artifact";

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
  let jobSummary = '';
  const filePath = await jobSummaryFilePath();
  const pathObj = path.parse(filePath);
  const dir = pathObj.dir;
  info(`Job summary file directory: ${dir}`);
  const files = readdirSync(dir);
  for (const file of files) {
    const fileObj = path.parse(file);
    if (fileObj.base.startsWith('step_summary_') ) {
      info(`Found step summary: ${file}`);
      const stepSummary = readFileSync(`${dir}/${file}`, 'utf8');
      jobSummary += stepSummary;
    }
  }
  info(`Job summary: ${jobSummary}`);

  writeFileSync('README.md', jobSummary);
  writeFileSync('config.js', `// A marked renderer for mermaid diagrams
  const renderer = {
      code(code, infostring) {
          if (infostring === 'mermaid'){
              return \`<pre class="mermaid">\$\{code\}</pre>\`
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
  };`);

  execSync(`npm i -g md-to-pdf`);
  execSync(`md-to-pdf --config-file ./config.js ./README.md`)
  info('PDF generated successfully');

  const artifact = new DefaultArtifactClient()
  if (process.env.GITHUB_ACTIONS) {
    await artifact.uploadArtifact('pdf', ['README.pdf'], '.')
  }
};

run();
