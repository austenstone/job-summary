# Job Summary Action

A GitHub Action that retrieves job summaries and easily converts them to Markdown, PDF, and HTML formats.

## Overview

This action allows you to:
- Access the job summary content from your GitHub Actions workflow
- Convert job summaries to PDF and/or HTML formats
- Create artifacts for any generated files
- Use the job summary content in subsequent workflow steps

## Usage

### Basic: Just Get the Job Summary

```yaml
- uses: austenstone/job-summary@v2.0
  id: summary
- run: echo "${{ steps.summary.outputs.job-summary }}"
```

### Generate PDF and Create Artifact

```yaml
- uses: austenstone/job-summary@v2.0
  with:
    create-pdf: true
    create-pdf-artifact: true
    name: build-report
```

### Generate All Formats with Custom Artifact Names

```yaml
- uses: austenstone/job-summary@v2.0
  with:
    create-md: true
    create-md-artifact: true
    create-pdf: true
    create-pdf-artifact: true
    create-html: true
    create-html-artifact: true
    artifact-name: workflow-report
```

### Generate HTML and Use in Email Notification

```yaml
- uses: austenstone/job-summary@v2.0
  id: summary
  with:
    create-html: true

- name: Send email with report
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: Workflow Report
    body: ${{ steps.summary.outputs.job-summary-html }}
    html_body: ${{ steps.summary.outputs.job-summary-html }}
```

## ➡️ Inputs

| Name | Description | Default | Required |
| --- | --- | --- | --- |
| `name` | The name of the generated files | `job-summary` | No |
| `create-md` | Whether to create a markdown file | `true` | No |
| `create-md-artifact` | Create an artifact with the markdown file | `false` | No |
| `create-pdf` | Whether to create a PDF file | `false` | No |
| `create-pdf-artifact` | Create an artifact with the PDF file | `false` | No |
| `create-html` | Whether to create an HTML file | `false` | No |
| `create-html-artifact` | Create an artifact with the HTML file | `false` | No |
| `artifact-name` | Custom name prefix for artifacts | | No |

## ⬅️ Outputs

| Name | Description |
| --- | --- |
| `job-summary` | The raw job summary content |
| `job-summary-html` | The job summary as HTML |
| `pdf-file` | The path to the generated PDF file |
| `md-file` | The path to the generated Markdown file |
| `html-file` | The path to the generated HTML file |

## 💡 Tips

- Combine with notification actions to share your workflow results:
  - [Send Email Action](https://github.com/marketplace/actions/send-email)
  - [Slack Notification Action](https://github.com/marketplace/actions/slack-send)
  - [Microsoft Teams Notification](https://github.com/marketplace/actions/microsoft-teams-notification)
  - [Discord Message Notify](https://github.com/marketplace/actions/discord-message-notify)

- Use job summaries to document build status, test results, or deployment information
- PDF artifacts are useful for permanent records of workflow runs
- HTML output can be integrated with other reporting systems

## 📚 Further Information

For more help with GitHub Actions, see the [official documentation](https://docs.github.com/en/actions).
