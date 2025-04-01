import { endGroup, getBooleanInput, getInput, info, warning, error, setOutput, startGroup } from "@actions/core";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { access, constants } from "fs/promises";
import path from "path";
import { DefaultArtifactClient } from "@actions/artifact";
import { debug } from "console";
import { mdToPdf } from 'md-to-pdf';
import { HtmlConfig, PdfConfig } from "md-to-pdf/dist/lib/config";
import { execSync } from "child_process";

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

    // print current working directory and files in it
    debug(`Current working directory: ${process.cwd()}`);
    try {
      const files = readdirSync(process.cwd());
      debug(`Files in current directory: ${files}`);
    } catch (err) {
      error(`Failed to read current directory: ${err instanceof Error ? err.message : String(err)}`);
    }
    // env
    debug(`Environment variables: ${JSON.stringify(process.env)}`);
    // print the current node version
    debug(`Node version: ${process.versions.node}`);

    // Install Chrome if needed for PDF/HTML generation
    if (input.createHtml || input.createPdf) {
      info('Configuring Chrome for PDF/HTML generation...');
      
      try {
        // Try to download and install Chrome in the GitHub Actions environment
        execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
        info('Chrome installation completed');
      } catch (err) {
        warning(`Chrome installation warning: ${err instanceof Error ? err.message : String(err)}`);
        info('Continuing with bundled Chromium...');
      }
    }
    // create the css file needed for the pdf generation
    const css = `
* {
	box-sizing: border-box;
}

html {
	font-size: 100%;
}

body {
	font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell',
		'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
	line-height: 1.6;
	font-size: 0.6875em; /* 11 pt */
	color: #111;
	margin: 0;
}

body > :first-child {
	padding-top: 0;
	margin-top: 0;
}

body > :last-child {
	margin-bottom: 0;
	padding-bottom: 0;
}

h1,
h2,
h3,
h4,
h5,
h6 {
	margin: 0;
	padding: 0.5em 0 0.25em;
}

h5,
h6 {
	padding: 0;
}

h5 {
	font-size: 1em;
}

h6 {
	font-size: 0.875em;
	text-transform: uppercase;
}

p {
	margin: 0.25em 0 1em;
}

blockquote {
	margin: 0.5em 0 1em;
	padding-left: 0.5em;
	padding-right: 1em;
	border-left: 4px solid gainsboro;
	font-style: italic;
}

ul,
ol {
	margin: 0;
	margin-left: 1em;
	padding: 0 1.5em 0.5em;
}

pre {
	white-space: pre-wrap;
}

h1 code,
h2 code,
h3 code,
h4 code,
h5 code,
h6 code,
p code,
li code,
pre code {
	background-color: #f8f8f8;
	padding: 0.1em 0.375em;
	border: 1px solid #f8f8f8;
	border-radius: 0.25em;
	font-family: monospace;
	font-size: 1.2em;
}

pre code {
	display: block;
	padding: 0.5em;
}

.page-break {
	page-break-after: always;
}

img {
	max-width: 100%;
	margin: 1em 0;
}

table {
	border-spacing: 0;
	border-collapse: collapse;
	display: block;
	margin: 0 0 1em;
	width: 100%;
	overflow: auto;
}

table th,
table td {
	padding: 0.5em 1em;
	border: 1px solid gainsboro;
}

table th {
	font-weight: 600;
}

table tr {
	background-color: white;
	border-top: 1px solid gainsboro;
}

table tr:nth-child(2n) {
	background-color: whitesmoke;
}`
    writeFileSync('./markdown.css', css);

    // Configure common settings with explicit executable path options
    const commonConfig = {
      launch_options: { 
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, // Use environment variable if available
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
