import { endGroup, getBooleanInput, getInput, info, warning, error, setOutput, startGroup } from "@actions/core";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { access, constants } from "fs/promises";
import path from "path";
import { DefaultArtifactClient } from "@actions/artifact";
import { debug } from "console";
import { mdToPdf } from 'md-to-pdf';
import { HtmlConfig, PdfConfig } from "md-to-pdf/dist/lib/config";

interface Input {
  name: string;
  createPdf: boolean;
  createPdfArtifact: boolean;
  createMd: boolean;
  createMdArtifact: boolean;
  createHtml: boolean;
  createHtmlArtifact: boolean;
  artifactName: string;
}

const getInputs = (): Input => {
  const result = {} as Input;
  result.name = getInput("name");
  result.createMd = getBooleanInput("create-md");
  result.createMdArtifact = getBooleanInput("create-md-artifact");
  result.createPdf = getBooleanInput("create-pdf");
  result.createPdfArtifact = getBooleanInput("create-pdf-artifact");
  result.createHtml = getBooleanInput("create-html");
  result.createHtmlArtifact = getBooleanInput("create-html-artifact");
  result.artifactName = getInput("artifact-name") || '';

  if (result.createMdArtifact && !result.createMd) {
    warning("create-md-artifact is set to true but create-md is false. Setting create-md to true.");
    result.createMd = true;
  }

  if (result.createPdfArtifact && !result.createPdf) {
    warning("create-pdf-artifact is set to true but create-pdf is false. Setting create-pdf to true.");
    result.createPdf = true;
  }

  if (result.createHtmlArtifact && !result.createHtml) {
    warning("create-html-artifact is set to true but create-html is false. Setting create-html to true.");
    result.createHtml = true;
  }

  // Validate the filename doesn't contain invalid characters
  const invalidChars = /[\\/:"*?<>|]/g;
  if (invalidChars.test(result.name)) {
    const safeName = result.name.replace(invalidChars, '_');
    warning(`Invalid characters in filename '${result.name}'. Using '${safeName}' instead.`);
    result.name = safeName;
  }

  return result;
}

const SUMMARY_ENV_VAR = 'GITHUB_STEP_SUMMARY'
export const jobSummaryFilePath = async (): Promise<string> => {
  const pathFromEnv = process.env[SUMMARY_ENV_VAR]
  if (!pathFromEnv) {
    throw new Error(`Unable to find environment variable for $${SUMMARY_ENV_VAR}. Check if your runtime environment supports job summaries.`)
  }

  try {
    await access(pathFromEnv, constants.R_OK | constants.W_OK)
  } catch {
    throw new Error(`Unable to access summary file: '${pathFromEnv}'. Check if the file has correct read/write permissions.`)
  }

  return pathFromEnv
}

const run = async (): Promise<void> => {
  try {
    let jobSummary = '';
    let filePath: string;
    try {
      filePath = await jobSummaryFilePath();
    } catch (error) {
      throw new Error(`Failed to get job summary file path: ${error instanceof Error ? error.message : String(error)}`);
    }

    const input = getInputs();
    const filePathObj = path.parse(filePath);
    const dir = filePathObj.dir;
    const mdFile = `${input.name}.md`;
    const pdfFile = `${input.name}.pdf`;
    const htmlFile = `${input.name}.html`;

    debug(`Job summary file directory: ${dir}`);
    try {
      const JobSummaryFiles = readdirSync(dir);
      debug(`Job files: ${JobSummaryFiles}`);

      let foundSummaryFiles = false;

      for (const file of JobSummaryFiles) {
        const fileObj = path.parse(file);
        if (fileObj.base.startsWith('step_summary_') && fileObj.base.endsWith('-scrubbed')) {
          debug(`Found step summary: ${file}`);
          foundSummaryFiles = true;
          const stepSummary = readFileSync(`${dir}/${file}`, 'utf8');
          jobSummary += stepSummary;
        }
      }

      if (!foundSummaryFiles) {
        warning('No summary files found. Output may be empty.');
      }
    } catch (err) {
      error(`Failed to read summary files: ${err instanceof Error ? err.message : String(err)}`);
      throw new Error(`Failed to read summary files: ${err instanceof Error ? err.message : String(err)}`);
    }

    startGroup('Job Summary');
    info(jobSummary || 'No job summary content found.');
    endGroup();
    setOutput('job-summary', jobSummary);

    const renderer = {
      code(code, infostring) {
        if (infostring === 'mermaid') {
          return `<pre class="mermaid">${code}</pre>`;
        }
        return false;
      },
    };

    // print files in this directory /home/runner/work/_actions/austenstone/job-summary/
    const files = readdirSync(process.cwd());
    debug(`Files in current directory: ${files}`);
    // print files in this directory /home/runner/work/_actions/austenstone/job-summary/src
    const srcFiles = readdirSync(path.join(__dirname));
    debug(`Files in src directory(${path.join(__dirname)}): ${srcFiles}`);

    const specificFiles = readdirSync(`/home/runner/work/_actions/austenstone/job-summary/src`);
    debug(`Files in specific directory: ${specificFiles}`);
    // print files in this directory /home/runner/work/_actions/austenstone/job-summary/node_modules

    const css = ``;
    writeFileSync(path.join(__dirname, '..', 'markdown.css'), css);

    // Configure common settings with explicit executable path options
    const commonConfig = {
      launch_options: { 
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: true,
        executablePath: process.env.CHROME_BIN, // Use environment variable if available
      },
      marked_extensions: [{ renderer }],
      script: [
        { url: 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js' },
        { content: 'mermaid.initialize({ startOnLoad: false}); (async () => { await mermaid.run(); })();' }
      ]
    };

    const htmlConfig: Partial<HtmlConfig> = {
      ...commonConfig,
      dest: `./${htmlFile}`,
      as_html: true,
    };
    
    const pdfConfig: Partial<PdfConfig> = {
      ...commonConfig,
      dest: `./${pdfFile}`,
    };

    if (input.createMd) {
      try {
        writeFileSync(`./${mdFile}`, jobSummary);
        info(`Markdown file created: ${mdFile}`);

        if (input.createMdArtifact) {
          const artifact = new DefaultArtifactClient();
          const artifactName = input.artifactName ? input.artifactName + '-md' : 'md';
          await artifact.uploadArtifact(artifactName, [mdFile], '.');
          info(`Markdown artifact created: ${artifactName}`);
        }
      } catch (err) {
        error(`Failed to create Markdown file: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (input.createHtml) {
      try {
        info('Starting HTML generation...');
        const result = await mdToPdf({ content: jobSummary }, htmlConfig);

        if (result.filename) {
          info(`HTML generated successfully: ${result.filename}`);
          setOutput('job-summary-html', readFileSync(htmlFile, 'utf8'));

          if (input.createHtmlArtifact) {
            const artifact = new DefaultArtifactClient();
            const artifactName = input.artifactName ? input.artifactName + '-html' : 'html';
            await artifact.uploadArtifact(artifactName, [htmlFile], '.');
            info(`HTML artifact created: ${artifactName}`);
          }
        }
      } catch (err) {
        error(`Failed to generate HTML: ${err instanceof Error ? err.message : String(err)}`);
        debug(`HTML generation error details: ${JSON.stringify(err)}`);
      }
    }

    if (input.createPdf) {
      try {
        info('Starting PDF generation...');
        const result = await mdToPdf({ content: jobSummary }, pdfConfig);

        if (result.filename) {
          info(`PDF generated successfully: ${result.filename}`);

          if (input.createPdfArtifact) {
            const artifact = new DefaultArtifactClient();
            const artifactName = input.artifactName ? input.artifactName + '-pdf' : 'pdf';
            await artifact.uploadArtifact(artifactName, [pdfFile], '.');
            info(`PDF artifact created: ${artifactName}`);
          }
        }
      } catch (err) {
        error(`Failed to generate PDF: ${err instanceof Error ? err.message : String(err)}`);
        debug(`PDF generation error details: ${JSON.stringify(err)}`);
      }
    }

    setOutput('pdf-file', path.resolve(pdfFile));
    setOutput('md-file', path.resolve(mdFile));
    setOutput('html-file', path.resolve(htmlFile));
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    error(`Error in job summary processing: ${errorMsg}`);
    throw error;
  }
};

run().catch(err => {
  const errorMsg = err instanceof Error ? err.message : String(err);
  error(`Fatal error: ${errorMsg}`);
  process.exit(1);
});
