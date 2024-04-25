# Action

Save job summaries as PDFs.

#### Usage
Call the action and it will save the job summary as a PDF called README.pdf

```yml
      - uses: austenstone/job-summary-to-pdf@main
```

## ➡️ Inputs
Various inputs are defined in [`action.yml`](action.yml):

| Name | Description | Default | Required |
| --- | - | - | - |
| pdf-name | The name of the PDF file. | README | false |
| md-name | The name of the markdown file. | README | false |
| create-artifact | If the PDF will be saved as an artifact. | true | false |
| create-pdf | Whether to create a PDF file. | true | false |
| create-md | Whether to create a markdown file. | true | false |

## ⬅️ Outputs
| Name | Description |
| --- | - |
| job-summary | The full job summary as markdown. |
| pdf-file | The path to the PDF file. |
| md-file | The path to the markdown file. |

## Further help
To get more help on the Actions see [documentation](https://docs.github.com/en/actions).
